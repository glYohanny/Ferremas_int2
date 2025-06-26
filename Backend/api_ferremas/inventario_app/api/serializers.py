from rest_framework import serializers
from ..models import (
    InventarioSucursal,
    DetalleInventarioBodega,
    TraspasoInternoStock,
    DetalleTraspasoStock
)
from producto_app.api.serializers import ProductoSerializer # Para mostrar info del producto
from sucursal_app.api.serializers import SucursalSerializer, BodegaSerializer # Para mostrar info
from usuario_app.api.serializers import UsuarioSerializer # Para el 'creado_por'
from ..models import DetalleInventarioBodega # Asegurar importación para el ListSerializer

class DetalleInventarioBodegaListSerializer(serializers.ListSerializer):
    def create(self, validated_data):
        # validated_data es una lista de diccionarios
        # La vista cargar_stock_excel ya usa @transaction.atomic
        # por lo que no es estrictamente necesario aquí, pero no hace daño.
        # from django.db import transaction
        # with transaction.atomic():
        result_instances = []
        for item_data in validated_data:
            inventario_sucursal = item_data.get('inventario_sucursal')
            producto = item_data.get('producto')
            bodega = item_data.get('bodega')
            cantidad_a_agregar = item_data.get('cantidad', 0)
            stock_minimo = item_data.get('stock_minimo')
            stock_maximo = item_data.get('stock_maximo')

            # Lógica de get_or_create y actualización
            obj, created = DetalleInventarioBodega.objects.get_or_create(
                inventario_sucursal=inventario_sucursal,
                producto=producto,
                bodega=bodega,
                defaults={
                    'cantidad': cantidad_a_agregar,
                    'stock_minimo': stock_minimo,
                    'stock_maximo': stock_maximo
                }
            )
            if not created:
                obj.cantidad += cantidad_a_agregar
                # Actualizar stock_minimo y stock_maximo si se proporcionan en el Excel
                # y son diferentes de None (para no sobrescribir con None si no vienen)
                if stock_minimo is not None:
                    obj.stock_minimo = stock_minimo
                if stock_maximo is not None:
                    obj.stock_maximo = stock_maximo
                obj.save()
            result_instances.append(obj)
        return result_instances
    # No necesitas un método update aquí a menos que planees hacer bulk updates
    # a través de este ListSerializer de una manera específica.

class DetalleInventarioBodegaSerializer(serializers.ModelSerializer):
    producto_detalle = ProductoSerializer(source='producto', read_only=True)
    # bodega_detalle = BodegaSerializer(source='bodega', read_only=True) # Opcional, si quieres todos los detalles
    bodega_nombre = serializers.CharField(source='bodega.sucursal.nombre', read_only=True) # Accede al nombre de la sucursal a través de la bodega

    class Meta:
        model = DetalleInventarioBodega
        fields = [
            'id',
            'inventario_sucursal', # ID para la creación/actualización
            'producto', # ID para la creación/actualización
            'producto_detalle',
            'bodega', # ID para la creación/actualización
            'bodega_nombre',
            'cantidad',
            'stock_minimo',
            'stock_maximo',
            'ultima_actualizacion'
        ]
        read_only_fields = ('ultima_actualizacion', 'producto_detalle', 'bodega_nombre')
        list_serializer_class = DetalleInventarioBodegaListSerializer # Usar el ListSerializer personalizado

        # Quitar los validadores de unicidad a nivel de serializer individual,
        # ya que el ListSerializer se encargará de la lógica de "upsert".
        # Esto permite que is_valid() pase para ítems que ya existen en la BD.
        validators = []

    # El método create individual ya no es estrictamente necesario para el flujo de carga masiva
    # si DetalleInventarioBodegaListSerializer.create lo maneja todo.
    # Puedes mantenerlo si este serializer también se usa para crear ítems individuales (no many=True).

