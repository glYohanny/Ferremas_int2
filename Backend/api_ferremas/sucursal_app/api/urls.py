from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SucursalViewSet, BodegaViewSet, TipoBodegaViewSet



app_name = 'sucursal_app'

router = DefaultRouter()
router.register(r'tipos-bodega', TipoBodegaViewSet, basename='tipobodega')
router.register(r'sucursales', SucursalViewSet, basename='sucursal')
router.register(r'bodegas', BodegaViewSet, basename='bodega')

urlpatterns = [
    path('', include(router.urls)),
]

# Recomendación:  Podrías agregar rutas adicionales fuera del ViewSet si necesitas endpoints muy
# específicos (ej., obtener todas las bodegas de un tipo en particular).  En ese caso, define una vista
# de función o una clase basada en vistas de DRF y añádela aquí con path().