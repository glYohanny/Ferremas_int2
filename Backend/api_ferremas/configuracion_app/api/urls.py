from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConfiguracionGlobalViewSet

app_name = 'configuracion_app'

router = DefaultRouter()
# El ViewSet personalizado no se registra como un ModelViewSet típico.
# Usaremos la acción 'actual' para la lectura pública.
router.register(r'configuraciones', ConfiguracionGlobalViewSet, basename='configuracionglobal')

urlpatterns = [
    path('', include(router.urls)),
]