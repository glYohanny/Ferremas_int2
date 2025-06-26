from django.db import models
from ubicacion_app.models import Region, Comuna # Importamos los modelos de ubicación

# Create your models here.

class TipoBodega(models.Model):
    # id_tipo_bodega es automático (id)
    tipo = models.CharField(max_length=100, unique=True, verbose_name="Tipo de Bodega") # Ej: Principal, Secundaria, Refrigerada

    class Meta:
        verbose_name = "Tipo de Bodega"
        verbose_name_plural = "Tipos de Bodega"
        ordering = ['tipo']

    def __str__(self):
        return self.tipo

class Sucursal(models.Model):
    # id_sucursal es automático (id)
    nombre = models.CharField(max_length=150, verbose_name="Nombre de Sucursal")
    region = models.ForeignKey(Region, on_delete=models.PROTECT, related_name="sucursales_region", verbose_name="Región")
    comuna = models.ForeignKey(Comuna, on_delete=models.PROTECT, related_name="sucursales_comuna", verbose_name="Comuna")
    direccion = models.CharField(max_length=255, verbose_name="Dirección")
    fecha_registro = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Registro")
    # Podrías añadir más campos como teléfono, email, encargado, etc.
    # telefono = models.CharField(max_length=20, blank=True, null=True)
    # email = models.EmailField(max_length=254, blank=True, null=True)
    is_active = models.BooleanField(default=True, verbose_name="¿Está activa?")

    class Meta:
        verbose_name = "Sucursal"
        verbose_name_plural = "Sucursales"
        ordering = ['nombre']
        # Para asegurar que no haya dos sucursales con el mismo nombre en la misma comuna (opcional, depende de tu lógica de negocio)
        # unique_together = ('nombre', 'comuna')

    def __str__(self):
        return f"{self.nombre} ({self.comuna.nombre})"

class Bodega(models.Model):
    # id_bodega es automático (id)
    sucursal = models.ForeignKey(Sucursal, on_delete=models.CASCADE, related_name="bodegas", verbose_name="Sucursal")
    tipo_bodega = models.ForeignKey(TipoBodega, on_delete=models.PROTECT, related_name="bodegas_tipo", verbose_name="Tipo de Bodega")
    direccion = models.CharField(max_length=255, verbose_name="Dirección de Bodega", help_text="Dirección específica de la bodega si es diferente a la sucursal o para identificarla.")
    is_active = models.BooleanField(default=True, verbose_name="¿Está activa?")
    # Podrías añadir más campos como capacidad, responsable, etc.
    # capacidad_m2 = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    class Meta:
        verbose_name = "Bodega"
        verbose_name_plural = "Bodegas"
        ordering = ['sucursal__nombre', 'tipo_bodega__tipo']

    def __str__(self):
        return f"Bodega {self.tipo_bodega.tipo} - {self.sucursal.nombre}"
