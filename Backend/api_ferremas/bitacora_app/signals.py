from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver
from .utils import crear_registro_actividad

@receiver(user_logged_in)
def registrar_login(sender, request, user, **kwargs):
    crear_registro_actividad(
        usuario=user,
        accion="LOGIN_EXITOSO",
        descripcion=f"Usuario {user.email if hasattr(user, 'email') else user.username} inició sesión.",
        request=request
    )

@receiver(user_logged_out)
def registrar_logout(sender, request, user, **kwargs):
    # user puede ser None si la sesión expiró y se limpió antes del logout explícito
    if user:
        crear_registro_actividad(
            usuario=user,
            accion="LOGOUT",
            descripcion=f"Usuario {user.email if hasattr(user, 'email') else user.username} cerró sesión.",
            request=request
        )