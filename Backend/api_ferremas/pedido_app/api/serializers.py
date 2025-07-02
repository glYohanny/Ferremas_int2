from rest_framework import serializers
from ..models import (
    PedidoProveedor, DetallePedidoProveedor,
    PedidoCliente, DetallePedidoCliente
)
from proveedor_app.api.serializers import ProveedorSerializer # Assuming this exists
from producto_app.api.serializers import ProductoSerializer
from usuario_app.api.serializers import UsuarioSerializer, ClienteSerializer
from sucursal_app.api.serializers import SucursalSerializer, BodegaSerializer # Importar BodegaSerializer


class PedidoClienteListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listas, como la del dashboard del vendedor.
    """
    cliente_nombre = serializers.CharField(source='cliente.usuario.get_full_name', read_only=True)
    cliente_email = serializers.EmailField(source='cliente.usuario.email', read_only=True)
    cliente_telefono = serializers.CharField(source='cliente.num_telefono', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = PedidoCliente
        fields = ['id', 'cliente_nombre', 'cliente_email', 'cliente_telefono', 'estado', 'estado_display', 'total_pedido', 'fecha_pedido']


class DetallePedidoProveedorSerializer(serializers.ModelSerializer):
    producto_detalle = ProductoSerializer(source='producto', read_only=True)
    subtotal_linea_display = serializers.DecimalField(source='subtotal_linea', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = DetallePedidoProveedor
        fields = [
            'id',
            'pedido_proveedor', # Necesario para la relación, pero se manejará al anidar
            'producto', # ID para enviar al crear/actualizar
            'producto_detalle',
            'cantidad_solicitada',
            'precio_unitario_compra',
            'cantidad_recibida',
            'subtotal_linea_display',
        ]
        # Hacemos 'pedido_proveedor' de solo lectura para que la validación anidada no lo exija.
        read_only_fields = ('id', 'pedido_proveedor', 'producto_detalle', 'subtotal_linea_display')

class PedidoProveedorSerializer(serializers.ModelSerializer):
    proveedor_detalle = ProveedorSerializer(source='proveedor', read_only=True)
    creado_por_detalle = UsuarioSerializer(source='creado_por', read_only=True)
    bodega_recepcion_detalle = BodegaSerializer(source='bodega_recepcion', read_only=True, allow_null=True) # Cambiado de sucursal_recepcion_detalle
    detalles_pedido = DetallePedidoProveedorSerializer(many=True, required=False)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = PedidoProveedor
        fields = [
            'id',
            'proveedor', # ID para enviar al crear/actualizar
            'proveedor_detalle',
            'bodega_recepcion', # ID de la bodega para enviar al crear/actualizar
            'bodega_recepcion_detalle',
            'fecha_pedido',
            'estado',
            'estado_display',
            'subtotal',
            'descuento_total',
            'impuesto_total',
            'total_pedido',
            'fecha_estimada_entrega',
            'fecha_recepcion',
            'numero_guia_despacho',
            'notas',
            'creado_por', # ID para enviar al crear/actualizar (si no se asigna automáticamente)
            'creado_por_detalle',
            'fecha_creacion',
            'fecha_actualizacion',
            'detalles_pedido',
        ]
        read_only_fields = (
            'fecha_pedido', 'fecha_creacion', 'fecha_actualizacion',
            'subtotal', 'descuento_total', 'impuesto_total', 'total_pedido',
            'proveedor_detalle', 'creado_por_detalle', 'bodega_recepcion_detalle', 'estado_display'
        )

    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles_pedido')
        pedido = PedidoProveedor.objects.create(**validated_data)
        for detalle_data in detalles_data:
            DetallePedidoProveedor.objects.create(pedido_proveedor=pedido, **detalle_data)
        pedido.calcular_totales() # Recalcular totales después de crear detalles
        return pedido

    def update(self, instance, validated_data):
        detalles_data = validated_data.pop('detalles_pedido', None)
        instance = super().update(instance, validated_data)

        if detalles_data is not None:
            # Lógica para actualizar/crear/eliminar detalles.
            # Por simplicidad, aquí podríamos eliminar los existentes y crear los nuevos.
            # Una implementación más robusta manejaría cada item individualmente.
            instance.detalles_pedido.all().delete()
            for detalle_data in detalles_data:
                DetallePedidoProveedor.objects.create(pedido_proveedor=instance, **detalle_data)
        
        instance.calcular_totales() # Recalcular totales después de actualizar
        return instance


from producto_app.models import Producto # Import Product model to get price

class DetallePedidoClienteSerializer(serializers.ModelSerializer):
    producto_detalle = ProductoSerializer(source='producto', read_only=True)
    subtotal_linea_display = serializers.DecimalField(source='subtotal_linea_cliente', max_digits=10, decimal_places=2, read_only=True)
    # Mostrar el precio unitario original y el con descuento
    precio_unitario_venta_original = serializers.DecimalField(source='precio_unitario_venta', max_digits=10, decimal_places=2, read_only=True)
    
    # Para operaciones de escritura, necesitamos aceptar el ID del producto y la cantidad.
    # El campo 'producto' debe ser un PrimaryKeyRelatedField para aceptar el ID del producto.
    producto = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.all())
    # 'cantidad' ya es escribible por defecto.
    # El 'precio_unitario_venta' real será determinado por el backend basándose en el producto,
    # por lo que no lo incluimos como un campo escribible aquí.

    class Meta:
        model = DetallePedidoCliente
        fields = [
            'id',
            'pedido_cliente', # Necesario para la relación, pero se manejará al anidar
            'producto',       # Aceptar ID de producto para creación/actualización
            'producto_detalle',
            'cantidad',
            # 'precio_unitario_venta', # Eliminado de los campos escribibles, será establecido por el backend
            'precio_unitario_venta_original', # Para mostrar el original
            'precio_unitario_con_descuento', # Se calcula y se guarda
            'descuento_total_linea', # Se calcula y se guarda
            'subtotal_linea_display',
        ]
        read_only_fields = ('pedido_cliente', 'precio_unitario_con_descuento', 'descuento_total_linea', 'subtotal_linea_display', 'precio_unitario_venta_original')

class PedidoClienteSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.usuario.get_full_name', read_only=True)
    cliente_detalle = ClienteSerializer(source='cliente', read_only=True)
    creado_por_personal_detalle = UsuarioSerializer(source='creado_por_personal', read_only=True, allow_null=True)
    sucursal_despacho_detalle = SucursalSerializer(source='sucursal_despacho', read_only=True, allow_null=True)
    bodeguero_asignado_detalle = UsuarioSerializer(source='bodeguero_asignado', read_only=True, allow_null=True) # Para mostrar info del bodeguero
    detalles_pedido_cliente = DetallePedidoClienteSerializer(many=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    metodo_envio_display = serializers.CharField(source='get_metodo_envio_display', read_only=True)
    estado_preparacion_display = serializers.CharField(source='get_estado_preparacion_display', read_only=True)

    class Meta:
        model = PedidoCliente
        fields = [
            'id', 'cliente', 'cliente_detalle', 'cliente_nombre',
            'sucursal_despacho', 'sucursal_despacho_detalle', # Nuevos campos
            'fecha_pedido', 
            'estado', 'estado_display',
            'estado_preparacion', 'estado_preparacion_display', # Nuevos campos de preparación
            'bodeguero_asignado', 'bodeguero_asignado_detalle', # Nuevos campos de bodeguero
            'subtotal', 'descuento_total', 'impuesto_total', 'total_pedido',
            'metodo_envio', 'metodo_envio_display', 'direccion_entrega_texto',
            'fecha_entrega_estimada', 'fecha_entregado', 'notas_cliente', # 'token_webpay' eliminado
            'creado_por_personal', 'creado_por_personal_detalle',
            'fecha_creacion', 'fecha_actualizacion', 'detalles_pedido_cliente',
        ]
        read_only_fields = (
            'fecha_pedido', 'fecha_creacion', 'fecha_actualizacion',
            'subtotal', 'descuento_total', 'impuesto_total', 'total_pedido', # Calculados
            'cliente_detalle', 'creado_por_personal_detalle', 
            'sucursal_despacho_detalle', 
            'bodeguero_asignado_detalle', 'estado_display', 'metodo_envio_display', 'estado_preparacion_display'
        )
        extra_kwargs = {
            'creado_por_personal': {'required': False, 'allow_null': True}
        }

    def create(self, validated_data):
        # Extraer los datos anidados de los detalles
        detalles_data = validated_data.pop('detalles_pedido_cliente')
        # El usuario que crea el pedido se asigna en la vista (perform_create)
        pedido = PedidoCliente.objects.create(**validated_data)
        for detalle_data in detalles_data:
            producto_instance = detalle_data['producto']
            # El backend determina el precio para evitar manipulaciones desde el frontend
            precio_unitario_venta, _ = producto_instance.precio_final_con_info_promo
            DetallePedidoCliente.objects.create(
                pedido_cliente=pedido,
                producto=producto_instance,
                cantidad=detalle_data['cantidad'],
                precio_unitario_venta=precio_unitario_venta
            )
        pedido.calcular_totales_cliente()
        return pedido

    def update(self, instance, validated_data):
        detalles_data = validated_data.pop('detalles_pedido_cliente', None)
        instance = super().update(instance, validated_data)
        if detalles_data is not None:
            instance.detalles_pedido_cliente.all().delete() # Simplificado
            for detalle_data in detalles_data:
                producto_instance = detalle_data['producto']
                precio_unitario_venta, _ = producto_instance.precio_final_con_info_promo
                DetallePedidoCliente.objects.create(
                    pedido_cliente=instance,
                    producto=producto_instance,
                    cantidad=detalle_data['cantidad'],
                    precio_unitario_venta=precio_unitario_venta
                )
        instance.calcular_totales_cliente()
        return instance