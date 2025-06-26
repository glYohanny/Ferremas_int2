from django.db import models
from django.conf import settings

# Create your models here.

class MensajeContacto(models.Model):
    nombre_completo = models.CharField(max_length=150, verbose_name="Nombre Completo")
    email = models.EmailField(verbose_name="Correo Electrónico")
    asunto = models.CharField(max_length=200, verbose_name="Asunto")
    mensaje = models.TextField(verbose_name="Mensaje")
    fecha_envio = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Envío")
    
    leido = models.BooleanField(default=False, verbose_name="¿Leído?")
    respondido = models.BooleanField(default=False, verbose_name="¿Respondido?")
    fecha_respuesta = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de Respuesta")
    respuesta_admin = models.TextField(blank=True, null=True, verbose_name="Respuesta del Administrador")
    atendido_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, blank=True, 
        related_name="mensajes_atendidos",
        verbose_name="Atendido por"
    )

    class Meta:
        verbose_name = "Mensaje de Contacto"
        verbose_name_plural = "Mensajes de Contacto"
        ordering = ['-fecha_envio']

    def __str__(self):
        return f"Mensaje de {self.nombre_completo} - {self.asunto} ({self.fecha_envio.strftime('%Y-%m-%d %H:%M')})"