class InventarioSucursalSerializer(serializers.ModelSerializer):
    sucursal_nombre = serializers.CharField(source='sucursal.nombre', read_only=True)
    # Para mostrar los detalles de stock directamente, aunque puede ser mucha data.
    # detalles_bodega = DetalleInventarioBodegaSerializer(many=True, read_only=True)
    
    # Usar las propiedades/métodos del modelo para resúmenes
    stock_consolidado = serializers.DictField(source='stock_consolidado_por_producto', read_only=True)
    stock_total_unidades = serializers.IntegerField(source='get_stock_total_de_todos_los_productos', read_only=True)

    class Meta:
        model = InventarioSucursal
        fields = [
            'id',
            'sucursal', # ID para la creación
            'sucursal_nombre',
            'fecha_creacion',
            'ultima_actualizacion_general',
            # 'detalles_bodega', # Descomentar si se quieren todos los detalles anidados
            'stock_consolidado',
            'stock_total_unidades'
        ]
        read_only_fields = ('fecha_creacion', 'ultima_actualizacion_general', 'stock_consolidado', 'stock_total_unidades')

    def create(self, validated_data):
        # Asegurar que solo se cree un InventarioSucursal por sucursal
        sucursal = validated_data.get('sucursal')
        if InventarioSucursal.objects.filter(sucursal=sucursal).exists():
            raise serializers.ValidationError(
                {"sucursal": "Ya existe un inventario general para esta sucursal."}
            )
        return super().create(validated_data)


class DetalleTraspasoStockSerializer(serializers.ModelSerializer):
    # Hacer el ID escribible para que pueda ser usado para identificar instancias existentes en actualizaciones anidadas.
    id = serializers.IntegerField(required=False) 
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    bodega_origen_nombre = serializers.CharField(source='bodega_origen.nombre_completo', read_only=True, allow_null=True) # Asumiendo nombre_completo en Bodega
    bodega_destino_nombre = serializers.CharField(source='bodega_destino.nombre_completo', read_only=True, allow_null=True) # Asumiendo nombre_completo en Bodega

    class Meta:
        model = DetalleTraspasoStock
        fields = [
            'id', # Ahora es explícitamente definido arriba
            'traspaso',
            'producto',
            'producto_nombre',
            'cantidad_solicitada',
            'cantidad_enviada',
            'cantidad_recibida',
            'bodega_origen', 'bodega_origen_nombre',
            'bodega_destino', 'bodega_destino_nombre',
        ]
        read_only_fields = (
            'traspaso', # Marcar como read_only ya que el TraspasoInternoStockSerializer lo asignará.
            'producto_nombre', 'bodega_origen_nombre', 'bodega_destino_nombre', # Estos ya son de solo lectura
            # 'id' ya no es read_only aquí, se maneja por la declaración explícita arriba.
        )

