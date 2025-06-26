import django_filters
from ..models import InventarioSucursal, DetalleInventarioBodega, TraspasoInternoStock
from sucursal_app.models import Sucursal, Bodega
from producto_app.models import Producto

class InventarioSucursalFilter(django_filters.FilterSet):
    sucursal = django_filters.ModelChoiceFilter(queryset=Sucursal.objects.all(), label="Sucursal")

    class Meta:
        model = InventarioSucursal
        fields = ['sucursal']

class DetalleInventarioBodegaFilter(django_filters.FilterSet):
    # Filtrar por la sucursal a través del inventario_sucursal
    sucursal = django_filters.ModelChoiceFilter(
        field_name='inventario_sucursal__sucursal',
        queryset=Sucursal.objects.all(),
        label="Sucursal"
    )
    bodega = django_filters.ModelChoiceFilter(queryset=Bodega.objects.all(), label="Bodega")
    producto = django_filters.ModelChoiceFilter(queryset=Producto.objects.all(), label="Producto")

    class Meta:
        model = DetalleInventarioBodega
        fields = ['sucursal', 'bodega', 'producto']

# Podrías añadir filtros para TraspasoInternoStock aquí si es necesario
# por ejemplo, por sucursal_origen, sucursal_destino, estado, etc.