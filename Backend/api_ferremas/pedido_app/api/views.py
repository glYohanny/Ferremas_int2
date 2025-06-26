from rest_framework.response import Response
from rest_framework import viewsets, permissions, status, generics
from rest_framework import filters as drf_filters
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from rest_framework.exceptions import ValidationError
from functools import reduce
from operator import and_
from django.db.models import F, Q # Importar F y Q

from ..models import (
    PedidoProveedor, DetallePedidoProveedor, EstadoPedidoCliente,
    PedidoCliente, DetallePedidoCliente, EstadoPreparacionPedido
) # Asegúrate que MotivoTraspasoInventario se importe correctamente
from inventario_app.models import DetalleInventarioBodega, InventarioSucursal, TraspasoInternoStock, DetalleTraspasoStock
from .pagination import CustomPagination # Importar la paginación personalizada
from .serializers import ( # Asegúrate que MotivoTraspasoInventario se importe correctamente
    PedidoProveedorSerializer, DetallePedidoProveedorSerializer,
    PedidoClienteSerializer, DetallePedidoClienteSerializer, PedidoClienteListSerializer
)
from .permissions import IsClienteOwnerOrStaff
from usuario_app.api.permissions import EsAdministrador, EsBodeguero, EsVendedor, ROL_ADMINISTRADOR, ROL_VENDEDOR, ROL_BODEGUERO, ROL_CONTABLE # Importar las constantes de rol
from sucursal_app.models import Bodega
from pedido_app.services import modificar_stock_para_pedido # Importar el servicio
# Asumiremos que crearás filtros específicos si los necesitas
# from .filters import PedidoClienteFilter, PedidoProveedorFilter

class VendedorPedidosActivosAPIView(generics.ListAPIView):
    """
    Endpoint para que los Vendedores vean los pedidos activos que necesitan gestionar.
    Filtra por estados relevantes para el flujo de ventas.
    """
    serializer_class = PedidoClienteListSerializer
    permission_classes = [permissions.IsAuthenticated, EsVendedor]
    pagination_class = CustomPagination

    def get_queryset(self):
        """
        Devuelve pedidos en estados 'POR_CONFIRMAR', 'PREPARADO', o 'EN_ESPERA_DE_PAGO'.
        Devuelve pedidos en estados que un vendedor típicamente gestiona:
        PENDIENTE (esperando pago/confirmación), PROCESANDO (en preparación),
        PAGADO (pago recibido, listo para preparación), PENDIENTE_REABASTECIMIENTO (esperando stock).
        """
        estados_activos = [
            EstadoPedidoCliente.PENDIENTE, EstadoPedidoCliente.PROCESANDO,
            EstadoPedidoCliente.PAGADO, EstadoPedidoCliente.PENDIENTE_REABASTECIMIENTO
        ] 
        return PedidoCliente.objects.filter(estado__in=estados_activos).order_by('-fecha_pedido')

class PedidoClienteViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar los Pedidos de Clientes.
    Maneja la reducción y devolución de stock según el estado del pedido.
    """
    serializer_class = PedidoClienteSerializer
    pagination_class = CustomPagination # Añadir paginación
    permission_classes = [IsClienteOwnerOrStaff] # Usar el permiso personalizado

    filter_backends = [
        DjangoFilterBackend,
        drf_filters.OrderingFilter
    ]
    ordering_fields = ['fecha_pedido', 'estado', 'estado_preparacion', 'total_pedido', 'cliente__usuario__email']

    def get_serializer_class(self):
        # Para la lista (y por tanto, la búsqueda), usamos un serializer más simple.
        if self.action == 'list':
            return PedidoClienteListSerializer
        return PedidoClienteSerializer

    def get_queryset(self):
        user = self.request.user
        # Empezar con todos los pedidos, bien optimizados
        base_queryset = PedidoCliente.objects.select_related(
            'cliente__usuario', 'creado_por_personal', 'sucursal_despacho', 'bodeguero_asignado'
        ).prefetch_related('detalles_pedido_cliente__producto').all()

        print(f"\n--- NUEVA BÚSQUEDA ---")
        print(f"Usuario: {user}, Staff: {user.is_staff}")
        print(f"Total de pedidos en la DB: {base_queryset.count()}")

        if not user.is_authenticated:
            print("DEBUG: Usuario no autenticado. Retornando queryset vacío.")
            return base_queryset.none()

        # 1. Determinar el queryset inicial basado en el rol del usuario autenticado
        if hasattr(user, 'perfil_personal'):
            rol_personal = user.perfil_personal.rol
            if rol_personal == ROL_BODEGUERO: # Usar la constante del permiso
                sucursal_bodeguero = getattr(user.perfil_personal, 'sucursal', None)
                if sucursal_bodeguero:
                    queryset = base_queryset.filter(
                        sucursal_despacho=sucursal_bodeguero,
                        estado__in=[EstadoPedidoCliente.PAGADO, EstadoPedidoCliente.PROCESANDO]
                    ).filter(
                        Q(estado_preparacion=EstadoPreparacionPedido.PENDIENTE_ASIGNACION) |
                        Q(estado_preparacion__in=[EstadoPreparacionPedido.ASIGNADO, EstadoPreparacionPedido.EN_PREPARACION], bodeguero_asignado=user)
                    ).distinct()
                    print(f"DEBUG: Filtrando para BODEGUERO ({user.email}). Pedidos encontrados: {queryset.count()}")
                else:
                    print(f"DEBUG: Bodeguero ({user.email}) sin sucursal asignada. Retornando queryset vacío.")
                    queryset = base_queryset.none()
            elif rol_personal in [ROL_ADMINISTRADOR, ROL_VENDEDOR, ROL_CONTABLE]: # Usar ROL_CONTABLE
                # Administradores, Vendedores y Contadores pueden ver todos los pedidos
                queryset = base_queryset
                print(f"DEBUG: Usuario es STAFF ({rol_personal}). Acceso a todos los pedidos. Total inicial: {queryset.count()}")
            else:
                # Otros roles de Personal no definidos para ver pedidos
                print(f"DEBUG: Rol de personal '{rol_personal}' no reconocido para ver pedidos. Retornando queryset vacío.")
                queryset = base_queryset.none()
        elif hasattr(user, 'perfil_cliente'):
            # Los clientes solo pueden ver sus propios pedidos
            queryset = base_queryset.filter(cliente=user.perfil_cliente)
            print(f"DEBUG: Filtrando para CLIENTE ({user.email}). Pedidos encontrados: {queryset.count()}")
        else:
            # Usuario autenticado sin perfil específico (ni Personal ni Cliente)
            print(f"DEBUG: Usuario ({user.email}) sin perfil específico (Personal/Cliente). Retornando queryset vacío.")
            queryset = base_queryset.none()

        # 2. Aplicar el filtro de búsqueda sobre el queryset ya filtrado por rol
        search_query = self.request.query_params.get('search', None)
        if search_query:
            print(f"DEBUG: Término de búsqueda recibido: '{search_query}'")
            # Búsqueda especial por ID de pedido "PED-XXX"
            if search_query.upper().startswith('PED-'):
                try:
                    pedido_id = int(search_query[4:])
                    print(f"DEBUG: Buscando por ID de pedido específico: {pedido_id}")
                    queryset = queryset.filter(id=pedido_id)
                    print(f"DEBUG: Pedidos encontrados tras búsqueda por ID: {queryset.count()}")
                    return queryset.order_by('-fecha_pedido')
                except (ValueError, TypeError):
                    pass # Si falla, continúa con la búsqueda general

            # Búsqueda general por términos
            search_terms = search_query.split()
            print(f"DEBUG: Términos de búsqueda divididos: {search_terms}")

            # Encadenar filtros para cada término (lógica AND)
            for term in search_terms:
                # Para cada término, buscar en múltiples campos (lógica OR)
                term_q = (
                    Q(cliente__usuario__email__icontains=term) |
                    Q(cliente__usuario__first_name__icontains=term) |
                    Q(cliente__usuario__last_name__icontains=term) |
                    Q(estado__icontains=term)
                )
                if term.isdigit():
                    term_q |= Q(id=int(term))
                queryset = queryset.filter(term_q)
            queryset = queryset.distinct()
            print(f"DEBUG: Pedidos encontrados tras búsqueda general: {queryset.count()}")

        return queryset.order_by('-fecha_pedido')

    def perform_create(self, serializer):
        if not serializer.validated_data.get('sucursal_despacho'):
            # Aquí deberías tener una lógica para asignar una sucursal de despacho por defecto si no viene
            # o levantar un error si es obligatoria.
            # Ejemplo: Asignar la primera sucursal activa. NO RECOMENDADO PARA PRODUCCIÓN SIN REVISIÓN.
            # serializer.validated_data['sucursal_despacho'] = Sucursal.objects.filter(activo=True).first() # Corregido a 'activo' si ese es el campo
            # if not serializer.validated_data['sucursal_despacho']:
            raise ValidationError({"sucursal_despacho": "Debe especificar una sucursal de despacho."})

        # Asignar cliente o personal creador
        user = self.request.user
        if hasattr(user, 'perfil_cliente') and not serializer.validated_data.get('cliente'): # Asumiendo que el related_name es 'perfil_cliente'
            serializer.validated_data['cliente'] = user.perfil_cliente
        elif user.is_staff and not serializer.validated_data.get('creado_por_personal'):
             serializer.validated_data['creado_por_personal'] = user
        
        # Asegurarse de que un cliente no pueda asignarse como 'creado_por_personal'
        if not user.is_staff and 'creado_por_personal' in serializer.validated_data:
            del serializer.validated_data['creado_por_personal']

        pedido = serializer.save()
        # Si el estado inicial ya implica reducción de stock (ej. PAGADO directamente)
        if pedido.estado in [EstadoPedidoCliente.PAGADO, EstadoPedidoCliente.PROCESANDO]:
            try:
                usuario_para_traspaso = self.request.user if self.request.user.is_staff else (pedido.cliente.usuario if pedido.cliente and hasattr(pedido.cliente, 'usuario') else None)
                stock_ok = modificar_stock_para_pedido(pedido, anular_reduccion=False, usuario_solicitante_traspaso=usuario_para_traspaso)
                if not stock_ok: # Significa que se solicitó traspaso
                    pedido.estado = EstadoPedidoCliente.PENDIENTE_REABASTECIMIENTO
                    pedido.save(update_fields=['estado'])
            except ValidationError as e: # Ya estaba usando ValidationError aquí, lo cual es correcto.
                pedido.estado = EstadoPedidoCliente.RECHAZADO_STOCK 
                pedido.notas_cliente = (pedido.notas_cliente or "") + f"\nError de stock al crear: {str(e)}"
                pedido.save()
                raise e

    def perform_update(self, serializer):
        estado_anterior = serializer.instance.estado
        pedido_actualizado = serializer.save()
        nuevo_estado = pedido_actualizado.estado

        # Escenario 1: Pedido se paga o procesa (y antes no lo estaba o estaba pendiente de reabastecimiento) -> Reducir stock
        if nuevo_estado in [EstadoPedidoCliente.PAGADO, EstadoPedidoCliente.PROCESANDO] and \
           estado_anterior in [EstadoPedidoCliente.FALLIDO]: 
            # Solo intentamos reducir stock si el estado anterior era FALLIDO.
            # Si era PENDIENTE o PENDIENTE_REABASTECIMIENTO (para Transferencia/Efectivo),
            # el stock ya se manejó al crear el pedido o al confirmar el pago.
            # Webpay maneja su propio flujo de stock en su retorno.
            print(f"DEBUG PedidoClienteViewSet: Pedido ID {pedido_actualizado.id} pasa de FALLIDO a {nuevo_estado}. Intentando modificar stock.")
            try:
                usuario_para_traspaso = self.request.user if self.request.user.is_staff else (pedido_actualizado.cliente.usuario if pedido_actualizado.cliente and hasattr(pedido_actualizado.cliente, 'usuario') else None)
                stock_ok = modificar_stock_para_pedido(pedido_actualizado, anular_reduccion=False, usuario_solicitante_traspaso=usuario_para_traspaso)
                if not stock_ok: 
                    pedido_actualizado.estado = EstadoPedidoCliente.PENDIENTE_REABASTECIMIENTO
                    pedido_actualizado.save(update_fields=['estado'])
            except ValidationError as e:
                pedido_actualizado.estado = EstadoPedidoCliente.RECHAZADO_STOCK
                pedido_actualizado.notas_cliente = (pedido_actualizado.notas_cliente or "") + f"\nError de stock al actualizar desde API: {str(e)}"
                pedido_actualizado.save(update_fields=['estado', 'notas_cliente'])
                raise e # Re-lanzar para que el frontend sepa del error

        # Escenario 2: Pedido se cancela o falla (y antes estaba en un estado que redujo stock) -> Devolver stock
        elif nuevo_estado in [EstadoPedidoCliente.CANCELADO, EstadoPedidoCliente.FALLIDO, EstadoPedidoCliente.RECHAZADO_STOCK]:
            # Estados desde los cuales se pudo haber reducido stock:
            estados_con_stock_reducido = [
                EstadoPedidoCliente.PAGADO,
                EstadoPedidoCliente.PROCESANDO,
                EstadoPedidoCliente.ENVIADO,
                EstadoPedidoCliente.PENDIENTE, # Si era Transferencia/Efectivo
                EstadoPedidoCliente.PENDIENTE_REABASTECIMIENTO # Si era Transferencia/Efectivo y esperaba stock
            ]
            if estado_anterior in estados_con_stock_reducido:
                # Si el stock ya se había descontado, devolverlo
                print(f"DEBUG PedidoClienteViewSet: Pedido ID {pedido_actualizado.id} pasa de {estado_anterior} a {nuevo_estado}. Restaurando stock.")
                usuario_para_traspaso = self.request.user if self.request.user.is_staff else (pedido_actualizado.cliente.usuario if pedido_actualizado.cliente and hasattr(pedido_actualizado.cliente, 'usuario') else None)
                modificar_stock_para_pedido(pedido_actualizado, anular_reduccion=True, usuario_solicitante_traspaso=usuario_para_traspaso)
            
            if estado_anterior == EstadoPedidoCliente.PENDIENTE_REABASTECIMIENTO:
                # Si estaba esperando reabastecimiento, intentar cancelar el traspaso automático asociado si aún está PENDIENTE
                traspasos_pendientes = TraspasoInternoStock.objects.filter(
                    pedido_cliente_origen=pedido_actualizado,
                    estado=TraspasoInternoStock.EstadoTraspaso.PENDIENTE,
                    motivo=TraspasoInternoStock.MotivoTraspaso.PARA_COMPLETAR_PEDIDO
                )
                for traspaso in traspasos_pendientes:
                    traspaso.estado = TraspasoInternoStock.EstadoTraspaso.CANCELADO
                    traspaso.comentarios = (traspaso.comentarios or "") + f"\nCancelado automáticamente debido a cancelación del Pedido Cliente #{pedido_actualizado.id}."
                    traspaso.save(update_fields=['estado', 'comentarios'])
                    print(f"Traspaso {traspaso.id} cancelado debido a cancelación del Pedido Cliente {pedido_actualizado.id}")

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, EsBodeguero])
    def tomar_pedido_preparacion(self, request, pk=None):
        pedido = self.get_object()
        bodeguero = request.user

        # Verificar que el bodeguero pertenezca a la sucursal del pedido
        if not hasattr(bodeguero, 'perfil_personal') or bodeguero.perfil_personal.sucursal != pedido.sucursal_despacho:
            return Response({"error": "No tienes permiso para tomar pedidos de esta sucursal."}, status=status.HTTP_403_FORBIDDEN)

        if pedido.estado not in [EstadoPedidoCliente.PAGADO, EstadoPedidoCliente.PROCESANDO]:
            return Response({"error": "El pedido no está en un estado válido para ser preparado."}, status=status.HTTP_400_BAD_REQUEST)

        if pedido.bodeguero_asignado and pedido.bodeguero_asignado != bodeguero:
            return Response({"error": f"El pedido ya está asignado a {pedido.bodeguero_asignado.email}."}, status=status.HTTP_400_BAD_REQUEST)
        
        if pedido.bodeguero_asignado == bodeguero and pedido.estado_preparacion == EstadoPreparacionPedido.ASIGNADO:
             return Response({"mensaje": "Ya tienes este pedido asignado."}, status=status.HTTP_200_OK)

        # Validar límite de 3 pedidos activos (excluyendo el actual si ya está asignado a él)
        pedidos_activos_bodeguero = PedidoCliente.objects.filter(
            bodeguero_asignado=bodeguero,
            estado_preparacion__in=[EstadoPreparacionPedido.ASIGNADO, EstadoPreparacionPedido.EN_PREPARACION]
        ).exclude(pk=pedido.pk).count() # Excluir el pedido actual de la cuenta si ya está asignado a él

        if pedidos_activos_bodeguero >= 3:
            return Response({"error": "Ya tienes 3 pedidos activos. Completa uno antes de tomar otro."}, status=status.HTTP_400_BAD_REQUEST)

        pedido.bodeguero_asignado = bodeguero
        pedido.estado_preparacion = EstadoPreparacionPedido.ASIGNADO # O EN_PREPARACION directamente
        pedido.save(update_fields=['bodeguero_asignado', 'estado_preparacion'])
        serializer = self.get_serializer(pedido)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, EsBodeguero])
    def confirmar_preparacion_pedido(self, request, pk=None):
        pedido = self.get_object()
        bodeguero = request.user

        if pedido.bodeguero_asignado != bodeguero:
            return Response({"error": "Este pedido no está asignado a ti."}, status=status.HTTP_403_FORBIDDEN)

        if pedido.estado_preparacion not in [EstadoPreparacionPedido.ASIGNADO, EstadoPreparacionPedido.EN_PREPARACION]:
            return Response({"error": "El pedido no está en un estado válido para confirmar preparación."}, status=status.HTTP_400_BAD_REQUEST)

        pedido.estado_preparacion = EstadoPreparacionPedido.LISTO_PARA_ENTREGA
        # Considerar si el estado general del PedidoCliente también debe cambiar aquí, ej. a ENVIADO si es despacho
        # o LISTO_PARA_RETIRO si es retiro en tienda.
        pedido.save(update_fields=['estado_preparacion'])
        serializer = self.get_serializer(pedido)
        return Response(serializer.data)


class HistorialEntregasViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para ver el historial de pedidos entregados.
    """
    serializer_class = PedidoClienteSerializer
    pagination_class = CustomPagination # Añadir paginación
    permission_classes = [permissions.IsAuthenticated, (EsBodeguero | EsAdministrador)]

    def get_queryset(self):
        user = self.request.user
        # Base queryset for delivered orders
        queryset = PedidoCliente.objects.filter(
            estado=EstadoPedidoCliente.ENTREGADO
        ).select_related(
            'cliente__usuario', 'sucursal_despacho', 'bodeguero_asignado__perfil_personal'
        ).prefetch_related('detalles_pedido_cliente__producto').order_by('-fecha_entregado')

        # If user is a bodeguero, filter by their sucursal
        if hasattr(user, 'perfil_personal') and user.perfil_personal.rol == 'BODEGUERO':
            sucursal_bodeguero = getattr(user.perfil_personal, 'sucursal', None)
            if sucursal_bodeguero:
                return queryset.filter(sucursal_despacho=sucursal_bodeguero)
            return queryset.none()  # Bodeguero without sucursal sees no history

        # Admin sees all delivered orders
        return queryset


class DetallePedidoClienteViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DetallePedidoCliente.objects.all()
    serializer_class = DetallePedidoClienteSerializer
    permission_classes = [permissions.IsAuthenticated, IsClienteOwnerOrStaff]


class PedidoProveedorViewSet(viewsets.ModelViewSet):
    queryset = PedidoProveedor.objects.select_related(
        'proveedor', 'creado_por', 'bodega_recepcion__sucursal'
    ).prefetch_related('detalles_pedido__producto').all()
    serializer_class = PedidoProveedorSerializer
    pagination_class = CustomPagination # Añadir paginación
    permission_classes = [permissions.IsAuthenticated, (EsAdministrador | EsBodeguero)] # Solo Admin o Bodeguero pueden gestionar
    
    filter_backends = [
        DjangoFilterBackend,
        drf_filters.SearchFilter,
        drf_filters.OrderingFilter
    ]
    # filterset_class = PedidoProveedorFilter # Si creas filtros específicos
    search_fields = ['id', 'proveedor__razon_social', 'estado', 'numero_guia_despacho', 'bodega_recepcion__nombre', 'bodega_recepcion__sucursal__nombre']
    ordering_fields = ['fecha_pedido', 'estado', 'total_pedido', 'proveedor__razon_social', 'bodega_recepcion__nombre']

    def perform_create(self, serializer):
        # Asignar el usuario que crea el pedido automáticamente si es personal
        # Los permisos ya aseguran que es un usuario de personal autenticado.
        serializer.save(creado_por=self.request.user)

    def perform_update(self, serializer):
        """
        Sobrescribe para manejar la lógica de actualización de stock
        cuando el estado del PedidoProveedor cambia a RECIBIDO_COMPLETO.
        """
        pedido_instance_pre_save = serializer.instance
        estado_anterior = pedido_instance_pre_save.estado
        
        # Guardar los cambios del pedido primero
        pedido_actualizado = serializer.save()
        nuevo_estado = pedido_actualizado.estado

        if nuevo_estado == PedidoProveedor.EstadoPedido.RECIBIDO_COMPLETO and \
           estado_anterior != PedidoProveedor.EstadoPedido.RECIBIDO_COMPLETO:
            
            bodega_destino = pedido_actualizado.bodega_recepcion
            if not bodega_destino:
                # Esto no debería ocurrir si el campo es obligatorio en el modelo/serializer.
                raise ValidationError("El pedido no tiene una bodega de recepción asignada para actualizar el stock.")

            if not bodega_destino.is_active:
                raise ValidationError(f"La bodega de recepción '{bodega_destino.nombre}' no está activa.")

            try:
                with transaction.atomic():
                    inventario_sucursal = InventarioSucursal.objects.get(sucursal=bodega_destino.sucursal)
                    for detalle_pedido in pedido_actualizado.detalles_pedido.all():
                        if detalle_pedido.cantidad_recibida > 0:
                            stock_bodega, _ = DetalleInventarioBodega.objects.get_or_create(
                                inventario_sucursal=inventario_sucursal,
                                producto=detalle_pedido.producto,
                                bodega=bodega_destino,
                                defaults={'cantidad': 0}
                            )
                            stock_bodega.cantidad += detalle_pedido.cantidad_recibida
                            stock_bodega.save(update_fields=['cantidad'])
                            print(f"Stock actualizado para {detalle_pedido.producto.nombre} en bodega {bodega_destino.id}: +{detalle_pedido.cantidad_recibida}")
            except InventarioSucursal.DoesNotExist:
                raise ValidationError(f"No existe un inventario general para la sucursal '{bodega_destino.sucursal.nombre}'. Por favor, cree uno manualmente.")
            except Exception as e:
                print(f"ERROR CRÍTICO: Pedido {pedido_actualizado.id} marcado como RECIBIDO_COMPLETO, pero falló la actualización de stock: {str(e)}")
                raise ValidationError(f"Error al actualizar el stock tras recibir el pedido: {str(e)}")

class DetallePedidoProveedorViewSet(viewsets.ModelViewSet): # O ReadOnly
    queryset = DetallePedidoProveedor.objects.all()
    serializer_class = DetallePedidoProveedorSerializer
    permission_classes = [permissions.IsAdminUser]
