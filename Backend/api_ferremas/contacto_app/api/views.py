from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters as drf_filters

from ..models import MensajeContacto
from .serializers import MensajeContactoSerializer
from .permissions import IsOwnerOrStaffForContacto
from bitacora_app.utils import crear_registro_actividad # Para bitácora
from usuario_app.models import Personal # Para roles

class MensajeContactoViewSet(viewsets.ModelViewSet):
    queryset = MensajeContacto.objects.select_related('atendido_por').all()
    serializer_class = MensajeContactoSerializer
    permission_classes = [IsOwnerOrStaffForContacto] # Permiso base

    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter]
    filterset_fields = ['leido', 'respondido', 'atendido_por', 'email']
    search_fields = ['nombre_completo', 'email', 'asunto', 'mensaje', 'respuesta_admin']
    ordering_fields = ['fecha_envio', 'leido', 'respondido']

    def get_permissions(self):
        # Permitir a cualquiera crear un mensaje
        if self.action == 'create':
            return [permissions.AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        if user.is_authenticated:
            if hasattr(user, 'perfil_personal') and \
               user.perfil_personal and \
               user.perfil_personal.rol in [Personal.Roles.ADMINISTRADOR, Personal.Roles.VENDEDOR]:
                return queryset # Staff ve todos
            else:
                # Cliente autenticado ve los mensajes que coinciden con su email
                return queryset.filter(email=user.email)
        
        # Usuarios no autenticados no pueden listar (solo crear)
        return queryset.none()

    def perform_create(self, serializer):
        mensaje = serializer.save()
        crear_registro_actividad(
            usuario=self.request.user if self.request.user.is_authenticated else None,
            accion="CREAR_MENSAJE_CONTACTO",
            descripcion=f"Nuevo mensaje de contacto de '{mensaje.email}'. Asunto: {mensaje.asunto}",
            objeto_relacionado=mensaje,
            request=self.request
        )

    def perform_update(self, serializer):
        mensaje_original = self.get_object()
        mensaje_actualizado = serializer.save()

        # Lógica para bitácora en actualización
        descripcion_bitacora = f"Mensaje de contacto #{mensaje_actualizado.id} actualizado por {self.request.user.email}."
        cambios = []
        if mensaje_original.leido != mensaje_actualizado.leido:
            cambios.append(f"Leído: {'Sí' if mensaje_actualizado.leido else 'No'}")
        if mensaje_original.respondido != mensaje_actualizado.respondido:
            cambios.append(f"Respondido: {'Sí' if mensaje_actualizado.respondido else 'No'}")
        if mensaje_original.respuesta_admin != mensaje_actualizado.respuesta_admin and mensaje_actualizado.respuesta_admin:
            cambios.append("Respuesta actualizada.")
        if mensaje_original.atendido_por != mensaje_actualizado.atendido_por:
            cambios.append(f"Atendido por: {mensaje_actualizado.atendido_por.email if mensaje_actualizado.atendido_por else 'Nadie'}")
        
        if cambios:
            descripcion_bitacora += " Cambios: " + ", ".join(cambios)

        crear_registro_actividad(
            usuario=self.request.user,
            accion="ACTUALIZAR_MENSAJE_CONTACTO",
            descripcion=descripcion_bitacora,
            objeto_relacionado=mensaje_actualizado,
            request=self.request
        )

    # Podrías añadir acciones personalizadas como @action(detail=True, methods=['post']) def responder(...)
    # si quieres un endpoint específico para esa acción, pero el update normal ya lo permite.
