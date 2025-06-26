from rest_framework import viewsets, permissions, filters
from .serializers import (
    SucursalSerializer, SucursalCreateUpdateSerializer,
    BodegaSerializer, BodegaCreateUpdateSerializer,
    TipoBodegaSerializer
)
from ..models import Sucursal, Bodega, TipoBodega

class TipoBodegaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar los tipos de bodega.
    """
    queryset = TipoBodega.objects.all()
    serializer_class = TipoBodegaSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]  # Ejemplo: Solo autenticados pueden crear/editar
    # Ajusta los permisos según tus necesidades (ej., IsAdminUser para restringir a administradores).

    # Opcional:  Si quieres personalizar el comportamiento (ej., añadir validaciones, restringir el
    # borrado), puedes sobrescribir métodos como create(), update(), destroy().

class SucursalViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar las sucursales.
    """
    queryset = Sucursal.objects.all()
    # Ajusta los permisos según tus necesidades.
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'region__nombre', 'comuna__nombre']  # Habilita búsqueda por nombre, región y comuna
    # Ejemplo: Solo autenticados pueden crear/editar, pero todos pueden leer.
    permission_classes = [permissions.IsAuthenticatedOrReadOnly] 
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return SucursalCreateUpdateSerializer
        return SucursalSerializer

    # Recomendación:  Para optimizar las consultas, podrías usar select_related() para precargar los
    # objetos relacionados (region, comuna) si los usas frecuentemente en la serialización o en la vista.
    def get_queryset(self):
        queryset = super().get_queryset().select_related('region', 'comuna')
        # Para el listado general que se usa en los dropdowns del frontend,
        # es mejor devolver solo las sucursales activas.
        # Si un admin necesitara ver todas, se podría añadir un filtro como ?activo=all
        if self.action == 'list':
            return queryset.filter(is_active=True)
        return queryset

    # Opcional:  Si quieres un comportamiento personalizado en la creación o actualización (ej.,
    # validaciones adicionales), puedes sobrescribir los métodos create() y update().

class BodegaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar las bodegas.
    """
    queryset = Bodega.objects.all()
    # Ajusta los permisos según tus necesidades.
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['sucursal__nombre', 'tipo_bodega__tipo', 'direccion']  # Permite buscar por sucursal, tipo y dirección
    ordering_fields = ['sucursal__nombre', 'tipo_bodega__tipo']  # Permite ordenar por sucursal y tipo
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return BodegaCreateUpdateSerializer
        return BodegaSerializer

    # Recomendación: Similar a SucursalViewSet, usa select_related() para precargar sucursal y tipo_bodega.
    def get_queryset(self):
        return super().get_queryset().select_related('sucursal', 'tipo_bodega')