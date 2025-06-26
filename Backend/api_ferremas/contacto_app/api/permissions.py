from rest_framework import permissions
from usuario_app.models import Personal

class IsOwnerOrStaffForContacto(permissions.BasePermission):
    """
    Permiso para Mensajes de Contacto:
    - Cualquiera (incluso anónimo si se permite en la vista) puede crear (POST).
    - El "dueño" (identificado por email) puede ver sus mensajes.
    - Staff (Vendedor, Admin) puede ver todos y modificar (responder, marcar leído, asignar).
    """

    def has_permission(self, request, view):
        # Permitir POST para cualquiera (crear mensaje)
        if request.method == 'POST':
            return True
        # Para otros métodos, el usuario debe estar autenticado
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Si es POST, has_permission ya lo manejó.
        # Para otros métodos, el usuario debe estar autenticado.
        if not request.user or not request.user.is_authenticated:
            return False

        # Staff (Vendedor, Admin) tiene todos los permisos sobre el objeto
        if hasattr(request.user, 'perfil_personal') and \
           request.user.perfil_personal and \
           request.user.perfil_personal.rol in [Personal.Roles.ADMINISTRADOR, Personal.Roles.VENDEDOR]:
            return True

        # El "dueño" del mensaje (identificado por email) puede verlo (SAFE_METHODS)
        # Esto asume que el usuario autenticado es el que envió el mensaje si los emails coinciden.
        if obj.email == request.user.email:
            return request.method in permissions.SAFE_METHODS

        return False