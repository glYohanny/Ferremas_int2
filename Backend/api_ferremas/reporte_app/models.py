from django.db import models
from django.conf import settings

# Create your models here.

class ReporteConfigurado(models.Model):
    nombre = models.CharField(max_length=150, verbose_name="Nombre del Reporte Configurado")
    descripcion = models.TextField(blank=True, null=True, verbose_name="Descripción del Reporte")

    class CategoriaReporte(models.TextChoices):
        VENTAS = 'VENTAS', 'Reportes de Ventas'
        FINANZAS = 'FINANZAS', 'Reportes de Finanzas'
        COMPRAS = 'COMPRAS', 'Reportes de Compras'
        INVENTARIO = 'INVENTARIO', 'Reportes de Inventario'
        CLIENTES = 'CLIENTES', 'Reportes de Clientes'
        PROVEEDORES = 'PROVEEDORES', 'Reportes de Proveedores'
        PERSONAL = 'PERSONAL', 'Reportes de Personal/Usuarios'
        OTRO = 'OTRO', 'Otro Tipo de Reporte'

    categoria = models.CharField(
        max_length=20,
        choices=CategoriaReporte.choices,
        verbose_name="Categoría del Reporte"
    )

    # Este campo podría almacenar un identificador del tipo específico de reporte
    # que se usará en la lógica de generación. Ej: "ventas_por_producto", "stock_bajo_minimo"
    tipo_especifico = models.CharField(
        max_length=100,
        blank=True, null=True, # Puede ser opcional si la categoría es suficiente o los parámetros lo definen
        verbose_name="Tipo Específico de Reporte",
        help_text="Identificador interno para la lógica de generación del reporte."
    )

    # Parámetros para generar el reporte (ej: rango de fechas, IDs de sucursal/producto, etc.)
    # Se almacenarán como un diccionario JSON.
    parametros = models.JSONField(default=dict, blank=True, verbose_name="Parámetros de Configuración (JSON)")

    class FormatoSalida(models.TextChoices):
        PANTALLA = 'PANTALLA', 'Visualización en Pantalla'
        CSV = 'CSV', 'Archivo CSV'
        PDF = 'PDF', 'Archivo PDF'
        EXCEL = 'EXCEL', 'Archivo Excel'

    formato_salida_preferido = models.CharField(
        max_length=10,
        choices=FormatoSalida.choices,
        default=FormatoSalida.PANTALLA,
        verbose_name="Formato de Salida Preferido"
    )

    creado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="reportes_configurados")
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    ultima_ejecucion = models.DateTimeField(null=True, blank=True, verbose_name="Última Ejecución")

    class Meta:
        verbose_name = "Reporte Configurado"
        verbose_name_plural = "Reportes Configurados"
        ordering = ['categoria', 'nombre']

    def __str__(self):
        return f"{self.nombre} ({self.get_categoria_display()})"
