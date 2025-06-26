from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConfiguracionApiExternaViewSet

app_name = 'integracion_app'

router = DefaultRouter()
router.register(r'configuraciones-api', ConfiguracionApiExternaViewSet, basename='configuracionapi')

urlpatterns = [
    path('', include(router.urls)),
]