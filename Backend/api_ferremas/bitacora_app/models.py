from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

# Create your models here.

class RegistroActividad(models.Model):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, # Mantener el registro si el usuario se elimina
        null=True, blank=True, # Puede haber acciones del sistema no ligadas a un usuario específico
        verbose_name="Usuario"
    )
    fecha_hora = models.DateTimeField(auto_now_add=True, verbose_name="Fecha y Hora")
    
    # Tipo de acción realizada (ej: CREAR, ACTUALIZAR, ELIMINAR, LOGIN, LOGOUT, VER_REPORTE)
    # Podrías usar TextChoices si tienes un conjunto fijo de acciones
    accion = models.CharField(max_length=100, verbose_name="Acción Realizada")
    
    descripcion = models.TextField(blank=True, null=True, verbose_name="Descripción Detallada")
    
    # Para enlazar la actividad a un objeto específico si aplica (ej: un Pedido, un Producto)
    # Usamos GenericForeignKey para flexibilidad
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name="Tipo de Objeto Relacionado"
    )
    object_id = models.PositiveIntegerField(null=True, blank=True, verbose_name="ID del Objeto Relacionado")
    objeto_relacionado = GenericForeignKey('content_type', 'object_id')
    
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="Dirección IP")
    # user_agent = models.TextField(blank=True, null=True, verbose_name="User Agent") # Si quieres más detalle del cliente

    class Meta:
        verbose_name = "Registro de Actividad"
        verbose_name_plural = "Registros de Actividad"
        ordering = ['-fecha_hora']

    def __str__(self):
        usuario_str = str(self.usuario) if self.usuario else "Sistema"
        return f"{self.fecha_hora.strftime('%Y-%m-%d %H:%M:%S')} - {usuario_str} - {self.accion}"
