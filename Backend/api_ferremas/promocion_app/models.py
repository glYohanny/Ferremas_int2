from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from decimal import Decimal # Asegúrate que Decimal esté importado
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.utils import timezone # Añadido import
from datetime import timedelta # Import timedelta
from producto_app.models import Producto, Categoria, Marca
from usuario_app.models import Cliente # Asumiendo que el modelo Cliente está en usuario_app

# Create your models here.

class Promocion(models.Model):
    # id_promocion es automático (id)
    titulo = models.CharField(max_length=150, verbose_name="Título de la Promoción")
    descripcion = models.TextField(blank=True, null=True, verbose_name="Descripción Detallada")

    class TipoPromocion(models.TextChoices):
        DESCUENTO_PORCENTAJE = 'DESC_PORC', 'Descuento en Porcentaje (%)'
        PRECIO_FIJO = 'PRECIO_FIJO', 'Precio Fijo'
        DESCUENTO_MONTO_FIJO = 'DESC_MONTO', 'Descuento de Monto Fijo ($)' # Nuevo tipo
        DOS_POR_UNO = '2X1', '2x1'
        REGALO = 'REGALO', 'Producto de Regalo'
        # Puedes añadir más tipos según necesites

    tipo_promocion = models.CharField(
        max_length=20,
        choices=TipoPromocion.choices,
        verbose_name="Tipo de Promoción"
    )
    # Valor numérico asociado. Su interpretación depende del tipo_promocion.
    # Ej: 20 para 20% de descuento, o 10000 para un precio fijo de $10.000.
    # Para 2x1 o Regalo, podría no usarse o tener otro significado.
    valor = models.DecimalField( # Para DESC_MONTO, este es el monto a descontar
        max_digits=10, decimal_places=2, blank=True, null=True,
        verbose_name="Valor de la Promoción",
        help_text="Ej: 20 para 20%, 10000 para precio fijo. Puede ser nulo para 2x1 o Regalo."
    )

    fecha_inicio = models.DateTimeField(verbose_name="Fecha de Inicio")
    fecha_fin = models.DateTimeField(verbose_name="Fecha de Término")
    activo = models.BooleanField(default=True, verbose_name="¿Está activa?")

    # --- Asociación con entidades (FK Dinámica) ---

    # content_type limitará las opciones a los modelos que definamos (Producto, Categoria, Marca)
    limit_choices_to = {
        'model__in': [
            'producto',
            'categoria',
            'marca',
        ],
        'app_label__in': [
            'producto_app', # Asegúrate que este es el app_label de Producto, Categoria, Marca
        ]
    }
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        limit_choices_to=limit_choices_to,
        verbose_name="Aplica a Tipo de Entidad"
    )
    object_id = models.PositiveIntegerField(verbose_name="ID de la Entidad Objetivo")
    objetivo_promocion = GenericForeignKey('content_type', 'object_id')

    # --- Extras útiles ---
    codigo_promocional = models.CharField(max_length=50, blank=True, null=True, unique=True, verbose_name="Código Promocional")
    restricciones = models.TextField(blank=True, null=True, verbose_name="Restricciones y Condiciones")
    limite_uso_total = models.PositiveIntegerField(blank=True, null=True, verbose_name="Límite de Uso Total")
    usos_actuales = models.PositiveIntegerField(default=0, verbose_name="Usos Actuales")
    limite_uso_por_cliente = models.PositiveIntegerField(blank=True, null=True, verbose_name="Límite de Uso por Cliente")
    solo_para_clientes_registrados = models.BooleanField(default=False, verbose_name="Solo para Clientes Registrados") # Renombrado de solo_para_clientes_vip
    producto_regalo = models.ForeignKey(Producto, on_delete=models.SET_NULL, blank=True, null=True, related_name="promociones_como_regalo", verbose_name="Producto de Regalo (si aplica)")

    class Meta:
        verbose_name = "Promoción"
        verbose_name_plural = "Promociones"
        ordering = ['-fecha_inicio', 'titulo']

    def __str__(self):
        return self.titulo # Simplificado como en la sugerencia, aunque el tuyo también es válido

    def clean(self):
        super().clean()
        if self.fecha_fin < self.fecha_inicio:
            raise ValidationError("La fecha de fin no puede ser anterior a la fecha de inicio.")
        if self.limite_uso_total is not None and self.usos_actuales > self.limite_uso_total:
            raise ValidationError("Los usos actuales no pueden exceder el límite de uso total.")
        
        # Validaciones para el campo 'valor' y 'producto_regalo' según el tipo de promoción
        tipos_que_requieren_valor = [
            self.TipoPromocion.DESCUENTO_PORCENTAJE,
            self.TipoPromocion.PRECIO_FIJO,
            self.TipoPromocion.DESCUENTO_MONTO_FIJO
        ]
        if self.tipo_promocion in tipos_que_requieren_valor and (self.valor is None or self.valor <= 0):
            raise ValidationError(f"El tipo de promoción '{self.get_tipo_promocion_display()}' requiere un 'Valor' positivo.")

        if self.tipo_promocion == self.TipoPromocion.REGALO and not self.producto_regalo:
            raise ValidationError("Las promociones de 'Producto de Regalo' deben tener un producto de regalo asociado.")

        if self.tipo_promocion != self.TipoPromocion.REGALO and self.producto_regalo:
            raise ValidationError("El campo 'Producto de Regalo' solo debe usarse con promociones de tipo 'Producto de Regalo'.")
        
        if self.limite_uso_por_cliente is not None and not self.solo_para_clientes_registrados:
            raise ValidationError("El límite de uso por cliente solo tiene sentido si la promoción es para clientes registrados.")

    @property
    def esta_vigente(self):
        """Verifica si la promoción está activa y dentro de su rango de fechas."""
        now = timezone.now()
        # Comprobación directa. Asume que las fechas de inicio/fin se establecen
        # con la hora deseada (ej. 23:59:59 para el final del día).
        return self.activo and self.fecha_inicio <= now <= self.fecha_fin

    def aplicar_a_precio(self, precio_original: Decimal) -> Decimal:
        """
        Aplica la promoción a un precio dado. Usa Decimal para precisión monetaria.
        """
        if not self.esta_vigente:
            return precio_original

        if self.valor is not None:
            if self.tipo_promocion == self.TipoPromocion.DESCUENTO_PORCENTAJE:
                descuento = precio_original * (self.valor / Decimal('100'))
                return max(Decimal('0.00'), precio_original - descuento)
            elif self.tipo_promocion == self.TipoPromocion.PRECIO_FIJO:
                return Decimal(self.valor)
            elif self.tipo_promocion == self.TipoPromocion.DESCUENTO_MONTO_FIJO:
                return max(Decimal('0.00'), precio_original - self.valor)

        return precio_original


class UsoPromocionCliente(models.Model):
    """
    Modelo para rastrear cuántas veces un cliente ha utilizado una promoción específica.
    """
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name="usos_promociones")
    promocion = models.ForeignKey(Promocion, on_delete=models.CASCADE, related_name="usos_por_cliente")
    cantidad_usos = models.PositiveIntegerField(default=1, verbose_name="Cantidad de Usos")

    class Meta:
        unique_together = ('cliente', 'promocion') # Asegura que solo haya un registro por cliente y promoción
        verbose_name = "Uso de Promoción por Cliente"
        verbose_name_plural = "Usos de Promociones por Clientes"

    def __str__(self):
        return f"{self.cliente} - {self.promocion.titulo} ({self.cantidad_usos} usos)"