class TraspasoInternoStockSerializer(serializers.ModelSerializer):
    sucursal_origen_nombre = serializers.CharField(source='sucursal_origen.nombre', read_only=True)
    sucursal_destino_nombre = serializers.CharField(source='sucursal_destino.nombre', read_only=True)
    creado_por_detalle = UsuarioSerializer(source='creado_por', read_only=True)
    detalles_traspaso = DetalleTraspasoStockSerializer(many=True) # Para crear y leer detalles anidados

    class Meta:
        model = TraspasoInternoStock
        fields = [
            'id', 'sucursal_origen', 'sucursal_origen_nombre',
            'sucursal_destino', 'sucursal_destino_nombre',
            'fecha_pedido', 'estado', 'motivo', 'comentarios',
            'fecha_envio', 'fecha_recepcion',
            'creado_por', 'creado_por_detalle', 
            'pedido_cliente_origen', # Nuevo campo
            'fecha_creacion', 'fecha_actualizacion',
            'detalles_traspaso'
        ]
        read_only_fields = ('fecha_pedido', 'fecha_creacion', 'fecha_actualizacion', 'creado_por_detalle')

    def create(self, validated_data):
        # Validar que las bodegas de los detalles pertenezcan a las sucursales del traspaso
        sucursal_origen = validated_data.get('sucursal_origen')
        sucursal_destino = validated_data.get('sucursal_destino')
        detalles_data = validated_data.pop('detalles_traspaso')

        for detalle_data in detalles_data:
            if detalle_data.get('bodega_origen').sucursal != sucursal_origen:
                raise serializers.ValidationError(
                    f"La bodega de origen '{detalle_data.get('bodega_origen')}' no pertenece a la sucursal de origen '{sucursal_origen}'."
                )
            if detalle_data.get('bodega_destino').sucursal != sucursal_destino:
                raise serializers.ValidationError(
                    f"La bodega de destino '{detalle_data.get('bodega_destino')}' no pertenece a la sucursal de destino '{sucursal_destino}'."
                )

        traspaso = TraspasoInternoStock.objects.create(**validated_data)
        for detalle_data in detalles_data:
            DetalleTraspasoStock.objects.create(traspaso=traspaso, **detalle_data)
        return traspaso

    def update(self, instance, validated_data):
        print(f"DEBUG SERIALIZER UPDATE (START): instance ID: {instance.id}, validated_data: {validated_data}")
        detalles_data = validated_data.pop('detalles_traspaso', None)
        print(f"DEBUG SERIALIZER UPDATE: detalles_data after pop: {detalles_data}")
        # El estado se actualiza a través de super().update si está en validated_data
        # instance.estado reflejará el estado *antes* de esta actualización aquí.
        # El nuevo estado solicitado está en validated_data.get('estado')

        # Actualizar los campos del TraspasoInternoStock principal
        print(f"DEBUG SERIALIZER UPDATE: Calling super().update for instance ID: {instance.id} with data: {validated_data}")
        instance = super().update(instance, validated_data)

        if detalles_data: # Si el frontend envió detalles para actualizar
            for detalle_data_item in detalles_data:
                detalle_id = detalle_data_item.pop('id', None) # Usamos pop para quitarlo del dict para **kwargs
                
                if not detalle_id:
                    # No se debería permitir crear nuevos detalles en una actualización del traspaso principal
                    # a menos que sea un caso de uso específico.
                    continue

                try:
                    detalle_obj = DetalleTraspasoStock.objects.get(id=detalle_id, traspaso=instance)
                    
                    fields_to_update_in_detalle = []
                    
                    # Actualizar cantidad_enviada si se proporciona
                    if 'cantidad_enviada' in detalle_data_item and detalle_data_item['cantidad_enviada'] is not None:
                        print(f"DEBUG SERIALIZER: Processing 'cantidad_enviada' for Detalle ID {detalle_id}. Value from payload: {detalle_data_item['cantidad_enviada']}")
                        nueva_cantidad_enviada = detalle_data_item['cantidad_enviada']
                        if nueva_cantidad_enviada > detalle_obj.cantidad_solicitada:
                            raise serializers.ValidationError(f"Detalle ID {detalle_id}: Cantidad enviada ({nueva_cantidad_enviada}) no puede ser mayor que la solicitada ({detalle_obj.cantidad_solicitada}).")
                        detalle_obj.cantidad_enviada = nueva_cantidad_enviada
                        fields_to_update_in_detalle.append('cantidad_enviada')
                    elif 'cantidad_enviada' in detalle_data_item: # Presente en payload pero es None
                        print(f"DEBUG SERIALIZER: 'cantidad_enviada' for Detalle ID {detalle_id} is present in payload but is None. Not updating field, will remain: {detalle_obj.cantidad_enviada}")
                    else: # No presente en payload
                        print(f"DEBUG SERIALIZER: 'cantidad_enviada' for Detalle ID {detalle_id} not in payload. Not updating field, will remain: {detalle_obj.cantidad_enviada}")

                    
                    # Actualizar cantidad_recibida si se proporciona
                    if 'cantidad_recibida' in detalle_data_item and detalle_data_item['cantidad_recibida'] is not None:
                        print(f"DEBUG SERIALIZER: Processing 'cantidad_recibida' for Detalle ID {detalle_id}. Value from payload: {detalle_data_item['cantidad_recibida']}")
                        nueva_cantidad_recibida = detalle_data_item['cantidad_recibida']
                        if detalle_obj.cantidad_enviada is not None and nueva_cantidad_recibida > detalle_obj.cantidad_enviada:
                            raise serializers.ValidationError(f"Detalle ID {detalle_id}: Cantidad recibida ({nueva_cantidad_recibida}) no puede ser mayor que la enviada ({detalle_obj.cantidad_enviada}).")
                        detalle_obj.cantidad_recibida = nueva_cantidad_recibida
                        fields_to_update_in_detalle.append('cantidad_recibida')
                    # Similar logging for cantidad_recibida if needed

                    if fields_to_update_in_detalle:
                        print(f"DEBUG SERIALIZER: Fields to update for Detalle ID {detalle_id}: {fields_to_update_in_detalle}")
                        detalle_obj.save(update_fields=fields_to_update_in_detalle)
                        print(f"DEBUG SERIALIZER: Saved DetalleTraspasoStock ID {detalle_obj.id}, cantidad_enviada: {detalle_obj.cantidad_enviada}, cantidad_recibida: {detalle_obj.cantidad_recibida}")
                        
                except DetalleTraspasoStock.DoesNotExist:
                    raise serializers.ValidationError(f"Detalle con ID {detalle_id} no encontrado para este traspaso.")

        return instance