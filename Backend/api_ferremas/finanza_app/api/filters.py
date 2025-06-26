import django_filters
from django.contrib.contenttypes.models import ContentType
from ..models import (
    CuentaPorCobrar, CuentaPorPagar,
    PagoRecibido, PagoRealizado,
    CuentaBancaria, MovimientoCaja, DocumentoFinanciero, MetodoPago # Importar MetodoPago
)
from usuario_app.models import Cliente, Personal # Asumiendo que Personal es tu AUTH_USER_MODEL o relacionado
from proveedor_app.models import Proveedor

class CuentaPorCobrarFilter(django_filters.FilterSet):
    cliente = django_filters.ModelChoiceFilter(queryset=Cliente.objects.all())
    estado = django_filters.ChoiceFilter(choices=CuentaPorCobrar.EstadoCxC.choices)
    fecha_vencimiento_desde = django_filters.DateFilter(field_name='fecha_vencimiento', lookup_expr='gte')
    fecha_vencimiento_hasta = django_filters.DateFilter(field_name='fecha_vencimiento', lookup_expr='lte')

    class Meta:
        model = CuentaPorCobrar
        fields = ['cliente', 'pedido_cliente', 'estado', 'fecha_vencimiento_desde', 'fecha_vencimiento_hasta']

class CuentaPorPagarFilter(django_filters.FilterSet):
    proveedor = django_filters.ModelChoiceFilter(queryset=Proveedor.objects.all())
    estado = django_filters.ChoiceFilter(choices=CuentaPorPagar.EstadoCxP.choices)
    fecha_vencimiento_desde = django_filters.DateFilter(field_name='fecha_vencimiento', lookup_expr='gte')
    fecha_vencimiento_hasta = django_filters.DateFilter(field_name='fecha_vencimiento', lookup_expr='lte')

    class Meta:
        model = CuentaPorPagar
        fields = ['proveedor', 'pedido_proveedor', 'estado', 'fecha_vencimiento_desde', 'fecha_vencimiento_hasta']

class PagoRecibidoFilter(django_filters.FilterSet):
    cliente = django_filters.ModelChoiceFilter(queryset=Cliente.objects.all())
    metodo_pago = django_filters.ChoiceFilter(choices=MetodoPago.choices)
    fecha_pago_desde = django_filters.DateFilter(field_name='fecha_pago', lookup_expr='gte')
    fecha_pago_hasta = django_filters.DateFilter(field_name='fecha_pago', lookup_expr='lte')

    class Meta:
        model = PagoRecibido
        fields = ['cliente', 'cuenta_por_cobrar', 'metodo_pago', 'registrado_por', 'fecha_pago_desde', 'fecha_pago_hasta']

class PagoRealizadoFilter(django_filters.FilterSet):
    proveedor = django_filters.ModelChoiceFilter(queryset=Proveedor.objects.all())
    metodo_pago = django_filters.ChoiceFilter(choices=MetodoPago.choices)
    fecha_pago_desde = django_filters.DateFilter(field_name='fecha_pago', lookup_expr='gte')
    fecha_pago_hasta = django_filters.DateFilter(field_name='fecha_pago', lookup_expr='lte')

    class Meta:
        model = PagoRealizado
        fields = ['proveedor', 'cuenta_por_pagar', 'metodo_pago', 'registrado_por', 'fecha_pago_desde', 'fecha_pago_hasta']

class DocumentoFinancieroFilter(django_filters.FilterSet):
    tipo_documento = django_filters.ChoiceFilter(choices=DocumentoFinanciero.TipoDocumento.choices)
    estado = django_filters.ChoiceFilter(choices=DocumentoFinanciero.EstadoDocumento.choices)
    fecha_emision_desde = django_filters.DateFilter(field_name='fecha_emision', lookup_expr='gte')
    fecha_emision_hasta = django_filters.DateFilter(field_name='fecha_emision', lookup_expr='lte')
    # Para GenericForeignKey (entidad_asociada)
    content_type_model = django_filters.CharFilter(method='filter_by_content_type_model', label="Modelo de Entidad (cliente, proveedor)")

    class Meta:
        model = DocumentoFinanciero
        fields = ['tipo_documento', 'estado', 'numero_documento', 'content_type', 'object_id', 'fecha_emision_desde', 'fecha_emision_hasta']

    def filter_by_content_type_model(self, queryset, name, value):
        try:
            # Asumimos que Cliente y Proveedor están en apps 'usuario_app' y 'proveedor_app' respectivamente
            app_label = 'usuario_app' if value.lower() == 'cliente' else 'proveedor_app'
            content_type = ContentType.objects.get(app_label=app_label, model=value.lower())
            return queryset.filter(content_type=content_type)
        except ContentType.DoesNotExist:
            return queryset.none()