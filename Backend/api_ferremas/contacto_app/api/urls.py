from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MensajeContactoViewSet

app_name = 'contacto_app'

router = DefaultRouter()
router.register(r'mensajes', MensajeContactoViewSet, basename='mensajecontacto')

urlpatterns = [
    path('', include(router.urls)),
]