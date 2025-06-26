from rest_framework import serializers
from django.utils import timezone
from ..models import MensajeContacto
from usuario_app.api.serializers import UsuarioSerializer # Para mostrar detalles de 'atendido_por'

class MensajeContactoSerializer(serializers.ModelSerializer):
    atendido_por_detalle = UsuarioSerializer(source='atendido_por', read_only=True)

    class Meta:
        model = MensajeContacto
        fields = [
            'id',
            'nombre_completo',
            'email',
            'asunto',
            'mensaje',
            'fecha_envio',
            'leido',
            'respondido',
            'fecha_respuesta',
            'respuesta_admin',
            'atendido_por', # ID para asignar
            'atendido_por_detalle', # Detalles para mostrar
        ]
        read_only_fields = ('fecha_envio', 'fecha_respuesta', 'atendido_por_detalle')
        # 'atendido_por' será escribible por staff.
        # 'leido', 'respondido', 'respuesta_admin' serán escribibles por staff.

    def create(self, validated_data):
        # Si el usuario está autenticado y es un cliente, podríamos pre-rellenar
        # nombre_completo y email si no se envían.
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if not validated_data.get('email'):
                validated_data['email'] = request.user.email
            if not validated_data.get('nombre_completo') and hasattr(request.user, 'perfil_cliente'):
                validated_data['nombre_completo'] = request.user.get_full_name() or request.user.email
            elif not validated_data.get('nombre_completo'):
                 validated_data['nombre_completo'] = request.user.get_full_name() or request.user.username

        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Si se marca como respondido y no hay fecha_respuesta, la establecemos.
        if validated_data.get('respondido') and not instance.respondido and not validated_data.get('fecha_respuesta'):
            validated_data['fecha_respuesta'] = timezone.now()
        
        # Si se asigna 'atendido_por' y no estaba asignado, o cambia.
        # (La lógica de quién puede asignar 'atendido_por' va en los permisos/vista)
        return super().update(instance, validated_data)