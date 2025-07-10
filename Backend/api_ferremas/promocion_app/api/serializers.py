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

    # Campo para leer los detalles del producto de regalo (solo lectura)
    producto_regalo_detalle = ProductoSerializer(source='producto_regalo', read_only=True)
    # Campo para escribir el ID del producto de regalo (escritura)
    producto_regalo = serializers.PrimaryKeyRelatedField(
        queryset=ProductoModel.objects.all(),
        allow_null=True,
        required=False, # Se maneja en la validación
        write_only=True # No mostrar el ID en la respuesta, solo el detalle
    )

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
            'producto_regalo', # Campo de escritura
            'producto_regalo_detalle', # Campo de lectura
        ]
        read_only_fields = ('usos_actuales',) # Simplificado

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
        content_type = data.get('content_type')
        object_id = data.get('object_id')

        # Validar que content_type y object_id apunten a un objeto existente si ambos están presentes
        if content_type and object_id:
            try:
                content_type.get_object_for_this_type(pk=object_id)
            except content_type.model_class().DoesNotExist:
                raise serializers.ValidationError(f"No se encontró un objeto del tipo '{content_type}' con ID '{object_id}'.")

        # Validar el campo 'valor' y 'producto_regalo' según el 'tipo_promocion'
        tipo_promocion = data.get('tipo_promocion')
        valor = data.get('valor')
        producto_regalo = data.get('producto_regalo')

        # Validación para 'valor'
        tipos_que_requieren_valor = [
            Promocion.TipoPromocion.DESCUENTO_PORCENTAJE,
            Promocion.TipoPromocion.PRECIO_FIJO,
            Promocion.TipoPromocion.DESCUENTO_MONTO_FIJO
        ]
        if tipo_promocion in tipos_que_requieren_valor:
            if valor is None or valor <= 0:
                raise serializers.ValidationError({
                    'valor': f"Para el tipo de promoción '{Promocion.TipoPromocion(tipo_promocion).label}', el valor debe ser positivo."
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