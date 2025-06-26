from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView # Importar APIView
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters as drf_filters

from ..models import Pago, MetodoPago, EstadoPago
from .serializers import PagoSerializer
from pedido_app.models import PedidoCliente, DetallePedidoCliente, EstadoPedidoCliente, MetodoEnvio # Importar MetodoEnvio
from producto_app.models import Producto
from ubicacion_app.models import Comuna # Importar Comuna
from usuario_app.api.permissions import EsAdministrador, EsVendedor, EsContable # Asumiendo que tienes EsContable
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.urls import reverse
# from .filters import PagoFilter # Si creas una clase de filtro dedicada
from pedido_app.services import modificar_stock_para_pedido # Importar el servicio de stock
from rest_framework.exceptions import ValidationError as DRFValidationError # Para capturar errores de validación del servicio
 
class ListarMetodosPagoAPIView(APIView):
    """
    Vista para listar los métodos de pago disponibles.
    """
    permission_classes = [permissions.AllowAny] # O IsAuthenticated si solo usuarios logueados pueden verlos

    def get(self, request, *args, **kwargs):
        metodos = [{"id": choice[0], "nombre": choice[1]} for choice in MetodoPago.choices]
        return Response(metodos, status=status.HTTP_200_OK)

class CrearTransaccionConPedidoAPIView(APIView):
    """
    Crea un PedidoCliente y luego inicia el proceso de pago según el método seleccionado.
    """
    permission_classes = [permissions.IsAuthenticated] # Requiere que el usuario esté logueado

    @transaction.atomic
    def post(self, request, *args, **kwargs):

        data = request.data

        id_metodo_pago = data.get('id_metodo_pago')
        items_carrito = data.get('items_carrito', [])
        info_envio = data.get('info_envio', {})
        # email_comprador = data.get('email_comprador') # Ya viene en info_envio.email
        metodo_envio_seleccionado = data.get('metodo_envio') # Ej: 'DESPACHO_DOMICILIO' o 'RETIRO_TIENDA'
        sucursal_despacho_id_frontend = data.get('sucursal_despacho_id') # NUEVO: Obtener el ID de sucursal del frontend
        # sucursal_id_seleccionada = data.get('sucursal_id') # Si implementas selección de sucursal
        # return_url_frontend = data.get('return_url')

        if not request.user.perfil_cliente:
            
            return Response({"error": "El usuario no tiene un perfil de cliente."}, status=status.HTTP_400_BAD_REQUEST)
        
        if not id_metodo_pago or not items_carrito:
            
            return Response({"error": "Faltan datos: método de pago o ítems del carrito."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Crear PedidoCliente
        comuna_obj = None # Inicializar comuna_obj fuera del bloque try
        sucursal_obj_despacho = None
        from sucursal_app.models import Sucursal # Importar aquí para evitar importación circular a nivel de módulo si es un problema

        if metodo_envio_seleccionado == MetodoEnvio.DESPACHO_DOMICILIO:
            comuna_id = info_envio.get('comunaId')
            if not comuna_id:
                return Response({"error": "Para despacho a domicilio, la comuna es requerida."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                comuna_obj = Comuna.objects.get(id=comuna_id)
            except Comuna.DoesNotExist:
                return Response({"error": "La comuna seleccionada no es válida."}, status=status.HTTP_400_BAD_REQUEST)
            
            # --- MODIFICADO: Lógica para determinar sucursal de despacho para envíos a domicilio ---
            if sucursal_despacho_id_frontend:
                try:
                    # Intentar usar la sucursal seleccionada por el usuario en el frontend
                    sucursal_obj_despacho = Sucursal.objects.get(id=sucursal_despacho_id_frontend, is_active=True)
                except Sucursal.DoesNotExist:
                    return Response({"error": "La sucursal de despacho seleccionada no es válida o está inactiva."}, status=status.HTTP_400_BAD_REQUEST)
            else:
                # Fallback: Si el frontend no envía un ID de sucursal, usar la primera activa (comportamiento anterior)
                sucursal_obj_despacho = Sucursal.objects.filter(is_active=True).order_by('id').first()
            if not sucursal_obj_despacho: # Si incluso el fallback falla
                return Response({"error": "No hay sucursales de despacho activas configuradas para envío a domicilio."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        elif metodo_envio_seleccionado == MetodoEnvio.RETIRO_TIENDA:
            sucursal_id_retiro = data.get('sucursal_retiro_id') # Esperar esto del frontend
            if not sucursal_id_retiro:
                return Response({"error": "Debe seleccionar una sucursal para retiro en tienda."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                # Usando 'is_active' como se definió en el modelo Sucursal
                sucursal_obj_despacho = Sucursal.objects.get(id=sucursal_id_retiro, is_active=True) # Asegúrate que el campo se llame is_active
            except Sucursal.DoesNotExist:
                return Response({"error": "Sucursal de retiro no válida o inactiva."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({"error": "Método de envío no especificado o no válido."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pedido_cliente = PedidoCliente.objects.create(
                cliente=request.user.perfil_cliente,
                direccion_entrega_texto=info_envio.get('direccion'), # Corregido para coincidir con el modelo
                comuna_entrega=comuna_obj,
                telefono_contacto_envio=info_envio.get('telefono'), # Guardar el teléfono del envío
                email_contacto_envio=info_envio.get('email'), # Guardar el email del envío
                # estado se setea a PENDIENTE_PAGO por defecto o aquí explícitamente
                estado=EstadoPedidoCliente.PENDIENTE, # Corregido: Usar el estado PENDIENTE
                metodo_envio=metodo_envio_seleccionado,
                sucursal_despacho=sucursal_obj_despacho,
                # total_pedido se calculará después
            )

            total_pedido_calculado = 0
            for item_data in items_carrito:
                producto = get_object_or_404(Producto, id=item_data.get('producto_id'))
                cantidad = int(item_data.get('cantidad', 0))
                # Usar el precio del producto desde la BD para seguridad
                precio_unitario_bd = producto.precio 
                
                if cantidad <= 0:
                    continue # O lanzar error

                DetallePedidoCliente.objects.create(
                    pedido_cliente=pedido_cliente,
                    producto=producto,
                    cantidad=cantidad,
                    precio_unitario_venta=precio_unitario_bd, # Usar el campo correcto del modelo
                    # Asumir que no hay descuento aplicado en este punto de creación directa
                    precio_unitario_con_descuento=precio_unitario_bd,
                    descuento_total_linea=0
                )
                total_pedido_calculado += cantidad * precio_unitario_bd
            
            if total_pedido_calculado <= 0:
                # Revertir transacción si el pedido no tiene monto
                raise ValueError("El total del pedido no puede ser cero o negativo.")

            pedido_cliente.total_pedido = total_pedido_calculado
            
            # --- NUEVO: Reducir el stock inmediatamente al crear el pedido ---
            try:
                usuario_para_traspaso = request.user
                stock_ok = modificar_stock_para_pedido(
                    pedido_cliente,
                    anular_reduccion=False,
                    usuario_solicitante_traspaso=usuario_para_traspaso
                )
                if not stock_ok:
                    # Si se necesita reabastecimiento, el servicio devuelve False
                    pedido_cliente.estado = EstadoPedidoCliente.PENDIENTE_REABASTECIMIENTO
            except DRFValidationError as e:
                # El servicio levanta este error si no hay stock y no se puede reabastecer.
                # La transacción se revierte gracias a @transaction.atomic
                return Response({"error": str(e.detail)}, status=status.HTTP_400_BAD_REQUEST)

            # Guardar el pedido con su estado final (PENDIENTE o PENDIENTE_REABASTECIMIENTO) y el total.
            pedido_cliente.save()

        except Producto.DoesNotExist:
            return Response({"error": "Uno de los productos no existe."}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError as ve: # Para el error de total_pedido
            return Response({"error": str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import traceback
            traceback.print_exc()
            error_msg = f"Error al crear el pedido: {str(e)}"
            print(f"ERROR CrearTransaccion: {error_msg}")
            return Response({"error": error_msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 2. Procesar pago según el método
        if id_metodo_pago == MetodoPago.WEBPAY:
            # Reutilizar la lógica de IniciarPagoWebpayView
            # Esta vista ya espera un pedido_id y el request para obtener el usuario y construir la return_url.        
            from .webpay_views import IniciarPagoWebpayView 
            webpay_view = IniciarPagoWebpayView()
            
            # Llamamos al método post de IniciarPagoWebpayView, pasándole el request actual
            # y el ID del pedido que acabamos de crear.
            response_iniciar_pago = webpay_view.post(request, pedido_id=pedido_cliente.id)

            if response_iniciar_pago.status_code == status.HTTP_200_OK:
                # Si IniciarPagoWebpayView tuvo éxito, su respuesta ya contiene "token" y "url_redirect"
                # Adaptamos esta respuesta al formato esperado por el frontend desde esta vista.
                return Response({
                    "tipo_respuesta": "TRANSBANK_REDIRECT",
                    "token": response_iniciar_pago.data.get("token"),
                    "url_redirect": response_iniciar_pago.data.get("url_redirect"),
                    "id_pedido": pedido_cliente.id # Incluimos el id_pedido para referencia
                }, status=status.HTTP_201_CREATED) # O HTTP_200_OK si prefieres
            else:
                # Si IniciarPagoWebpayView falló, procesamos la respuesta y marcamos el pedido como FALLIDO
                error_data = response_iniciar_pago.data
                error_message = error_data.get("error", "Error desconocido al iniciar pago Webpay")
                print(f"ERROR CrearTransaccion (Webpay): {error_message}")
                pedido_cliente.estado = EstadoPedidoCliente.FALLIDO # Actualizar estado del pedido
                pedido_cliente.save(update_fields=['estado'])
                return Response({"error": f"Error al iniciar pago con Webpay: {error_message}"}, status=response_iniciar_pago.status_code) # Propagar el código de estado recibido

        elif id_metodo_pago == MetodoPago.TRANSFERENCIA or id_metodo_pago == MetodoPago.EFECTIVO:
            Pago.objects.create(
                pedido_cliente=pedido_cliente,
                monto_pagado=pedido_cliente.total_pedido,
                metodo_pago=id_metodo_pago,
                estado_pago=EstadoPago.PENDIENTE
            )
            pedido_cliente.estado = EstadoPedidoCliente.PENDIENTE
            pedido_cliente.save(update_fields=['estado'])
            return Response({
                "tipo_respuesta": "PEDIDO_CREADO",
                "mensaje": f"Pedido #{pedido_cliente.id} creado. Pendiente de confirmación de pago por {MetodoPago(id_metodo_pago).label}.",
                "id_pedido": pedido_cliente.id
            }, status=status.HTTP_201_CREATED)
            # Aquí podrías forzar sys.stdout.flush() si los logs aún se retrasan.
            # sys.stdout.flush() # Descomentar si quieres probar forzar el flush
        else:
            return Response({"error": "Método de pago no soportado actualmente."}, status=status.HTTP_400_BAD_REQUEST)

class PagoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar Pagos.
    La creación de un pago y su cambio de estado pueden afectar el estado del PedidoCliente asociado.
    """
    queryset = Pago.objects.select_related('pedido_cliente__cliente').all()
    serializer_class = PagoSerializer
    # Definir permisos: Quién puede crear, ver, modificar pagos.
    # Por ejemplo, Admin y Contable pueden ver todos y modificar.
    # Vendedores podrían crear pagos para pedidos en tienda (efectivo).
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter]
    # filterset_class = PagoFilter # Para filtros avanzados
    # Definir campos para búsqueda y ordenamiento básico
    search_fields = ['pedido_cliente__id', 'id_transaccion_pasarela', 'pedido_cliente__cliente__usuario__email', 'metodo_pago']
    ordering_fields = ['fecha_pago', 'monto_pagado', 'estado_pago', 'metodo_pago']
    
    permission_classes = [permissions.IsAuthenticated, (EsAdministrador | EsContable | EsVendedor)] # Ajustar según roles

    def perform_create(self, serializer):
        # Aquí podrías añadir lógica si el usuario que crea el pago debe registrarse,
        # pero generalmente el pago está ligado al pedido_cliente.
        pago = serializer.save()
        self._actualizar_estado_pedido_por_pago(pago)

    def perform_update(self, serializer):
        pago = serializer.save()
        self._actualizar_estado_pedido_por_pago(pago)

    def _actualizar_estado_pedido_por_pago(self, pago_instance):
        """
        Actualiza el estado del PedidoCliente asociado basado en el estado y método del pago.
        """
        pedido = pago_instance.pedido_cliente
        if not pedido:
            return

        with transaction.atomic():
            if pago_instance.estado_pago == Pago.EstadoPago.COMPLETADO:
                # Si el pago se completa, el pedido pasa a PAGADO
                # (o PROCESANDO si el pago implica inicio inmediato del procesamiento)
                # Solo modificar stock si el pedido no estaba ya en un estado que implica stock reducido
                # y si no es Webpay (Webpay lo maneja en su propio flujo de retorno)
                if pago_instance.metodo_pago != MetodoPago.WEBPAY:
                    # Para Transferencia/Efectivo, el stock ya se intentó descontar al crear el pedido.
                    # Solo actualizamos el estado del pedido si estaba PENDIENTE o PENDIENTE_REABASTECIMIENTO.
                    if pedido.estado == EstadoPedidoCliente.PENDIENTE:
                        pedido.estado = EstadoPedidoCliente.PAGADO
                        print(f"DEBUG PagoViewSet: Pedido ID {pedido.id} (Transferencia/Efectivo) pasa a PAGADO.")
                    elif pedido.estado == EstadoPedidoCliente.PENDIENTE_REABASTECIMIENTO:
                        # Mantenemos PENDIENTE_REABASTECIMIENTO. El pago está OK, pero esperamos stock.
                        # O podría pasar a un estado como "PAGADO_ESPERANDO_STOCK"
                        print(f"DEBUG PagoViewSet: Pedido ID {pedido.id} (Transferencia/Efectivo) PAGO CONFIRMADO, sigue PENDIENTE_REABASTECIMIENTO.")
                    # No llamamos a modificar_stock_para_pedido aquí para descontar de nuevo.
                
                # Asegurar que el estado del pedido sea consistente si no es Webpay y el pago está completo.
                if pago_instance.metodo_pago != MetodoPago.WEBPAY and \
                   pedido.estado not in [
                       EstadoPedidoCliente.PAGADO, EstadoPedidoCliente.PENDIENTE_REABASTECIMIENTO, 
                       EstadoPedidoCliente.ENVIADO, EstadoPedidoCliente.ENTREGADO, 
                       EstadoPedidoCliente.CANCELADO, EstadoPedidoCliente.RECHAZADO_STOCK
                   ]:
                    pedido.estado = EstadoPedidoCliente.PAGADO # Forzar a PAGADO si no estaba en un estado esperado
                pedido.save(update_fields=['estado'])

            elif pago_instance.estado_pago == Pago.EstadoPago.FALLIDO:
                # Si el pago falla, el pedido podría volver a PENDIENTE o marcarse como FALLIDO
                if pedido.estado not in [EstadoPedidoCliente.ENVIADO, EstadoPedidoCliente.ENTREGADO, EstadoPedidoCliente.CANCELADO]:
                    # Si el método de pago era Webpay y falló, el pedido podría quedar PENDIENTE
                    # para que el cliente intente de nuevo o elija otro método.
                    if pago_instance.metodo_pago != MetodoPago.WEBPAY:
                        # Si un pago de Transferencia/Efectivo falla, y el pedido estaba PENDIENTE o PENDIENTE_REABASTECIMIENTO
                        # (lo que implica que el stock se descontó al crearlo), debemos restaurar el stock.
                        if pedido.estado in [EstadoPedidoCliente.PENDIENTE, EstadoPedidoCliente.PENDIENTE_REABASTECIMIENTO]:
                            print(f"DEBUG PagoViewSet: Pago FALLIDO para Pedido ID {pedido.id} (Transferencia/Efectivo). Restaurando stock.")
                            try:
                                usuario_para_traspaso = self.request.user if self.request.user.is_staff else (pedido.cliente.usuario if pedido.cliente and hasattr(pedido.cliente, 'usuario') else None)
                                modificar_stock_para_pedido(pedido, anular_reduccion=True, usuario_solicitante_traspaso=usuario_para_traspaso)
                            except Exception as e_stock_restore:
                                print(f"ERROR PagoViewSet: Falla al restaurar stock para Pedido ID {pedido.id} tras pago fallido: {str(e_stock_restore)}")
                                pedido.notas_internas = (pedido.notas_internas or "") + f"\nError al restaurar stock tras pago fallido: {str(e_stock_restore)}"
                    pedido.estado = EstadoPedidoCliente.FALLIDO
                pedido.save(update_fields=['estado', 'notas_internas'] if 'notas_internas' in pedido.__dict__ and pedido.notas_internas else ['estado'])

            elif pago_instance.estado_pago == Pago.EstadoPago.PENDIENTE:
                # Si el pago se registra como PENDIENTE (ej. efectivo en tienda, o transferencia esperando confirmación)
                # el pedido debería estar o pasar a PENDIENTE.
                if pago_instance.metodo_pago == Pago.MetodoPago.EFECTIVO or \
                   pago_instance.metodo_pago == Pago.MetodoPago.TRANSFERENCIA:
                    if pedido.estado not in [EstadoPedidoCliente.PAGADO, EstadoPedidoCliente.ENVIADO, EstadoPedidoCliente.ENTREGADO, EstadoPedidoCliente.CANCELADO]:
                        pedido.estado = EstadoPedidoCliente.PENDIENTE
                pedido.save(update_fields=['estado'])

            elif pago_instance.estado_pago == Pago.EstadoPago.REEMBOLSADO:
                if pedido.estado not in [EstadoPedidoCliente.CANCELADO]: # Evitar cambiar si ya está cancelado
                    # Solo devolver stock si el pedido estaba en un estado que implicaba stock reducido
                    # Incluimos PENDIENTE y PENDIENTE_REABASTECIMIENTO porque para Transferencia/Efectivo, el stock ya se descontó.
                    if pedido.estado in [
                        EstadoPedidoCliente.PAGADO, EstadoPedidoCliente.PROCESANDO, EstadoPedidoCliente.ENVIADO,
                        EstadoPedidoCliente.PENDIENTE, EstadoPedidoCliente.PENDIENTE_REABASTECIMIENTO
                    ]:
                        usuario_para_traspaso = self.request.user if self.request.user.is_staff else (pedido.cliente.usuario if pedido.cliente and hasattr(pedido.cliente, 'usuario') else None)
                        print(f"DEBUG PagoViewSet: Pago REEMBOLSADO para Pedido ID {pedido.id}. Restaurando stock desde estado {pedido.estado}.")
                        modificar_stock_para_pedido(pedido, anular_reduccion=True, usuario_solicitante_traspaso=usuario_para_traspaso)

                    pedido.estado = EstadoPedidoCliente.CANCELADO 
                    pedido.notas_internas = (pedido.notas_internas or "") + f"\nPago ID {pago_instance.id} reembolsado." # Mejor en notas internas
                    pedido.save(update_fields=['estado', 'notas_internas'])
                  