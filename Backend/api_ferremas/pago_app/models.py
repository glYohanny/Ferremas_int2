from django.db import models
from django.conf import settings
from pedido_app.models import PedidoCliente # Asumiendo que PedidoCliente está en pedido_app
from django.core.validators import MinValueValidator

# Create your models here.

# Mover MetodoPago y EstadoPago fuera de la clase Pago
class MetodoPago(models.TextChoices):
    WEBPAY = 'WEBPAY', 'Webpay Plus'
    TRANSFERENCIA = 'TRANSFERENCIA', 'Transferencia Bancaria'
    EFECTIVO = 'EFECTIVO', 'Efectivo (en tienda)'
    TARJETA_CREDITO = 'TARJETA_CREDITO', 'Tarjeta de Crédito'
    TARJETA_DEBITO = 'TARJETA_DEBITO', 'Tarjeta de Débito'
    OTRO = 'OTRO', 'Otro'

class EstadoPago(models.TextChoices):
    PENDIENTE = 'PENDIENTE', 'Pendiente'
    COMPLETADO = 'COMPLETADO', 'Completado'
    FALLIDO = 'FALLIDO', 'Fallido'
    REEMBOLSADO = 'REEMBOLSADO', 'Reembolsado'

class TipoCuota(models.TextChoices):
    SIN_CUOTAS = 'SIN_CUOTAS', 'Sin Cuotas' # Venta normal, 00
    CUOTAS_NORMALES = 'CUOTAS_NORMALES', 'Cuotas Normales' # Cuotas comercio (VC, VN), ej. 02, 03...
    CUOTAS_SIN_INTERES = 'CUOTAS_SIN_INTERES', 'Cuotas Sin Interés' # (SI, S2, SC)
    CUOTAS_CON_INTERES = 'CUOTAS_CON_INTERES', 'Cuotas Con Interés' # (CI, CF)
    # Podrías añadir más si tu pasarela los diferencia específicamente



class Pago(models.Model):
    pedido_cliente = models.ForeignKey(
        PedidoCliente,
        on_delete=models.PROTECT, # Proteger el pago si el pedido se intenta borrar
        related_name="pagos",
        verbose_name="Pedido del Cliente"
    )
    fecha_pago = models.DateTimeField(auto_now_add=True, verbose_name="Fecha y Hora del Pago")
    monto_pagado = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(0.01)],
        verbose_name="Monto Pagado"
    )

    metodo_pago = models.CharField(
        max_length=20,
        choices=MetodoPago.choices,
        verbose_name="Método de Pago"
    )

    estado_pago = models.CharField(
        max_length=20,
        choices=EstadoPago.choices,
        default=EstadoPago.PENDIENTE,
        verbose_name="Estado del Pago"
    )

    id_transaccion_pasarela = models.CharField(max_length=255, blank=True, null=True, verbose_name="ID Transacción Pasarela")
    datos_adicionales_pasarela = models.JSONField(blank=True, null=True, verbose_name="Datos Adicionales de la Pasarela") # Para guardar respuestas de Webpay, etc.
    token_webpay_transaccion = models.CharField(
        max_length=255, # Ajusta la longitud según el token de Webpay
        blank=True, null=True,
        # unique=True, # Un token de Webpay es único por transacción. Considera si un pago puede tener múltiples tokens (reintentos).
        verbose_name="Token de Transacción Webpay"
    )
    
    # Campos para cuotas
    tipo_cuotas = models.CharField(
        max_length=20,
        choices=TipoCuota.choices,
        default=TipoCuota.SIN_CUOTAS,
        verbose_name="Tipo de Cuotas",
        blank=True, null=True # Puede no aplicar a todos los métodos de pago
    )
    numero_cuotas = models.PositiveSmallIntegerField(
        verbose_name="Número de Cuotas",
        blank=True, null=True, # No todas las transacciones son en cuotas
        validators=[MinValueValidator(0)] # 0 para sin cuotas, o si el tipo ya lo indica
    )

    class Meta:
        verbose_name = "Pago"
        verbose_name_plural = "Pagos"
        ordering = ['-fecha_pago']

    def __str__(self):
        return f"Pago de {self.monto_pagado} para Pedido #{self.pedido_cliente.id} ({self.get_estado_pago_display()})"
