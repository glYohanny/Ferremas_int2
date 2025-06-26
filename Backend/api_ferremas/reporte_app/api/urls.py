from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReporteConfiguradoViewSet

app_name = 'reporte_app'

router = DefaultRouter()
router.register(r'reportes-configurados', ReporteConfiguradoViewSet, basename='reporteconfigurado')

urlpatterns = [
    path('', include(router.urls)),
]