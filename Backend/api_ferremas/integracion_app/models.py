from django.db import models

# Create your models here.

class ConfiguracionApiExterna(models.Model):
    nombre_integracion = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Nombre de la Integración",
        help_text="Ej: Webpay, Chilexpress, Correo Electrónico SMTP"
    )
    descripcion = models.TextField(blank=True, null=True, verbose_name="Descripción")

    class TipoIntegracion(models.TextChoices):
        PAGO = 'PAGO', 'Pasarela de Pago'
        ENVIO = 'ENVIO', 'Servicio de Envío'
        ERP = 'ERP', 'Sistema ERP'
        NOTIFICACION = 'NOTIFICACION', 'Servicio de Notificación'
        OTRO = 'OTRO', 'Otro Tipo'

    tipo = models.CharField(
        max_length=20,
        choices=TipoIntegracion.choices,
        default=TipoIntegracion.OTRO,
        verbose_name="Tipo de Integración"
    )

    # Campos para almacenar credenciales y URLs.
    # ¡IMPORTANTE! Considera usar variables de entorno o un sistema de gestión de secretos
    # para almacenar información sensible como API keys y secrets en producción,
    # en lugar de guardarlos directamente en la base de datos en texto plano.
    base_url = models.URLField(blank=True, null=True, verbose_name="URL Base de la API")
    api_key = models.CharField(max_length=255, blank=True, null=True, verbose_name="API Key / Usuario")
    api_secret = models.CharField(max_length=255, blank=True, null=True, verbose_name="API Secret / Contraseña / Token") # Considerar encriptación si se almacena aquí

    # Un campo JSON para configuraciones adicionales específicas de cada API
    configuracion_adicional = models.JSONField(blank=True, null=True, default=dict, verbose_name="Configuración Adicional (JSON)")

    activa = models.BooleanField(default=True, verbose_name="¿Está activa?")
    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación")
    fecha_actualizacion = models.DateTimeField(auto_now=True, verbose_name="Fecha de Actualización")

    class Meta:
        verbose_name = "Configuración de API Externa"
        verbose_name_plural = "Configuraciones de APIs Externas"
        ordering = ['nombre_integracion']

    def __str__(self):
        return f"{self.nombre_integracion} ({self.get_tipo_display()})"
