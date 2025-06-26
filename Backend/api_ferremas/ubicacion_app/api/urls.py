from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegionViewSet, ComunaViewSet

router = DefaultRouter()
router.register(r'regiones', RegionViewSet, basename='region')
router.register(r'comunas', ComunaViewSet, basename='comuna')

app_name = 'ubicacion_app'  #  Añade el namespace

urlpatterns = [
    path('', include(router.urls)),
]