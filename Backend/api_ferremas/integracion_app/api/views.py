from rest_framework import viewsets, permissions
from rest_framework import filters as drf_filters
from django_filters.rest_framework import DjangoFilterBackend

from ..models import ConfiguracionApiExterna
from .serializers import ConfiguracionApiExternaSerializer
# from .filters import ConfiguracionApiExternaFilter # Si creas filtros específicos

class ConfiguracionApiExternaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar las Configuraciones de APIs Externas.
    Permite CRUD completo. Las credenciales sensibles como 'api_secret' son write-only.
    """
    queryset = ConfiguracionApiExterna.objects.all()
    serializer_class = ConfiguracionApiExternaSerializer
    permission_classes = [permissions.IsAdminUser] # Solo administradores pueden gestionar estas configuraciones

    filter_backends = [
        # DjangoFilterBackend, # Descomentar si usas filterset_class
        drf_filters.SearchFilter,
        drf_filters.OrderingFilter
    ]
    # filterset_class = ConfiguracionApiExternaFilter # Si creas filtros específicos
    search_fields = ['nombre_integracion', 'descripcion', 'tipo', 'base_url']
    ordering_fields = ['nombre_integracion', 'tipo', 'activa', 'fecha_actualizacion']