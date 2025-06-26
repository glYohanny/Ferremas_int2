import django_filters
from ..models import Producto, Categoria, Marca

class ProductoFilter(django_filters.FilterSet):
    # Filtrar por nombre (búsqueda parcial, insensible a mayúsculas/minúsculas)
    nombre = django_filters.CharFilter(lookup_expr='icontains', label='Nombre del producto contiene')

    # Filtrar por categoría y marca usando sus IDs
    categoria = django_filters.ModelChoiceFilter(queryset=Categoria.objects.all(), label='Categoría')
    marca = django_filters.ModelChoiceFilter(queryset=Marca.objects.all(), label='Marca')

    # Filtrar por rango de precios
    precio_min = django_filters.NumberFilter(field_name="precio", lookup_expr='gte', label='Precio mínimo')
    precio_max = django_filters.NumberFilter(field_name="precio", lookup_expr='lte', label='Precio máximo')

    # Podrías añadir más filtros, por ejemplo, por disponibilidad si tuvieras un campo 'activo'
    # activo = django_filters.BooleanFilter(field_name='activo', label='Está activo')

    class Meta:
        model = Producto
        fields = ['nombre', 'categoria', 'marca', 'precio_min', 'precio_max']
