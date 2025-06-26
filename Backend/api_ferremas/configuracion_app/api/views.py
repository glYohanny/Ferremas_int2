from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action

from ..models import ConfiguracionGlobal
from .serializers import ConfiguracionGlobalSerializer

class ConfiguracionGlobalViewSet(viewsets.ViewSet):
    """
    ViewSet para gestionar la Configuración Global del sistema.
    Permite obtener y actualizar la única instancia de configuración.
    """
    permission_classes = [permissions.IsAdminUser] # Solo administradores pueden modificar
    serializer_class = ConfiguracionGlobalSerializer

    def get_object(self):
        # Obtener la única instancia de ConfiguracionGlobal, o crearla si no existe.
        # La creación aquí es un fallback, idealmente se crea desde el admin la primera vez.
        obj, created = ConfiguracionGlobal.objects.get_or_create(defaults={'_singleton': True})
        return obj

    def list(self, request):
        # Redirigir 'list' a 'retrieve' la única instancia.
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    # No se necesita 'retrieve' explícito si 'list' hace esto.
    # Pero para ser más explícito con un endpoint /configuracion/actual/
    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny]) # Permitir a cualquiera leer
    def actual(self, request):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def update(self, request, pk=None): # pk no se usa realmente aquí
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def partial_update(self, request, pk=None): # pk no se usa realmente aquí
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    # No se implementan create() ni destroy() para mantener el singleton.