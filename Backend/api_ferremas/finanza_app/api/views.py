from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError as DRFValidationError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend # type: ignore
from rest_framework import filters as drf_filters
from rest_framework.views import APIView
from rest_framework.decorators import action # ¡Importante! Faltaba esta importación

from ..models import (
    CuentaPorCobrar, CuentaPorPagar, MetodoPago,
    PagoRecibido, PagoRealizado,
    CuentaBancaria, MovimientoCaja, DocumentoFinanciero
)
from pedido_app.models import PedidoCliente, EstadoPedidoCliente
from pedido_app.services import modificar_stock_para_pedido
from .serializers import (
    CuentaPorCobrarSerializer, CuentaPorPagarSerializer,
    PagoRecibidoSerializer, PagoRealizadoSerializer,
    CuentaBancariaSerializer, MovimientoCajaSerializer, DocumentoFinancieroSerializer
)
from .filters import (
    CuentaPorCobrarFilter, CuentaPorPagarFilter,
    PagoRecibidoFilter, PagoRealizadoFilter, DocumentoFinancieroFilter
)
from usuario_app.api.permissions import EsAdministrador, EsContable # Asumiendo que estos permisos existen

# Permiso base para la mayoría de las operaciones financieras
FINANCE_PERMISSIONS = [permissions.IsAuthenticated, (EsAdministrador | EsContable)]

class CuentaPorCobrarViewSet(viewsets.ModelViewSet):
    queryset = CuentaPorCobrar.objects.select_related('cliente', 'pedido_cliente').all()
    serializer_class = CuentaPorCobrarSerializer
    permission_classes = FINANCE_PERMISSIONS
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter]
    filterset_class = CuentaPorCobrarFilter
    search_fields = ['cliente__usuario__email', 'cliente__usuario__first_name', 'pedido_cliente__id']
    ordering_fields = ['fecha_emision', 'fecha_vencimiento', 'monto_total', 'estado']

    # La creación de CuentasPorCobrar podría ser automática al crear un PedidoCliente
    # o al facturar. La actualización de monto_pagado se haría al crear un PagoRecibido.

class CuentaPorPagarViewSet(viewsets.ModelViewSet):
    queryset = CuentaPorPagar.objects.select_related('proveedor', 'pedido_proveedor').all()
    serializer_class = CuentaPorPagarSerializer
    permission_classes = FINANCE_PERMISSIONS
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter]
    filterset_class = CuentaPorPagarFilter
    search_fields = ['proveedor__razon_social', 'pedido_proveedor__id']
    ordering_fields = ['fecha_emision', 'fecha_vencimiento', 'monto_total', 'estado']

