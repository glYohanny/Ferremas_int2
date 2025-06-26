from django.db import models
from ubicacion_app.models import Comuna # Solo necesitamos Comuna, la Región se accede a través de ella.
from django.core.validators import MinValueValidator, MaxValueValidator

# Create your models here.

class Proveedor(models.Model):
    # El campo 'id' es creado automáticamente por Django como Primary Key.
    razon_social = models.CharField(max_length=200, verbose_name="Razón Social")
    rut = models.CharField(max_length=12, unique=True, verbose_name="RUT", help_text="Ej: 12.345.678-K")
    nombre_fantasia = models.CharField(max_length=150, blank=True, null=True, verbose_name="Nombre de Fantasía")
    direccion = models.CharField(max_length=255, verbose_name="Dirección Completa")
    comuna = models.ForeignKey(
        Comuna,
        on_delete=models.PROTECT, # Evita borrar una comuna si tiene proveedores asociados.
        related_name="proveedores", # Nombre para acceder desde Comuna: una_comuna.proveedores.all()
        verbose_name="Comuna"
    )
    # El campo 'region' se obtiene a través de la comuna: self.comuna.region
    # Campos de contacto que faltaban
    telefono = models.CharField(max_length=20, blank=True, null=True, verbose_name="Teléfono")
    email = models.EmailField(max_length=254, blank=True, null=True, verbose_name="Email")
    nombre_contacto = models.CharField(max_length=150, blank=True, null=True, verbose_name="Nombre del Contacto")

    # Información Bancaria
    banco = models.CharField(max_length=100, blank=True, null=True, verbose_name="Banco")

    class TipoCuenta(models.TextChoices):
        CORRIENTE = 'Corriente', 'Cuenta Corriente'
        AHORRO = 'Ahorro', 'Cuenta de Ahorro'
        VISTA = 'Vista', 'Cuenta Vista'
        OTRA = 'Otra', 'Otra'

    tipo_cuenta = models.CharField(
        max_length=20,
        choices=TipoCuenta.choices,
        blank=True, null=True,
        verbose_name="Tipo de Cuenta"
    )
    numero_cuenta = models.CharField(max_length=30, blank=True, null=True, verbose_name="Número de Cuenta")

    class Moneda(models.TextChoices):
        CLP = 'CLP', 'Peso Chileno (CLP)'
        USD = 'USD', 'Dólar Americano (USD)'
        EUR = 'EUR', 'Euro (EUR)'
        UF = 'UF', 'Unidad de Fomento (UF)'

    moneda = models.CharField(max_length=3, choices=Moneda.choices, default=Moneda.CLP, verbose_name="Moneda")

    activo = models.BooleanField(default=True, verbose_name="¿Está activo?")
    fecha_registro = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Registro")
    
    # --- Campos Adicionales para Gestión Completa ---
    condiciones_pago = models.TextField(
        blank=True, null=True, 
        verbose_name="Condiciones de Pago",
        help_text="Ej: Pago a 30 días, Descuento del 5% por pago anticipado."
    )
    contrato = models.FileField(
        upload_to='proveedores/contratos/', 
        blank=True, null=True, 
        verbose_name="Contrato Adjunto"
    )
    fecha_inicio_relacion = models.DateField(
        blank=True, null=True, verbose_name="Fecha de Inicio de Relación")

    class Meta:
        verbose_name = "Proveedor"
        verbose_name_plural = "Proveedores"
        ordering = ['razon_social']

    def __str__(self):
        return f"{self.razon_social} ({self.rut})"

    @property
    def region(self):
        if self.comuna:
            return self.comuna.region
        return None

class EvaluacionProveedor(models.Model):
    proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE, related_name="evaluaciones")
    calificacion = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name="Calificación (1-5 Estrellas)",
        help_text="Calificación general del desempeño del proveedor."
    )
    porcentaje_cumplimiento = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="Porcentaje de Cumplimiento de Entrega",
        help_text="Porcentaje de pedidos entregados a tiempo en este período."
    )
    comentarios = models.TextField(blank=True, null=True, verbose_name="Comentarios Internos")
    periodo_evaluado = models.CharField(max_length=50, help_text="Ej: 'Q1 2024', 'Anual 2023'")
    fecha_evaluacion = models.DateField(auto_now_add=True)

    class Meta:
        verbose_name = "Evaluación de Proveedor"
        verbose_name_plural = "Evaluaciones de Proveedores"
        ordering = ['-fecha_evaluacion', 'proveedor']
        unique_together = ('proveedor', 'periodo_evaluado') # Solo una evaluación por proveedor por período

    def __str__(self):
        return f"Evaluación de {self.proveedor.razon_social} para {self.periodo_evaluado}"
