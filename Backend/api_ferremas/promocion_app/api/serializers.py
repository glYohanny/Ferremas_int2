from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from ..models import Promocion
from producto_app.api.serializers import ProductoSerializer, CategoriaSerializer, MarcaSerializer
# Importar los modelos directamente para isinstance checks más limpios
from producto_app.models import Producto as ProductoModel
from producto_app.models import Categoria as CategoriaModel
from producto_app.models import Marca as MarcaModel
class PromocionSerializer(serializers.ModelSerializer):
    tipo_promocion_display = serializers.CharField(source='get_tipo_promocion_display', read_only=True)
    objetivo_promocion_detalle = serializers.SerializerMethodField(read_only=True)
    esta_vigente_display = serializers.BooleanField(source='esta_vigente', read_only=True)

    class Meta:
        model = Promocion
        fields = [
            'id',
            'titulo',
            'descripcion',
            'tipo_promocion',
            'tipo_promocion_display',
            'valor',
            'fecha_inicio',
            'fecha_fin',
            'activo',
            'esta_vigente_display',
            'content_type', # Se envía el ID del ContentType
            'object_id',    # Se envía el ID del objeto (Producto, Categoria, Marca)
            'objetivo_promocion_detalle', # Para mostrar el detalle del objeto asociado
            'codigo_promocional',
            'restricciones',
            'limite_uso_total',
            'usos_actuales',
            'solo_para_clientes_registrados',
        ]
        read_only_fields = ('usos_actuales', 'tipo_promocion_display', 'objetivo_promocion_detalle', 'esta_vigente_display')

    def get_objetivo_promocion_detalle(self, obj):
        """
        Devuelve la representación serializada del objeto al que aplica la promoción.
        """
        if isinstance(obj.objetivo_promocion, ProductoModel):
            return ProductoSerializer(obj.objetivo_promocion).data
        elif isinstance(obj.objetivo_promocion, CategoriaModel):
            return CategoriaSerializer(obj.objetivo_promocion).data
        elif isinstance(obj.objetivo_promocion, MarcaModel):
            return MarcaSerializer(obj.objetivo_promocion).data
        return None

    def validate(self, data):
        """
        Validaciones a nivel de objeto.
        """
        # Validar que content_type y object_id apunten a un objeto existente
        content_type = data.get('content_type')
        object_id = data.get('object_id')

        # Validar que content_type y object_id apunten a un objeto existente si ambos están presentes
        if content_type and object_id:
            try:
                content_type.get_object_for_this_type(pk=object_id)
            except content_type.model_class().DoesNotExist:
                raise serializers.ValidationError(f"No se encontró un objeto del tipo '{content_type}' con ID '{object_id}'.")

        # Validar el campo 'valor' según el 'tipo_promocion'
        tipo_promocion = data.get('tipo_promocion')
        valor = data.get('valor')

        if tipo_promocion == Promocion.TipoPromocion.DESCUENTO_PORCENTAJE:
            if valor is None or not (0 < valor <= 100):
                raise serializers.ValidationError({
                    'valor': "Para descuento porcentual, el valor debe estar entre 1 y 100."
                })
        elif tipo_promocion in [Promocion.TipoPromocion.PRECIO_FIJO, Promocion.TipoPromocion.DESCUENTO_MONTO_FIJO]:
            if valor is None or valor <= 0:
                raise serializers.ValidationError({
                    'valor': f"Para {Promocion.TipoPromocion(tipo_promocion).label}, el valor debe ser mayor que cero."
                })
        elif tipo_promocion in [Promocion.TipoPromocion.DOS_POR_UNO, Promocion.TipoPromocion.REGALO]:
            # Para estos tipos, el valor podría ser opcional o no usarse.
            # Si se proporciona, podrías añadir validaciones específicas si es necesario.
            # Por ahora, permitimos que sea None o cualquier valor si se establece.
            # Si quieres forzar que sea None para estos tipos:
            # if valor is not None:
            #     raise serializers.ValidationError({'valor': "El campo valor no aplica para este tipo de promoción."})
            pass

        return super().validate(data)