from rest_framework import serializers
from ..models import Categoria, Marca, Producto
from django.db.models import Sum
from inventario_app.models import DetalleInventarioBodega # Asegúrate que la ruta de importación sea correcta

class ProductoCatalogoSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para el catálogo de productos del vendedor.
    """
    precio_final = serializers.SerializerMethodField()
    stock_total = serializers.SerializerMethodField()

    class Meta:
        model = Producto
        fields = ['id', 'nombre', 'sku', 'precio_final', 'stock_total', 'imagen']

    def get_precio_final(self, obj: Producto) -> str:
        precio, _ = obj.precio_final_con_info_promo
        return f"{precio:.2f}"

    def get_stock_total(self, obj: Producto) -> int:
        """
        Calcula y devuelve el stock total sumando las cantidades de todas las bodegas.
        """
        total = DetalleInventarioBodega.objects.filter(producto=obj).aggregate(
            total_stock=Sum('cantidad')
        )['total_stock']
        return total or 0

class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ['id', 'nombre']

class MarcaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Marca
        fields = ['id', 'nombre']

class ProductoSerializer(serializers.ModelSerializer):
    # Para mostrar los nombres en lugar de solo los IDs en las respuestas de lectura
    marca_nombre = serializers.CharField(source='marca.nombre', read_only=True, allow_null=True)
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True, allow_null=True)

    # El campo 'precio_original' ahora se usa para leer y escribir el precio base.
    # Se mapea al campo 'precio' del modelo.
    precio_original = serializers.DecimalField(source='precio', max_digits=10, decimal_places=2)
    precio_final = serializers.SerializerMethodField()
    stock_info = serializers.SerializerMethodField() # Nuevo campo para el stock
    info_promocion_aplicada = serializers.SerializerMethodField()

    class Meta:
        model = Producto
        fields = [
            'id',
            'nombre',
            'sku', # Añadido SKU que estaba en el modelo
            'marca', # Se usa para enviar el ID al crear/actualizar
            'marca_nombre', # Se muestra en la lectura
            'categoria', # Se usa para enviar el ID al crear/actualizar
            'categoria_nombre', # Se muestra en la lectura
            'precio_original', # El precio base del producto
            'precio_final',    # Precio con la mejor promoción aplicada
            'stock_info',      # Información de stock por sucursal
            'info_promocion_aplicada', # Detalles de la promoción aplicada
            'descripcion',
            'imagen',
            'fecha_creacion',
            'fecha_actualizacion',
        ]
        read_only_fields = ('fecha_creacion', 'fecha_actualizacion', 'marca_nombre', 'categoria_nombre')
        # 'imagen' es opcional al crear/actualizar, por lo que no necesita estar en write_only_fields a menos que tengas una lógica específica.

    def get_stock_info(self, obj: Producto) -> dict:
        """
        Devuelve un diccionario con el stock total del producto por ID de sucursal.
        Ej: {1: 50, 2: 30} (sucursal_id: cantidad_total)
        """
        stock_data = DetalleInventarioBodega.objects.filter(
            producto=obj
        ).values(
            'bodega__sucursal_id'  # Agrupa por el ID de la sucursal a través de la bodega
        ).annotate(
            total_cantidad=Sum('cantidad')
        ).order_by('bodega__sucursal_id')

        return {item['bodega__sucursal_id']: item['total_cantidad'] 
                for item in stock_data if item['bodega__sucursal_id'] is not None and item['total_cantidad'] is not None}

    def get_precio_final(self, obj: Producto) -> str:
        precio, _ = obj.precio_final_con_info_promo
        return f"{precio:.2f}" # Devolver como string formateado con 2 decimales

    def get_info_promocion_aplicada(self, obj: Producto):
        _, promo = obj.precio_final_con_info_promo
        if promo:
            return {
                'id': promo.id,
                'titulo': promo.titulo,
                'tipo_promocion_display': promo.get_tipo_promocion_display(),
                'valor': promo.valor
            }
        return None