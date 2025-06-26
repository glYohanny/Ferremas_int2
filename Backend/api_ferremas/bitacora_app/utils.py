from django.contrib.contenttypes.models import ContentType
from .models import RegistroActividad

def get_client_ip(request):
    """Obtiene la IP del cliente desde el request."""
    if not request:
        return None
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def crear_registro_actividad(usuario, accion, descripcion="", objeto_relacionado=None, request=None):
    """
    Crea un nuevo registro de actividad.
    """
    ip_address = get_client_ip(request)

    content_type = None
    object_id = None
    if objeto_relacionado:
        content_type = ContentType.objects.get_for_model(objeto_relacionado.__class__)
        object_id = objeto_relacionado.pk

    RegistroActividad.objects.create(
        usuario=usuario if usuario and usuario.is_authenticated else None,
        accion=accion,
        descripcion=descripcion,
        content_type=content_type,
        object_id=object_id,
        ip_address=ip_address
    )