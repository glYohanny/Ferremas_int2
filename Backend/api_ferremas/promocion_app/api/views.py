from rest_framework import viewsets, permissions
from rest_framework import filters as drf_filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status # Renombrar para evitar conflicto
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.contenttypes.models import ContentType

from ..models import Promocion
from .serializers import PromocionSerializer
from .filters import PromocionFilter
# Asegúrate de que la ruta de importación sea correcta para tus modelos de producto_app
from producto_app.models import Producto as ProductoModel, Categoria as CategoriaModel, Marca as MarcaModel

class PromocionViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar Promociones.
    Permite CRUD completo y listado con filtros.
    La activación/desactivación se maneja actualizando el campo 'activo'.
    La asignación a Producto/Marca/Categoría se maneja con 'content_type' y 'object_id'.
    """
    queryset = Promocion.objects.select_related('content_type').all() # Optimización
    serializer_class = PromocionSerializer
    permission_classes = [permissions.IsAdminUser] # Solo administradores pueden gestionar promociones

    filter_backends = [
        DjangoFilterBackend,
        drf_filters.SearchFilter,
        drf_filters.OrderingFilter
    ]
    filterset_class = PromocionFilter
    search_fields = ['titulo', 'descripcion', 'codigo_promocional']
    ordering_fields = ['titulo', 'tipo_promocion', 'fecha_inicio', 'fecha_fin', 'activo']

class TipoPromocionChoicesView(APIView):
    """
    Devuelve las opciones disponibles para el campo 'tipo_promocion' del modelo Promocion.
    """
    permission_classes = [permissions.IsAuthenticated] # O IsAdminUser si solo admins pueden ver esto

    def get(self, request, *args, **kwargs):
        tipos = [{'value': choice[0], 'label': choice[1]} for choice in Promocion.TipoPromocion.choices]
        return Response(tipos)

class PromocionContentTypeListView(APIView):
    """
    Devuelve una lista de los ContentTypes a los que se pueden aplicar promociones.
    """
    permission_classes = [permissions.IsAuthenticated] # O IsAdminUser si solo admins pueden ver esto

    def get(self, request, *args, **kwargs):
        # Modelos a los que pueden aplicar las promociones
        # Estos deben coincidir con los definidos en `limit_choices_to` del modelo Promocion
        # o con los que lógicamente quieres permitir.
        modelos_promocionables = [ProductoModel, CategoriaModel, MarcaModel]
        
        content_types_data = []
        for modelo in modelos_promocionables:
            try:
                ct = ContentType.objects.get_for_model(modelo)
                content_types_data.append({
                    'id': ct.id,
                    'name': modelo._meta.model_name, # ej: 'producto', 'categoria', 'marca'
                    'verbose_name': modelo._meta.verbose_name_plural.capitalize() # ej: 'Productos', 'Categorías', 'Marcas'
                })
            except ContentType.DoesNotExist:
                # Este caso es raro si los modelos están bien definidos y migrados.
                pass
        
        return Response(content_types_data, status=http_status.HTTP_200_OK)
