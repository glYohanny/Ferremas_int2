from rest_framework import serializers
from ..models import ReporteConfigurado
from usuario_app.api.serializers import UsuarioSerializer # Asumiendo que este es tu serializer para el AUTH_USER_MODEL

class ReporteConfiguradoSerializer(serializers.ModelSerializer):
    categoria_display = serializers.CharField(source='get_categoria_display', read_only=True)
    formato_salida_preferido_display = serializers.CharField(source='get_formato_salida_preferido_display', read_only=True)
    creado_por_detalle = UsuarioSerializer(source='creado_por', read_only=True, allow_null=True)

    class Meta:
        model = ReporteConfigurado
        fields = [
            'id',
            'nombre',
            'descripcion',
            'categoria',
            'categoria_display',
            'tipo_especifico',
            'parametros', # JSONField se maneja bien por defecto
            'formato_salida_preferido',
            'formato_salida_preferido_display',
            'creado_por', # Se envía el ID al crear/actualizar si no se asigna automáticamente
            'creado_por_detalle',
            'fecha_creacion',
            'fecha_actualizacion',
            'ultima_ejecucion',
        ]
        read_only_fields = (
            'fecha_creacion',
            'fecha_actualizacion',
            'ultima_ejecucion', # Generalmente se actualiza por un proceso, no por el usuario directamente
            'categoria_display',
            'formato_salida_preferido_display',
            'creado_por_detalle',
        )

    # Podrías añadir validaciones para el campo 'parametros' si necesitas
    # asegurar una estructura JSON específica.
    # def validate_parametros(self, value):
    #     # ... tu lógica de validación ...
    #     return value