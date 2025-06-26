from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PedidoClienteViewSet,
    DetallePedidoClienteViewSet,
    PedidoProveedorViewSet,
    DetallePedidoProveedorViewSet,
    HistorialEntregasViewSet,
    VendedorPedidosActivosAPIView
)

app_name = 'pedido_app'

router = DefaultRouter()
router.register(r'pedidos-cliente', PedidoClienteViewSet, basename='pedidocliente')
router.register(r'detalles-pedido-cliente', DetallePedidoClienteViewSet, basename='detallepedidocliente')
router.register(r'pedidos-proveedor', PedidoProveedorViewSet, basename='pedidoproveedor')
router.register(r'detalles-pedido-proveedor', DetallePedidoProveedorViewSet, basename='detallepedidoproveedor')
router.register(r'historial-entregas', HistorialEntregasViewSet, basename='historialentregas')

urlpatterns = [
    path('', include(router.urls)),
    path('vendedor/pedidos-activos/', VendedorPedidosActivosAPIView.as_view(), name='vendedor-pedidos-activos'),
]