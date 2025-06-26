from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ClienteRegistrationAPIView, 
    ClienteProfileAPIView,
    PasswordResetRequestAPIView,
    PasswordResetConfirmAPIView, 
    UsuarioListView,
    PersonalViewSet,
    CurrentClienteProfileView,
    UnifiedUserProfileView, # Importar la nueva vista unificada
    UsuarioUpdateViewSet, # Asegúrate de importar UsuarioUpdateViewSet
    VendedorClientesFrecuentesAPIView # Importar la nueva vista de clientes frecuentes
)

app_name = 'usuario_app'

# Crear un router y registrar nuestro ViewSet
router = DefaultRouter()
router.register(r'personal', PersonalViewSet, basename='personal')  # Keep this for individual personal URLs
router.register(r'usuarios-admin', UsuarioUpdateViewSet, basename='usuario-admin-update') # REGISTRA EL VIEWSET AQUÍ

urlpatterns = [
    path('clientes/registro/', ClienteRegistrationAPIView.as_view(), name='cliente-registro'),
    path('clientes/perfil/', ClienteProfileAPIView.as_view(), name='cliente-perfil'),
    path('password-reset/', PasswordResetRequestAPIView.as_view(), name='password-reset-request'),
    path('password-reset-confirm/<uidb64>/<token>/', PasswordResetConfirmAPIView.as_view(), name='password-reset-confirm'),
    path('usuarios/', UsuarioListView.as_view(), name='usuario-list'),  # Nuevo endpoint para listar usuarios
    path('perfil-cliente/me/', CurrentClienteProfileView.as_view(), name='current-cliente-profile'), # Nueva ruta para el perfil del cliente actual
    path('me/', UnifiedUserProfileView.as_view(), name='unified-user-profile'), # Endpoint unificado para el perfil del usuario actual
    path('vendedor/clientes-frecuentes/', VendedorClientesFrecuentesAPIView.as_view(), name='vendedor-clientes-frecuentes'), # Nuevo endpoint para clientes frecuentes
    # Incluir las URLs generadas por el router
    path('', include(router.urls)),  # Include the router URLs
]