from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

# Create your models here.

class ConfiguracionGlobal(models.Model):
    # Datos de la Empresa
    nombre_empresa = models.CharField(max_length=150, default="Ferremas", verbose_name="Nombre de la Empresa")
    rut_empresa = models.CharField(max_length=12, blank=True, null=True, verbose_name="RUT de la Empresa")
    direccion_empresa = models.CharField(max_length=255, blank=True, null=True, verbose_name="Dirección Principal de la Empresa")
    telefono_contacto = models.CharField(max_length=20, blank=True, null=True, verbose_name="Teléfono de Contacto Principal")
    email_contacto = models.EmailField(blank=True, null=True, verbose_name="Email de Contacto Principal")
    logo_empresa = models.ImageField(upload_to='configuracion/', blank=True, null=True, verbose_name="Logo de la Empresa")

    # Parámetros Financieros
    porcentaje_iva = models.DecimalField(
        max_digits=5, decimal_places=2, default=19.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="Porcentaje de IVA (%)",
        help_text="Valor porcentual del IVA. Ej: 19.00 para 19%"
    )

    # Límites y Umbrales
    monto_minimo_despacho_gratuito = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True,
        validators=[MinValueValidator(0)],
        verbose_name="Monto Mínimo para Despacho Gratuito"
    )

    # Textos Legales y Enlaces
    url_terminos_condiciones = models.URLField(blank=True, null=True, verbose_name="URL Términos y Condiciones")
    url_politica_privacidad = models.URLField(blank=True, null=True, verbose_name="URL Política de Privacidad")

    # Configuraciones de Funcionalidades
    modo_mantenimiento = models.BooleanField(default=False, verbose_name="Activar Modo Mantenimiento")
    mensaje_mantenimiento = models.TextField(blank=True, null=True, verbose_name="Mensaje de Modo Mantenimiento")

    # Para asegurar que solo haya una instancia (Singleton pattern)
    # Este campo no es estrictamente necesario para el patrón, pero puede ayudar en algunas implementaciones.
    # La lógica real del singleton se maneja usualmente en el admin o en un método save.
    _singleton = models.BooleanField(default=True, editable=False, unique=True)

    fecha_actualizacion = models.DateTimeField(auto_now=True, verbose_name="Última Actualización")

    class Meta:
        verbose_name = "Configuración Global del Sistema"
        verbose_name_plural = "Configuraciones Globales del Sistema"

    def __str__(self):
        return f"Configuración Global ({self.nombre_empresa})"

    def save(self, *args, **kwargs):
        # Asegurar que solo exista una instancia
        if not self.pk and ConfiguracionGlobal.objects.exists():
            # No permitir crear una nueva instancia si ya existe una.
            # Podrías levantar una excepción o simplemente no hacer nada.
            # Para el admin, es mejor controlar esto en el ModelAdmin.
            pass # Opcional: raise ValidationError("Solo puede existir una instancia de Configuración Global.")
        super().save(*args, **kwargs)
