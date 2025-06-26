from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework import filters as drf_filters
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from rest_framework.exceptions import ValidationError # Ya está importado, solo verificar
from . import serializers # Importar el módulo de serializers

from rest_framework.decorators import action # Para acciones personalizadas
from rest_framework.parsers import MultiPartParser # Para subida de archivos
from django.db.models import Q, Sum, Min # Para agregar stock y obtener umbrales
from rest_framework.views import APIView # Para la nueva vista de resumen
import pandas as pd


from ..models import (
    InventarioSucursal,
    DetalleInventarioBodega,
    TraspasoInternoStock,
    DetalleTraspasoStock
)
from sucursal_app.models import Bodega # Para buscar bodegas
from producto_app.models import Producto # Para buscar productos

from .serializers import (
    InventarioSucursalSerializer,
    DetalleInventarioBodegaSerializer,
    TraspasoInternoStockSerializer,
    DetalleTraspasoStockSerializer
)
from .filters import InventarioSucursalFilter, DetalleInventarioBodegaFilter

class InventarioSucursalViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar los inventarios generales por sucursal.
    """
    queryset = InventarioSucursal.objects.select_related('sucursal').all()
    serializer_class = InventarioSucursalSerializer
    permission_classes = [permissions.IsAdminUser] # O ajusta según tus roles
    filter_backends = [DjangoFilterBackend, drf_filters.OrderingFilter]
    filterset_class = InventarioSucursalFilter
    ordering_fields = ['sucursal__nombre', 'fecha_creacion', 'ultima_actualizacion_general']

class DetalleInventarioBodegaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar el detalle de stock por producto en cada bodega.
    La creación maneja la suma de stock si el producto ya existe en la bodega.
    """
    queryset = DetalleInventarioBodega.objects.select_related(
        'inventario_sucursal__sucursal', 'producto', 'bodega__sucursal', 'bodega__tipo_bodega'
    ).all()
    serializer_class = DetalleInventarioBodegaSerializer
    permission_classes = [permissions.IsAdminUser] # O ajusta según tus roles
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter]
    filterset_class = DetalleInventarioBodegaFilter
    search_fields = ['producto__nombre', 'bodega__tipo_bodega__tipo', 'inventario_sucursal__sucursal__nombre']
    ordering_fields = ['producto__nombre', 'bodega__tipo_bodega__tipo', 'cantidad', 'ultima_actualizacion']

    def get_serializer(self, *args, **kwargs):
        """
        Si los datos de entrada son una lista, instanciar el serializer con many=True.
        """
        if isinstance(kwargs.get('data', {}), list):
            kwargs['many'] = True
        return super().get_serializer(*args, **kwargs)

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser], url_path='cargar-excel')
    @transaction.atomic
    def cargar_stock_excel(self, request, *args, **kwargs):
        """
        Permite la carga masiva de stock desde un archivo Excel.
        Columnas esperadas en el Excel (los nombres deben ser exactos o normalizados):
        - producto_sku (SKU único del producto)
        - bodega_id (ID numérico de la bodega)
        - cantidad (Número entero)
        - stock_minimo (Opcional, número entero)
        - stock_maximo (Opcional, número entero)
        """
        file_obj = request.FILES.get('archivo_excel')

        if not file_obj:
            return Response({"error": "No se proporcionó ningún archivo Excel ('archivo_excel')."}, status=status.HTTP_400_BAD_REQUEST)

        if not file_obj.name.endswith(('.xls', '.xlsx')):
            return Response({"error": "El archivo no es un formato Excel válido (.xls o .xlsx)."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            df = pd.read_excel(file_obj, engine='openpyxl' if file_obj.name.endswith('.xlsx') else None)
            df.columns = [str(col).strip().lower().replace(' ', '_') for col in df.columns] # Normalizar nombres de columnas
        except Exception as e:
            return Response({"error": f"Error al leer el archivo Excel: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        expected_columns = ['producto_sku', 'bodega_id', 'cantidad']
        missing_columns = [col for col in expected_columns if col not in df.columns]
        if missing_columns:
            return Response(
                {"error": f"Columnas faltantes en el Excel: {', '.join(missing_columns)}. Se esperan: {', '.join(expected_columns)}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        stock_data_list = []
        errors_list = []
        processed_rows_count = 0

        for index, row in df.iterrows():
            processed_rows_count += 1
            row_num_for_error = index + 2 # +1 para índice base 1, +1 para la fila de encabezado
            try:
                producto_sku = str(row['producto_sku']).strip()
                bodega_id_str = str(row['bodega_id']).strip()
                cantidad_str = str(row['cantidad']).strip()

                if not producto_sku or not bodega_id_str or not cantidad_str:
                    errors_list.append(f"Fila {row_num_for_error}: producto_sku, bodega_id o cantidad no pueden estar vacíos.")
                    continue

                try:
                    cantidad = int(float(cantidad_str))
                    if cantidad < 0: raise ValueError("Cantidad no puede ser negativa.")
                except ValueError:
                    errors_list.append(f"Fila {row_num_for_error}: Cantidad '{cantidad_str}' inválida.")
                    continue

                try: bodega_id = int(bodega_id_str)
                except ValueError:
                    errors_list.append(f"Fila {row_num_for_error}: ID de Bodega '{bodega_id_str}' inválido.")
                    continue

                producto_obj = Producto.objects.filter(sku=producto_sku).first()
                if not producto_obj:
                    errors_list.append(f"Fila {row_num_for_error}: Producto con SKU '{producto_sku}' no encontrado.")
                    continue

                bodega_obj = Bodega.objects.select_related('sucursal').filter(id=bodega_id).first()
                if not bodega_obj:
                    errors_list.append(f"Fila {row_num_for_error}: Bodega con ID '{bodega_id}' no encontrada.")
                    continue
                if not bodega_obj.sucursal:
                    errors_list.append(f"Fila {row_num_for_error}: Bodega '{bodega_obj.direccion}' (ID: {bodega_id}) no tiene sucursal asignada.")
                    continue

                inventario_sucursal_obj, _ = InventarioSucursal.objects.get_or_create(sucursal=bodega_obj.sucursal)

                item_data = {
                    'producto': producto_obj.id,
                    'bodega': bodega_obj.id,
                    'inventario_sucursal': inventario_sucursal_obj.id,
                    'cantidad': cantidad,
                }

                if 'stock_minimo' in df.columns and pd.notna(row.get('stock_minimo')):
                    try: item_data['stock_minimo'] = int(float(row['stock_minimo']))
                    except (ValueError, TypeError): errors_list.append(f"Fila {row_num_for_error}: Stock Mínimo '{row['stock_minimo']}' inválido.")
                if 'stock_maximo' in df.columns and pd.notna(row.get('stock_maximo')):
                    try: item_data['stock_maximo'] = int(float(row['stock_maximo']))
                    except (ValueError, TypeError): errors_list.append(f"Fila {row_num_for_error}: Stock Máximo '{row['stock_maximo']}' inválido.")

                if not any(err.startswith(f"Fila {row_num_for_error}:") for err in errors_list): # Si no hubo errores para esta fila
                    stock_data_list.append(item_data)

            except Exception as e:
                errors_list.append(f"Fila {row_num_for_error}: Error inesperado procesando fila - {str(e)}.")

        # print(f"DEBUG: stock_data_list (antes de agregar): {stock_data_list}") # NUEVO PRINT

        if not stock_data_list and errors_list: # Si solo hubo errores y no datos válidos
            return Response({"message": "No se encontraron datos válidos en el Excel para cargar.", "errores_excel": errors_list, "filas_procesadas": processed_rows_count}, status=status.HTTP_400_BAD_REQUEST)
        elif not stock_data_list: # Si el excel estaba vacío o no produjo datos ni errores (caso raro)
             return Response({"message": "El archivo Excel no contenía datos procesables.", "errores_excel": errors_list, "filas_procesadas": processed_rows_count}, status=status.HTTP_400_BAD_REQUEST)

        # Pre-procesamiento para agrupar cantidades por combinaciones únicas
        aggregated_stock_data = {}
        for item in stock_data_list:
            # Asegurarse de que los componentes de la clave no sean None si no deberían serlo
            if item.get('inventario_sucursal') is None or \
               item.get('producto') is None or \
               item.get('bodega') is None:
                error_msg = f"Error interno: Faltan datos clave para agregación en el item: producto_id={item.get('producto')}, bodega_id={item.get('bodega')}, inv_suc_id={item.get('inventario_sucursal')}. Item completo: {item}"
                print(f"DEBUG: {error_msg}")
                if not any(error_msg in e for e in errors_list): # Evitar duplicar este error específico
                    errors_list.append(error_msg)
                continue # Saltar este item si los datos clave son incompletos

            key = (item['inventario_sucursal'], item['producto'], item['bodega'])
            print(f"DEBUG: Agregando item con key: {key}, cantidad: {item.get('cantidad')}") # NUEVO PRINT
            if key not in aggregated_stock_data:
                aggregated_stock_data[key] = {
                    'producto': item['producto'],
                    'bodega': item['bodega'],
                    'inventario_sucursal': item['inventario_sucursal'],
                    'cantidad': 0,
                    # Mantener stock_minimo y stock_maximo del último encontrado o el primero
                    # Esta parte puede necesitar una lógica más definida si varían en el Excel
                    'stock_minimo': item.get('stock_minimo'),
                    'stock_maximo': item.get('stock_maximo')
                }
            aggregated_stock_data[key]['cantidad'] += item['cantidad']
            # Actualizar stock_minimo/maximo si se desea (ej. tomar el último no nulo)
            if item.get('stock_minimo') is not None:
                 aggregated_stock_data[key]['stock_minimo'] = item.get('stock_minimo')
            if item.get('stock_maximo') is not None:
                 aggregated_stock_data[key]['stock_maximo'] = item.get('stock_maximo')

        final_stock_data_list = list(aggregated_stock_data.values())

        if not final_stock_data_list: # Después de agregar, si todo se canceló por alguna razón
             return Response({"message": "No quedaron datos válidos después de la agregación.", "errores_excel": errors_list, "filas_procesadas": processed_rows_count}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=final_stock_data_list, many=True)
        try:
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response({"message": f"Carga masiva completada. {len(serializer.data)} registros de stock procesados/actualizados.", "errores_excel_previos": errors_list if errors_list else "Ninguno.", "filas_excel_procesadas": processed_rows_count}, status=status.HTTP_201_CREATED if not errors_list else status.HTTP_207_MULTI_STATUS)
        except ValidationError as e: # Usar la ValidationError importada directamente
            return Response({"message": "Errores de validación al guardar el stock.", "errores_serializer": e.detail, "errores_excel_previos": errors_list, "filas_excel_procesadas": processed_rows_count}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"message": "Error inesperado durante el guardado del stock.", "error_detalle": str(e), "errores_excel_previos": errors_list}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TraspasoInternoStockViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar los traspasos internos de stock entre sucursales.
    """
    queryset = TraspasoInternoStock.objects.select_related(
        'sucursal_origen', 'sucursal_destino', 'creado_por'
    ).prefetch_related('detalles_traspaso__producto').all()
    serializer_class = TraspasoInternoStockSerializer
    permission_classes = [permissions.IsAdminUser] # O ajusta según tus roles (ej. personal de bodega/logística)
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter]
    # filterset_class = TraspasoInternoStockFilter # Si creas filtros específicos
    search_fields = ['sucursal_origen__nombre', 'sucursal_destino__nombre', 'motivo', 'estado', 'detalles_traspaso__producto__nombre']
    ordering_fields = ['fecha_pedido', 'estado', 'sucursal_origen__nombre', 'sucursal_destino__nombre']

    def perform_create(self, serializer):
        # Asignar el usuario que crea el traspaso automáticamente
        serializer.save(creado_por=self.request.user)

    def perform_update(self, serializer):
        """
        Sobrescribe para manejar la lógica de actualización de stock
        cuando el estado del traspaso cambia a COMPLETADO.
        """
        traspaso_instance = serializer.instance
        estado_anterior = traspaso_instance.estado
        nuevo_estado = serializer.validated_data.get('estado', traspaso_instance.estado)

        print(f"DEBUG VIEWS: perform_update called. Traspaso ID: {traspaso_instance.id}, Estado Anterior: {estado_anterior}, Nuevo Estado Solicitado: {nuevo_estado}")

        # Guardar el traspaso primero
        updated_traspaso = serializer.save()
        # Refrescar el objeto desde la BD para asegurar que los detalles anidados actualizados se carguen
        updated_traspaso.refresh_from_db() 
        print(f"DEBUG VIEWS: Traspaso object AFTER refresh_from_db: ID {updated_traspaso.id}, Estado Actual: {updated_traspaso.estado}")

        # Inspeccionar el primer detalle inmediatamente después de refresh_from_db
        if updated_traspaso.detalles_traspaso.exists():
            first_detail_after_refresh = updated_traspaso.detalles_traspaso.first()
            print(f"DEBUG VIEWS: First detail (ID: {first_detail_after_refresh.id}) AFTER refresh_from_db - cantidad_enviada: {first_detail_after_refresh.cantidad_enviada}, cantidad_recibida: {first_detail_after_refresh.cantidad_recibida}")
        else:
            print("DEBUG VIEWS: No details found for traspaso AFTER refresh_from_db.")
        

        # El serializer.save() llama a TraspasoInternoStockSerializer.update(), 
        # donde también tienes un print: "DEBUG SERIALIZER: Saved DetalleTraspasoStock ID..."
        # Ese print debería aparecer si los detalles se actualizan.
        print(f"DEBUG VIEWS: Traspaso object after serializer.save(): ID {updated_traspaso.id}, Estado Actual (desde DB): {updated_traspaso.estado}")
        # Nota: updated_traspaso.estado aquí será el *nuevo* estado si 'estado' estaba en validated_data y se guardó.

        # Lógica para cuando el traspaso se marca como EN_TRANSITO (descontar de origen)
        if nuevo_estado == TraspasoInternoStock.EstadoTraspaso.EN_TRANSITO and \
           estado_anterior == TraspasoInternoStock.EstadoTraspaso.PENDIENTE: # O desde otros estados si aplica
            print(f"DEBUG VIEWS: Entering EN_TRANSITO logic for Traspaso ID {updated_traspaso.id}")
            try:
                with transaction.atomic():
                    for detalle_traspaso in updated_traspaso.detalles_traspaso.all():
                        cantidad_a_descontar = detalle_traspaso.cantidad_enviada
                        print(f"DEBUG VIEWS (EN_TRANSITO): Detail ID: {detalle_traspaso.id}, Prod: {detalle_traspaso.producto.nombre}, Cantidad Enviada (cantidad_a_descontar): {cantidad_a_descontar}")
                        if cantidad_a_descontar is None or cantidad_a_descontar <= 0:
                            raise ValidationError(
                                f"No se especificó la cantidad enviada para el producto '{detalle_traspaso.producto.nombre}' en el traspaso ID {updated_traspaso.id}."
                            )

                        inventario_origen, _ = InventarioSucursal.objects.get_or_create(sucursal=updated_traspaso.sucursal_origen)
                        stock_origen, _ = DetalleInventarioBodega.objects.get_or_create(
                            inventario_sucursal=inventario_origen,
                            producto=detalle_traspaso.producto,
                            bodega=detalle_traspaso.bodega_origen,
                            defaults={'cantidad': 0}
                        )
                        if stock_origen.cantidad < cantidad_a_descontar:
                            raise ValidationError(
                                f"Stock insuficiente para '{detalle_traspaso.producto.nombre}' en bodega origen '{detalle_traspaso.bodega_origen}'. Stock: {stock_origen.cantidad}, Necesario: {cantidad_a_descontar}."
                            )
                        stock_origen.cantidad -= cantidad_a_descontar
                        stock_origen.save()
            except Exception as e:
                # Considerar revertir el estado del traspaso si falla el descuento
                print(f"DEBUG VIEWS (EN_TRANSITO ERROR): Exception: {str(e)}")
                raise ValidationError(f"Error al descontar stock de origen para traspaso EN TRÁNSITO: {str(e)}")

        # Lógica para cuando el traspaso se marca como COMPLETADO (sumar a destino)
        # Esto ahora sucede después de que la sucursal destino lo marca como verificado.
        elif nuevo_estado == TraspasoInternoStock.EstadoTraspaso.COMPLETADO and \
             estado_anterior == TraspasoInternoStock.EstadoTraspaso.RECIBIDO_PENDIENTE_VERIFICACION:
            print(f"DEBUG VIEWS: Entering COMPLETADO logic for Traspaso ID {updated_traspaso.id}")
            try:
                with transaction.atomic():
                    for detalle_traspaso in updated_traspaso.detalles_traspaso.all():
                        cantidad_a_sumar = detalle_traspaso.cantidad_recibida
                        # Mover este print ANTES de la validación
                        print(f"DEBUG: Attempting to sum. Detail ID: {detalle_traspaso.id}, Product: {detalle_traspaso.producto.nombre}, Cantidad Recibida (cantidad_a_sumar): {cantidad_a_sumar}")
                        if cantidad_a_sumar is None or cantidad_a_sumar <= 0:
                            raise ValidationError(
                                f"No se especificó la cantidad recibida o es inválida para el producto '{detalle_traspaso.producto.nombre}' en el traspaso ID {updated_traspaso.id}."
                            )

                        # Añadir a la bodega de destino
                        # Debug prints

                        inventario_destino, _ = InventarioSucursal.objects.get_or_create(sucursal=updated_traspaso.sucursal_destino)
                        stock_destino, detalle_created_flag = DetalleInventarioBodega.objects.get_or_create(
                            inventario_sucursal=inventario_destino,
                            producto=detalle_traspaso.producto,
                            bodega=detalle_traspaso.bodega_destino,
                            defaults={'cantidad': 0}
                        )
                        print(f"DEBUG: Got/Created DetalleInventarioBodega: {stock_destino} (Created: {detalle_created_flag}) - Current quantity: {stock_destino.cantidad}")

                        stock_destino.cantidad += cantidad_a_sumar
                        stock_destino.save()
                        print(f"DEBUG: Stock updated. New quantity: {stock_destino.cantidad}")
            except Exception as e:
                # Considerar revertir el estado del traspaso si falla la suma
                print(f"DEBUG VIEWS (COMPLETADO ERROR): Exception: {str(e)}")
                raise ValidationError(f"Error al sumar stock a destino para traspaso COMPLETADO: {str(e)}")
        
        else:
            print(f"DEBUG VIEWS: No specific stock update logic for state transition from {estado_anterior} to {nuevo_estado} for Traspaso ID {updated_traspaso.id}. Current Traspaso state: {updated_traspaso.estado}")
        # No hay cambios de stock cuando pasa a RECIBIDO_PENDIENTE_VERIFICACION, solo se actualiza el estado.
        # La sucursal destino debe verificar las cantidades y actualizar 'cantidad_recibida' en los detalles
        # antes de marcar el traspaso como COMPLETADO.

class DetalleTraspasoStockViewSet(viewsets.ReadOnlyModelViewSet): # Generalmente de solo lectura o manejado por Traspaso
    """
    ViewSet para ver los detalles de los traspasos de stock.
    La creación y modificación se manejan usualmente a través del TraspasoInternoStockViewSet.
    """
    queryset = DetalleTraspasoStock.objects.select_related('traspaso', 'producto').all()
    serializer_class = DetalleTraspasoStockSerializer
    permission_classes = [permissions.IsAdminUser] # O ajusta
    # Podrías añadir filtros si se accede directamente

class ResumenStockBodegueroView(APIView):
    """
    Vista para obtener un resumen del stock disponible y umbrales mínimos.
    Ideal para el dashboard del bodeguero.
    """
    permission_classes = [permissions.IsAuthenticated] # Ajusta el permiso si es necesario (ej. EsBodeguero)

    def get(self, request, *args, **kwargs):
        # Esta consulta agrupa por producto y suma las cantidades de todas las bodegas.
        # También toma el umbral mínimo (podrías necesitar una lógica más específica para el umbral si varía por bodega)
        stock_summary = DetalleInventarioBodega.objects.values(
            'producto__id', 
            'producto__nombre'
        ).annotate(
            stock_disponible_total=Sum('cantidad'),
            umbral_minimo_relevante=Min('stock_minimo') # O la lógica que prefieras para el umbral
        ).order_by('producto__nombre')

        resultado = []
        for item in stock_summary:
            resultado.append({
                "id": item['producto__id'],
                "nombre": item['producto__nombre'],
                "stockDisponible": item['stock_disponible_total'] or 0,
                "umbralMinimo": item['umbral_minimo_relevante'] if item['umbral_minimo_relevante'] is not None else 0 
            })
        
        return Response(resultado)
    # Podrías añadir filtros si se accede directamente

class AjusteManualStockView(APIView):
    """
    Vista para realizar ajustes manuales de stock.
    Recibe un identificador de producto (SKU o nombre), un ID de bodega,
    una cantidad (+/-) y un motivo.
    """
    permission_classes = [permissions.IsAuthenticated] # TODO: Ajustar a un permiso más específico si es necesario (ej. EsBodeguero)

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        producto_identificador = request.data.get('producto_identificador')
        bodega_id = request.data.get('bodega_id')
        cantidad_ajuste = request.data.get('cantidad')
        motivo = request.data.get('motivo')

        if not all([producto_identificador, bodega_id, cantidad_ajuste, motivo]):
            return Response(
                {'detail': 'Faltan campos requeridos: producto_identificador, bodega_id, cantidad, motivo.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            cantidad_ajuste = int(cantidad_ajuste)
            if cantidad_ajuste == 0:
                raise ValueError("La cantidad no puede ser cero.")
        except (ValueError, TypeError):
            return Response({'detail': 'La cantidad debe ser un número entero distinto de cero.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            bodega_id = int(bodega_id)
        except (ValueError, TypeError):
            return Response({'detail': 'El ID de la bodega debe ser un número.'}, status=status.HTTP_400_BAD_REQUEST)

        # Buscar producto por SKU o nombre
        producto = Producto.objects.filter(
            Q(sku__iexact=producto_identificador) | Q(nombre__iexact=producto_identificador)
        ).first()

        if not producto:
            return Response({'detail': f"Producto con identificador '{producto_identificador}' no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        # Buscar bodega
        try:
            bodega = Bodega.objects.select_related('sucursal').get(id=bodega_id)
        except Bodega.DoesNotExist:
            return Response({'detail': f"Bodega con ID '{bodega_id}' no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        
        if not bodega.sucursal:
            return Response({'detail': f"La bodega con ID '{bodega_id}' no tiene una sucursal asociada."}, status=status.HTTP_400_BAD_REQUEST)

        inventario_sucursal, _ = InventarioSucursal.objects.get_or_create(sucursal=bodega.sucursal)

        stock_detalle, _ = DetalleInventarioBodega.objects.get_or_create(
            inventario_sucursal=inventario_sucursal,
            producto=producto,
            bodega=bodega,
            defaults={'cantidad': 0}
        )

        if (stock_detalle.cantidad + cantidad_ajuste) < 0:
            return Response(
                {'detail': f"Ajuste no válido. El stock de '{producto.nombre}' no puede ser negativo. Stock actual: {stock_detalle.cantidad}, Ajuste: {cantidad_ajuste}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        stock_detalle.cantidad += cantidad_ajuste
        stock_detalle.save()

        # Aquí se podría registrar el movimiento en un log de auditoría.

        return Response(
            {'detail': 'Ajuste de stock realizado con éxito.', 'nuevo_stock': stock_detalle.cantidad},
            status=status.HTTP_200_OK
        )