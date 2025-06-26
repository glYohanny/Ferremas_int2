from rest_framework import serializers
from ..models import ConfiguracionApiExterna

class ConfiguracionApiExternaSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)

    class Meta:
        model = ConfiguracionApiExterna
        fields = [
            'id',
            'nombre_integracion',
            'descripcion',
            'tipo',
            'tipo_display',
            'base_url',
            'api_key',
            # 'api_secret', # Considerar la seguridad de exponer esto directamente
            'configuracion_adicional',
            'activa',
            'fecha_creacion',
            'fecha_actualizacion',
        ]
        read_only_fields = (
            'fecha_creacion',
            'fecha_actualizacion',
            'tipo_display',
        )
        extra_kwargs = {
            'api_secret': {'write_only': True, 'required': False, 'allow_blank': True, 'allow_null': True},
            # 'api_key': {'write_only': True, 'required': False, 'allow_blank': True, 'allow_null': True} # Si también quieres que sea write_only
        }

    def create(self, validated_data):
        # Aquí podrías añadir lógica para encriptar api_secret antes de guardarlo si es necesario
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Aquí podrías añadir lógica para encriptar api_secret si se actualiza
        return super().update(instance, validated_data)