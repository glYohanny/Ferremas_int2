from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProveedorViewSet

app_name = 'proveedor_app'

router = DefaultRouter()
router.register(r'proveedores', ProveedorViewSet, basename='proveedor')

urlpatterns = [
    path('', include(router.urls)),
]