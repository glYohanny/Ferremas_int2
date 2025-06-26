from rest_framework import permissions

# Importar los roles desde el modelo Personal para evitar strings mágicos
from ..models import Personal

ROL_ADMINISTRADOR = Personal.Roles.ADMINISTRADOR
ROL_VENDEDOR = Personal.Roles.VENDEDOR
ROL_BODEGUERO = Personal.Roles.BODEGUERO
ROL_CONTABLE = Personal.Roles.CONTABLE

class EsAdministrador(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and \
               hasattr(request.user, 'perfil_personal') and \
               request.user.perfil_personal.rol == ROL_ADMINISTRADOR

class EsVendedor(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and \
               hasattr(request.user, 'perfil_personal') and \
               request.user.perfil_personal.rol == ROL_VENDEDOR

class EsBodeguero(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and \
               hasattr(request.user, 'perfil_personal') and \
               request.user.perfil_personal.rol == ROL_BODEGUERO

class EsContable(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and \
               hasattr(request.user, 'perfil_personal') and \
               request.user.perfil_personal.rol == ROL_CONTABLE

class EsPersonalAutorizadoParaPedidos(permissions.BasePermission):
    """
    Permite acceso si el usuario es Administrador, Vendedor o Bodeguero.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated or not hasattr(request.user, 'perfil_personal'):
            return False
        
        # Accede al campo 'rol' del perfil_personal del usuario.
        return request.user.perfil_personal.rol in [ROL_ADMINISTRADOR, ROL_VENDEDOR, ROL_BODEGUERO]

    def has_object_permission(self, request, view, obj):
        # Para la modificación de objetos, si ya pasaron has_permission,
        # asumimos que estos roles pueden modificar.
        # Podrías añadir lógica más fina aquí si es necesario.
        if not request.user or not request.user.is_authenticated or not hasattr(request.user, 'perfil_personal'):
            return False
        return request.user.perfil_personal.rol in [ROL_ADMINISTRADOR, ROL_VENDEDOR, ROL_BODEGUERO]
