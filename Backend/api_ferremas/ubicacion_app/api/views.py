from rest_framework import viewsets, permissions
from django_filters.rest_framework import DjangoFilterBackend
from ..models import Region, Comuna
from .serializers import RegionSerializer, ComunaSerializer

class RegionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para listar todas las regiones.
    """
    queryset = Region.objects.all().order_by('nombre')
    serializer_class = RegionSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

class ComunaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para listar comunas. Permite filtrar por región.
    Ejemplo de uso: /api/ubicaciones/comunas/?region=5
    """
    queryset = Comuna.objects.select_related('region').all().order_by('nombre')
    serializer_class = ComunaSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['region']