from rest_framework import viewsets, permissions
from rest_framework import filters as drf_filters
from django_filters.rest_framework import DjangoFilterBackend

from ..models import Proveedor
from .serializers import ProveedorSerializer
# from .filters import ProveedorFilter # Descomentar si creas filtros específicos

class ProveedorViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar Proveedores.
    Permite CRUD completo y listado con filtros básicos.
    """
    queryset = Proveedor.objects.select_related('comuna', 'comuna__region').all() # Optimización para comuna y región
    serializer_class = ProveedorSerializer
    permission_classes = [permissions.IsAdminUser] # Solo administradores pueden gestionar proveedores

    filter_backends = [
        DjangoFilterBackend,
        drf_filters.SearchFilter,
        drf_filters.OrderingFilter
    ]
    # Habilita el filtrado por campos específicos
    filterset_fields = ['activo', 'comuna', 'comuna__region']
    search_fields = ['razon_social', 'rut', 'nombre_fantasia', 'comuna__nombre', 'comuna__region__nombre']
    ordering_fields = ['razon_social', 'rut', 'nombre_fantasia', 'fecha_registro']

    def create(self, request, *args, **kwargs):
        print("DEBUG: Solicitud POST recibida en ProveedorViewSet.create")
        print(f"DEBUG: Datos de la solicitud: {request.data}")
        return super().create(request, *args, **kwargs)