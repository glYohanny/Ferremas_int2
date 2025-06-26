from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InventarioSucursalViewSet,
    DetalleInventarioBodegaViewSet,
    TraspasoInternoStockViewSet,
    DetalleTraspasoStockViewSet,
    ResumenStockBodegueroView, # Nueva importación
    AjusteManualStockView
)

app_name = 'inventario_app'

router = DefaultRouter()
router.register(r'inventarios-sucursal', InventarioSucursalViewSet, basename='inventariosucursal')
router.register(r'detalles-inventario-bodega', DetalleInventarioBodegaViewSet, basename='detalleinventariobodega')
router.register(r'traspasos-internos', TraspasoInternoStockViewSet, basename='traspasointernostock')
router.register(r'detalles-traspaso', DetalleTraspasoStockViewSet, basename='detalletraspasostock')

urlpatterns = [
    path('', include(router.urls)),
    path('resumen-stock-bodeguero/', ResumenStockBodegueroView.as_view(), name='resumen-stock-bodeguero'), # Nueva URL
    path('ajuste-manual-stock/', AjusteManualStockView.as_view(), name='ajuste-manual-stock'),
]