class PagoRecibidoViewSet(viewsets.ModelViewSet):
    queryset = PagoRecibido.objects.select_related('cliente', 'cuenta_por_cobrar', 'registrado_por').all()
    serializer_class = PagoRecibidoSerializer
    permission_classes = FINANCE_PERMISSIONS # Podrías añadir Vendedor si pueden registrar pagos
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter]
    filterset_class = PagoRecibidoFilter
    search_fields = [
        'cliente__usuario__email',
        'cliente__usuario__first_name',
        'cliente__usuario__last_name',
        'referencia_pago',
        'cuenta_por_cobrar__pedido_cliente__id' # Permite buscar por ID de pedido
    ]
    ordering_fields = ['fecha_pago', 'monto', 'metodo_pago', 'estado_confirmacion']

    def perform_create(self, serializer):
        with transaction.atomic():
            pago_recibido = serializer.save(registrado_por=self.request.user if self.request.user.is_authenticated else None)
            
            # Si el método de pago es TRANSFERENCIA, el estado de confirmación es PENDIENTE
            if pago_recibido.metodo_pago == MetodoPago.TRANSFERENCIA:
                pago_recibido.estado_confirmacion = PagoRecibido.EstadoConfirmacion.PENDIENTE
                pago_recibido.save() # Guardar el estado de confirmación inicial

            # Lógica para actualizar CuentaPorCobrar (solo si el pago es CONFIRMADO)
            # Esto se ejecutará si el pago no es transferencia (default CONFIRMADO)
            # o si se confirma manualmente después.
            if pago_recibido.estado_confirmacion == PagoRecibido.EstadoConfirmacion.CONFIRMADO and pago_recibido.cuenta_por_cobrar:
                cuenta = pago_recibido.cuenta_por_cobrar
                cuenta.monto_pagado += pago_recibido.monto
                if cuenta.monto_pagado >= cuenta.monto_total:
                    cuenta.estado = CuentaPorCobrar.EstadoCxC.PAGADA
                elif cuenta.monto_pagado > 0:
                    cuenta.estado = CuentaPorCobrar.EstadoCxC.PARCIALMENTE_PAGADA
                cuenta.save()

    # perform_update podría necesitar lógica similar si se edita un pago
    # perform_destroy debería revertir el efecto en la CuentaPorCobrar

    @action(detail=False, methods=['get'], permission_classes=FINANCE_PERMISSIONS, url_path='por-confirmar')
    def list_pagos_por_confirmar(self, request):
        """
        Lista los pagos recibidos que están pendientes de confirmación (transferencias bancarias).
        """
        queryset = self.get_queryset().filter(
            metodo_pago=MetodoPago.TRANSFERENCIA,
            estado_confirmacion=PagoRecibido.EstadoConfirmacion.PENDIENTE
        ).order_by('fecha_pago') # Ordenar por fecha de pago para ver los más antiguos primero

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=FINANCE_PERMISSIONS)
    def confirmar_pago(self, request, pk=None):
        """
        Confirma un pago pendiente.
        """
        pago = self.get_object()
        if pago.estado_confirmacion == PagoRecibido.EstadoConfirmacion.PENDIENTE:
            with transaction.atomic():
                pago.estado_confirmacion = PagoRecibido.EstadoConfirmacion.CONFIRMADO
                pago.save()

                # 1. Actualizar CuentaPorCobrar
                if pago.cuenta_por_cobrar:
                    cuenta = pago.cuenta_por_cobrar
                    cuenta.monto_pagado += pago.monto
                    if cuenta.monto_pagado >= cuenta.monto_total:
                        cuenta.estado = CuentaPorCobrar.EstadoCxC.PAGADA
                    elif cuenta.monto_pagado > 0:
                        cuenta.estado = CuentaPorCobrar.EstadoCxC.PARCIALMENTE_PAGADA
                    cuenta.save()

                # 2. Actualizar el PedidoCliente. El stock ya se manejó en la creación.
                if pago.cuenta_por_cobrar and pago.cuenta_por_cobrar.pedido_cliente:
                    pedido = pago.cuenta_por_cobrar.pedido_cliente
                    if pedido.estado in [EstadoPedidoCliente.PENDIENTE, EstadoPedidoCliente.PENDIENTE_REABASTECIMIENTO]:
                        pedido.estado = EstadoPedidoCliente.PAGADO
                        pedido.save(update_fields=['estado'])

                return Response({'status': 'Pago confirmado'}, status=status.HTTP_200_OK)
        return Response({'detail': 'El pago no está pendiente de confirmación.'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=FINANCE_PERMISSIONS)
    def rechazar_pago(self, request, pk=None):
        pago = self.get_object()
        if pago.estado_confirmacion == PagoRecibido.EstadoConfirmacion.PENDIENTE:
            with transaction.atomic():
                pago.estado_confirmacion = PagoRecibido.EstadoConfirmacion.RECHAZADO
                pago.save()

                # Restaurar stock y actualizar estado del pedido
                if pago.cuenta_por_cobrar and pago.cuenta_por_cobrar.pedido_cliente:
                    pedido = pago.cuenta_por_cobrar.pedido_cliente
                    if pedido.estado in [EstadoPedidoCliente.PENDIENTE, EstadoPedidoCliente.PENDIENTE_REABASTECIMIENTO]:
                        try:
                            usuario_solicitante = request.user if request.user.is_authenticated else None
                            modificar_stock_para_pedido(pedido, anular_reduccion=True, usuario_solicitante_traspaso=usuario_solicitante)
                            pedido.estado = EstadoPedidoCliente.FALLIDO
                            pedido.notas_internas = (pedido.notas_internas or "") + f"\nPago ID {pago.id} rechazado por contador. Stock restaurado."
                            pedido.save(update_fields=['estado', 'notas_internas'])
                        except Exception as e:
                            error_msg = f"Error CRÍTICO al restaurar stock para pedido {pedido.id} tras rechazo de pago: {str(e)}"
                            print(error_msg)
                            pedido.estado = EstadoPedidoCliente.FALLIDO
                            pedido.notas_internas = (pedido.notas_internas or "") + f"\n{error_msg}"
                            pedido.save(update_fields=['estado', 'notas_internas'])

            return Response({'status': 'Pago rechazado'}, status=status.HTTP_200_OK)
        return Response({'detail': 'El pago no está pendiente de confirmación.'}, status=status.HTTP_400_BAD_REQUEST)

class PagoRealizadoViewSet(viewsets.ModelViewSet):
    queryset = PagoRealizado.objects.select_related('proveedor', 'cuenta_por_pagar', 'registrado_por').all()
    serializer_class = PagoRealizadoSerializer
    permission_classes = FINANCE_PERMISSIONS
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter]
    filterset_class = PagoRealizadoFilter
    search_fields = ['proveedor__razon_social', 'referencia_pago']
    ordering_fields = ['fecha_pago', 'monto', 'metodo_pago']

    def perform_create(self, serializer):
        with transaction.atomic():
            pago_realizado = serializer.save(registrado_por=self.request.user if self.request.user.is_authenticated else None)
            if pago_realizado.cuenta_por_pagar:
                cuenta = pago_realizado.cuenta_por_pagar
                cuenta.monto_pagado += pago_realizado.monto
                if cuenta.monto_pagado >= cuenta.monto_total:
                    cuenta.estado = CuentaPorPagar.EstadoCxP.PAGADA
                elif cuenta.monto_pagado > 0:
                    cuenta.estado = CuentaPorPagar.EstadoCxP.PARCIALMENTE_PAGADA
                cuenta.save()

