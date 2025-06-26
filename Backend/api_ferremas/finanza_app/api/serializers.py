from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from ..models import (
    CuentaPorCobrar, CuentaPorPagar, MetodoPago,
    PagoRecibido, PagoRealizado,
    CuentaBancaria, MovimientoCaja, DocumentoFinanciero
)

# Es importante asegurarse de que estos serializers existan y sean importables.
# Si hay riesgo de importación circular, se pueden usar strings para los campos de serializer anidados
# y luego definir los serializers en un orden que lo resuelva, o usar get_serializer_class.
from usuario_app.api.serializers import ClienteSerializer, UsuarioSerializer as PersonalSerializer # Asumiendo que UsuarioSerializer es para tu AUTH_USER_MODEL (Personal)
from proveedor_app.api.serializers import ProveedorSerializer
from pedido_app.api.serializers import PedidoClienteSerializer, PedidoProveedorSerializer


class CuentaPorCobrarSerializer(serializers.ModelSerializer):
    cliente_detalle = ClienteSerializer(source='cliente', read_only=True)
    pedido_cliente_detalle = PedidoClienteSerializer(source='pedido_cliente', read_only=True, allow_null=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    saldo_pendiente_display = serializers.DecimalField(source='saldo_pendiente', max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = CuentaPorCobrar
        fields = [
            'id', 'cliente', 'cliente_detalle', 'pedido_cliente', 'pedido_cliente_detalle',
            'monto_total', 'monto_pagado', 'fecha_emision', 'fecha_vencimiento',
            'estado', 'estado_display', 'saldo_pendiente_display',
            'fecha_creacion', 'fecha_actualizacion'
        ]
        read_only_fields = ('fecha_creacion', 'fecha_actualizacion', 'saldo_pendiente_display', 'estado_display', 'cliente_detalle', 'pedido_cliente_detalle')


class CuentaPorPagarSerializer(serializers.ModelSerializer):
    proveedor_detalle = ProveedorSerializer(source='proveedor', read_only=True)
    pedido_proveedor_detalle = PedidoProveedorSerializer(source='pedido_proveedor', read_only=True, allow_null=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    saldo_pendiente_display = serializers.DecimalField(source='saldo_pendiente', max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = CuentaPorPagar
        fields = [
            'id', 'proveedor', 'proveedor_detalle', 'pedido_proveedor', 'pedido_proveedor_detalle',
            'monto_total', 'monto_pagado', 'fecha_emision', 'fecha_vencimiento',
            'estado', 'estado_display', 'saldo_pendiente_display',
            'fecha_creacion', 'fecha_actualizacion'
        ]
        read_only_fields = ('fecha_creacion', 'fecha_actualizacion', 'saldo_pendiente_display', 'estado_display', 'proveedor_detalle', 'pedido_proveedor_detalle')


class PagoRecibidoSerializer(serializers.ModelSerializer):
    metodo_pago_display = serializers.CharField(source='get_metodo_pago_display', read_only=True)
    registrado_por_detalle = PersonalSerializer(source='registrado_por', read_only=True, allow_null=True)
    estado_confirmacion_display = serializers.CharField(source='get_estado_confirmacion_display', read_only=True)
    # Campos desnormalizados para facilitar el uso en el frontend
    pedido_id = serializers.SerializerMethodField()
    cliente_nombre = serializers.SerializerMethodField()

    class Meta:
        model = PagoRecibido
        fields = [
            'id', 'cliente', 'cuenta_por_cobrar',
            'fecha_pago', 'monto', 'metodo_pago', 'metodo_pago_display',
            'referencia_pago', 'observaciones',
            'registrado_por', 'registrado_por_detalle', 'fecha_creacion',
            'estado_confirmacion', 'estado_confirmacion_display', 'comprobante_adjunto',
            'pedido_id', 'cliente_nombre'
        ]
        read_only_fields = ('fecha_creacion', 'metodo_pago_display', 'registrado_por_detalle', 'estado_confirmacion_display', 'pedido_id', 'cliente_nombre')

    def get_pedido_id(self, obj):
        if obj.cuenta_por_cobrar and obj.cuenta_por_cobrar.pedido_cliente:
            return obj.cuenta_por_cobrar.pedido_cliente.id
        return None

    def get_cliente_nombre(self, obj):
        if obj.cliente and hasattr(obj.cliente, 'usuario'):
            return f"{obj.cliente.usuario.first_name} {obj.cliente.usuario.last_name}"
        return None

class PagoRealizadoSerializer(serializers.ModelSerializer):
    proveedor_detalle = ProveedorSerializer(source='proveedor', read_only=True)
    cuenta_por_pagar_detalle = CuentaPorPagarSerializer(source='cuenta_por_pagar', read_only=True, allow_null=True)
    metodo_pago_display = serializers.CharField(source='get_metodo_pago_display', read_only=True)
    registrado_por_detalle = PersonalSerializer(source='registrado_por', read_only=True, allow_null=True)

    class Meta:
        model = PagoRealizado
        fields = [
            'id', 'proveedor', 'proveedor_detalle', 'cuenta_por_pagar', 'cuenta_por_pagar_detalle',
            'fecha_pago', 'monto', 'metodo_pago', 'metodo_pago_display',
            'referencia_pago', 'observaciones',
            'registrado_por', 'registrado_por_detalle', 'fecha_creacion'
        ]
        read_only_fields = ('fecha_creacion', 'proveedor_detalle', 'cuenta_por_pagar_detalle', 'metodo_pago_display', 'registrado_por_detalle')


class CuentaBancariaSerializer(serializers.ModelSerializer):
    tipo_cuenta_display = serializers.CharField(source='get_tipo_cuenta_display', read_only=True)
    moneda_display = serializers.CharField(source='get_moneda_display', read_only=True)

    class Meta:
        model = CuentaBancaria
        fields = [
            'id', 'banco', 'tipo_cuenta', 'tipo_cuenta_display', 'numero_cuenta',
            'moneda', 'moneda_display', 'titular', 'saldo_actual', 'activa',
            'fecha_creacion', 'fecha_actualizacion'
        ]
        read_only_fields = ('fecha_creacion', 'fecha_actualizacion', 'tipo_cuenta_display', 'moneda_display')


class MovimientoCajaSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    origen_destino_display = serializers.CharField(source='get_origen_destino_display', read_only=True)
    cuenta_bancaria_asociada_detalle = CuentaBancariaSerializer(source='cuenta_bancaria_asociada', read_only=True, allow_null=True)
    usuario_responsable_detalle = PersonalSerializer(source='usuario_responsable', read_only=True, allow_null=True)

    class Meta:
        model = MovimientoCaja
        fields = [
            'id', 'fecha', 'tipo', 'tipo_display', 'concepto', 'monto',
            'origen_destino', 'origen_destino_display',
            'cuenta_bancaria_asociada', 'cuenta_bancaria_asociada_detalle',
            'referencia', 'usuario_responsable', 'usuario_responsable_detalle', 'fecha_creacion'
        ]
        read_only_fields = ('fecha_creacion', 'tipo_display', 'origen_destino_display', 'cuenta_bancaria_asociada_detalle', 'usuario_responsable_detalle')


class DocumentoFinancieroSerializer(serializers.ModelSerializer):
    tipo_documento_display = serializers.CharField(source='get_tipo_documento_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    entidad_asociada_detalle = serializers.SerializerMethodField(read_only=True)
    pedido_cliente_asociado_detalle = PedidoClienteSerializer(source='pedido_cliente_asociado', read_only=True, allow_null=True)
    pedido_proveedor_asociado_detalle = PedidoProveedorSerializer(source='pedido_proveedor_asociado', read_only=True, allow_null=True)

    class Meta:
        model = DocumentoFinanciero
        fields = [
            'id', 'tipo_documento', 'tipo_documento_display',
            'content_type', 'object_id', 'entidad_asociada_detalle', # Para GenericForeignKey
            'numero_documento', 'monto_neto', 'monto_impuesto', 'monto_total',
            'fecha_emision', 'fecha_vencimiento', 'estado', 'estado_display', 'url_pdf',
            'pedido_cliente_asociado', 'pedido_cliente_asociado_detalle',
            'pedido_proveedor_asociado', 'pedido_proveedor_asociado_detalle',
            'fecha_creacion', 'fecha_actualizacion'
        ]
        read_only_fields = (
            'fecha_creacion', 'fecha_actualizacion', 'tipo_documento_display', 'estado_display',
            'entidad_asociada_detalle', 'pedido_cliente_asociado_detalle', 'pedido_proveedor_asociado_detalle'
        )

    def get_entidad_asociada_detalle(self, obj):
        """
        Devuelve la representación serializada de la entidad asociada (Cliente o Proveedor).
        """
        if isinstance(obj.entidad_asociada, ClienteSerializer.Meta.model): # Compara con el modelo del ClienteSerializer
            return ClienteSerializer(obj.entidad_asociada).data
        elif isinstance(obj.entidad_asociada, ProveedorSerializer.Meta.model): # Compara con el modelo del ProveedorSerializer
            return ProveedorSerializer(obj.entidad_asociada).data
        return None

    def validate(self, data):
        """
        Validaciones a nivel de objeto.
        - Asegurar que content_type y object_id apunten a un objeto existente.
        - Validar que monto_neto + monto_impuesto = monto_total.
        """
        # Validar GenericForeignKey
        content_type = data.get('content_type')
        object_id = data.get('object_id')

        if content_type and object_id:
            try:
                content_type.get_object_for_this_type(pk=object_id)
            except content_type.model_class().DoesNotExist:
                raise serializers.ValidationError(
                    {"object_id": f"No se encontró un objeto del tipo '{content_type.model}' con ID '{object_id}'."}
                )
            # Validar que el content_type sea Cliente o Proveedor
            allowed_models = ('cliente', 'proveedor')
            if content_type.model not in allowed_models:
                raise serializers.ValidationError(
                    {"content_type": f"El tipo de entidad debe ser Cliente o Proveedor, se recibió '{content_type.model}'."}
                )

        # Validar suma de montos
        monto_neto = data.get('monto_neto', getattr(self.instance, 'monto_neto', None))
        monto_impuesto = data.get('monto_impuesto', getattr(self.instance, 'monto_impuesto', None))
        monto_total = data.get('monto_total', getattr(self.instance, 'monto_total', None))

        if monto_neto is not None and monto_impuesto is not None and monto_total is not None:
            if monto_neto + monto_impuesto != monto_total:
                raise serializers.ValidationError(
                    "El monto total no coincide con la suma del monto neto más el monto del impuesto."
                )
        
        return super().validate(data)