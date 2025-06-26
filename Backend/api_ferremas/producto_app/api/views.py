from rest_framework import viewsets, permissions, generics
from rest_framework import filters as drf_filters # Renombrado para evitar conflicto con un posible 'filters.py' local
from django_filters.rest_framework import DjangoFilterBackend

from ..models import Categoria, Marca, Producto
from .serializers import CategoriaSerializer, MarcaSerializer, ProductoSerializer, ProductoCatalogoSerializer
from .filters import ProductoFilter # Descomenta cuando crees ProductoFilter
from pedido_app.api.pagination import CustomPagination

class ProductoCatalogoAPIView(generics.ListAPIView):
    """
    Endpoint para que los Vendedores y otro personal vean un catálogo rápido de productos.
    Permite buscar por nombre, SKU, etc.
    """
    # Optimización: precargar marca y categoría para evitar N+1 si se usan en el serializer
    queryset = Producto.objects.select_related('marca', 'categoria').all().order_by('nombre')
    serializer_class = ProductoCatalogoSerializer
    permission_classes = [permissions.IsAuthenticated] # Solo usuarios autenticados pueden ver el catálogo
    pagination_class = CustomPagination
    filter_backends = [
        drf_filters.SearchFilter,
        drf_filters.OrderingFilter
    ]
    search_fields = ['nombre', 'sku', 'descripcion', 'categoria__nombre', 'marca__nombre']
    ordering_fields = ['nombre', 'precio']
    
class CategoriaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar las Categorías de productos.
    Permite CRUD completo.
    """
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [permissions.IsAdminUser] # Solo administradores pueden gestionar categorías
    filter_backends = [drf_filters.SearchFilter, drf_filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre']
    # La paginación se tomará de la configuración global en settings.py si está definida.

class MarcaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar las Marcas de productos.
    Permite CRUD completo.
    """
    queryset = Marca.objects.all()
    serializer_class = MarcaSerializer
    permission_classes = [permissions.IsAdminUser] # Solo administradores pueden gestionar marcas
    filter_backends = [drf_filters.SearchFilter, drf_filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre']

class ProductoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar los Productos.
    Permite CRUD completo y listado con filtros.
    """
    queryset = Producto.objects.select_related('marca', 'categoria').all() # Optimización
    serializer_class = ProductoSerializer
    # Por defecto, permitimos leer a cualquiera, pero solo autenticados (y admins) pueden modificar.
    # Ajusta según tus necesidades. Por ejemplo, podrías querer que solo admins creen/modifiquen.
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    filter_backends = [
        DjangoFilterBackend,       # Para usar filtros definidos en un FilterSet (que crearemos)
        drf_filters.SearchFilter,  # Para búsqueda general con ?search=
        drf_filters.OrderingFilter # Para ?ordering=
    ]
    filterset_class = ProductoFilter # Descomenta cuando crees ProductoFilter
    search_fields = ['nombre', 'descripcion', 'marca__nombre', 'categoria__nombre'] # Búsqueda general
    ordering_fields = ['nombre', 'precio', 'fecha_creacion'] # Campos por los que se puede ordenar
    # ordering = ['-fecha_creacion'] # Orden por defecto