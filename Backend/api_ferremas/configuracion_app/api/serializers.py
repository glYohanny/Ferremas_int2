from rest_framework import serializers
from ..models import ConfiguracionGlobal

class ConfiguracionGlobalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionGlobal
        fields = [
            'id', # Aunque sea singleton, el objeto tiene un ID
            'nombre_empresa',
            'rut_empresa',
            'direccion_empresa',
            'telefono_contacto',
            'email_contacto',
            'logo_empresa',
            'porcentaje_iva',
            'monto_minimo_despacho_gratuito',
            'url_terminos_condiciones',
            'url_politica_privacidad',
            'modo_mantenimiento',
            'mensaje_mantenimiento',
            'fecha_actualizacion',
        ]
        read_only_fields = [
            'id',
            'fecha_actualizacion',
            # Considera hacer todos los campos read_only si la API solo los expone
            # y la edición se hace exclusivamente desde el panel de admin.
            # Si necesitas que la API permita modificar la configuración (con permisos adecuados),
            # entonces no los pongas todos en read_only_fields.
            # Por ahora, solo los que se actualizan automáticamente o son PK.
        ]

    def update(self, instance, validated_data):
        # El patrón Singleton se maneja en el modelo y en el admin.
        # Aquí, simplemente actualizamos la instancia existente.
        # No se permite 'create' a través de la API si se sigue el patrón singleton estrictamente.
        return super().update(instance, validated_data)