class CuentaBancariaViewSet(viewsets.ModelViewSet):
    queryset = CuentaBancaria.objects.all()
    serializer_class = CuentaBancariaSerializer
    permission_classes = FINANCE_PERMISSIONS
    filter_backends = [drf_filters.SearchFilter, drf_filters.OrderingFilter]
    search_fields = ['banco', 'numero_cuenta', 'titular']
    ordering_fields = ['banco', 'tipo_cuenta', 'moneda', 'saldo_actual']

class MovimientoCajaViewSet(viewsets.ModelViewSet):
    queryset = MovimientoCaja.objects.select_related('cuenta_bancaria_asociada', 'usuario_responsable').all()
    serializer_class = MovimientoCajaSerializer
    permission_classes = FINANCE_PERMISSIONS
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter]
    # filterset_class = MovimientoCajaFilter # Crear si es necesario
    search_fields = ['concepto', 'referencia', 'usuario_responsable__email']
    ordering_fields = ['fecha', 'tipo', 'monto']

    def perform_create(self, serializer):
        serializer.save(usuario_responsable=self.request.user if self.request.user.is_authenticated else None)
        # Opcional: Lógica para actualizar saldo de CuentaBancaria si el movimiento está asociado.
        # Esto puede ser complejo por concurrencia y a menudo se maneja por conciliación.

class DocumentoFinancieroViewSet(viewsets.ModelViewSet):
    queryset = DocumentoFinanciero.objects.select_related(
        'content_type', 'pedido_cliente_asociado', 'pedido_proveedor_asociado'
    ).all()
    serializer_class = DocumentoFinancieroSerializer
    permission_classes = FINANCE_PERMISSIONS
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter]
    filterset_class = DocumentoFinancieroFilter
    search_fields = ['numero_documento', 'entidad_asociada__cliente__usuario__email', 'entidad_asociada__proveedor__razon_social'] # Requiere configurar GenericForeignKey search
    ordering_fields = ['fecha_emision', 'tipo_documento', 'monto_total', 'estado']

    # La creación de DocumentosFinancieros (facturas, boletas) a menudo se dispara
    # desde la lógica de PedidoCliente (ej. al marcar como pagado/enviado)
    # o PedidoProveedor (al recibir factura).

class ResumenIngresosView(APIView):
    """
    Vista para obtener un resumen de los ingresos para el dashboard del contador.
    """
    permission_classes = FINANCE_PERMISSIONS

    def get(self, request, *args, **kwargs):
        # Resumen de ingresos confirmados del último mes
        one_month_ago = timezone.now() - timezone.timedelta(days=30)
        
        total_ingresos_confirmados = PagoRecibido.objects.filter(
            estado_confirmacion=PagoRecibido.EstadoConfirmacion.CONFIRMADO,
            fecha_pago__gte=one_month_ago
        ).aggregate(total=Sum('monto'))['total'] or 0

        return Response({
            'total_ingresos_confirmados_ultimo_mes': total_ingresos_confirmados,
        })