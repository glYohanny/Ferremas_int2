from rest_framework import serializers
from ..models import Proveedor, Comuna
from ubicacion_app.api.serializers import ComunaSerializer

class ProveedorSerializer(serializers.ModelSerializer):
    comuna_detalle = ComunaSerializer(source='comuna', read_only=True)
    # Hacemos explícito el campo 'comuna' para asegurar que se maneje correctamente
    # tanto para lectura (enviar el ID al frontend) como para escritura (recibir el ID).
    comuna = serializers.PrimaryKeyRelatedField(
        queryset=Comuna.objects.all(),
        # No usamos write_only=True porque el frontend necesita leer el ID
        # para pre-seleccionar la comuna en el modo de edición.
    )

    class Meta:
        model = Proveedor
        fields = [
            'id',
            'razon_social',
            'rut',
            'nombre_fantasia',
            'direccion',
            'comuna', # Ahora es un campo explícito
            'comuna_detalle', # Para mostrar el objeto completo al leer
            'telefono',
            'email',
            'nombre_contacto',
            'banco',
            'tipo_cuenta',
            'numero_cuenta',
            'moneda',
            'activo',
            'fecha_registro',
            'condiciones_pago',
            'contrato',
            'fecha_inicio_relacion' # Asegurándonos de que este campo esté incluido
        ]
        read_only_fields = ('fecha_registro', 'comuna_detalle')