from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters as drf_filters

from .serializers import SucursalSerializer, BodegaSerializer, TipoBodegaSerializer
from ..models import Sucursal, Bodega, TipoBodega

class SucursalViewSet(viewsets.ModelViewSet):
    queryset = Sucursal.objects.all()
    serializer_class = SucursalSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter]
    search_fields = ['nombre', 'direccion']
    ordering_fields = ['nombre', 'fecha_registro']

    @action(detail=True, methods=['get'])
    def bodegas(self, request, pk=None):
        """
        Obtiene todas las bodegas activas de una sucursal específica.
        """
        try:
            sucursal = self.get_object()
            bodegas = Bodega.objects.filter(
                sucursal=sucursal,
                is_active=True
            ).select_related('tipo_bodega')
            
            serializer = BodegaSerializer(bodegas, many=True)
            return Response(serializer.data)
        except Sucursal.DoesNotExist:
            return Response(
                {"error": "Sucursal no encontrada"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class BodegaViewSet(viewsets.ModelViewSet):
    queryset = Bodega.objects.all()
    serializer_class = BodegaSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter]
    filterset_fields = ['sucursal', 'tipo_bodega', 'is_active']
    search_fields = ['direccion']
    ordering_fields = ['sucursal__nombre', 'tipo_bodega__tipo']

class TipoBodegaViewSet(viewsets.ModelViewSet):
    queryset = TipoBodega.objects.all()
    serializer_class = TipoBodegaSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter]
    search_fields = ['tipo']
    ordering_fields = ['tipo']