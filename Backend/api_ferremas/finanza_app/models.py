from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from usuario_app.models import Cliente, Personal # Asumiendo que Personal es tu AUTH_USER_MODEL
from proveedor_app.models import Proveedor
from pedido_app.models import PedidoCliente, PedidoProveedor
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class CuentaPorCobrar(models.Model):
    # id_cxc es automático (id)
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="cuentas_por_cobrar", verbose_name="Cliente")
    pedido_cliente = models.OneToOneField(
        PedidoCliente,
        on_delete=models.CASCADE, # Si se borra el pedido, se borra la CxC asociada
        related_name="cuenta_por_cobrar",
        verbose_name="Pedido de Cliente Asociado",
        null=True, blank=True # Puede haber CxC no ligadas a un pedido directo
    )
    monto_total = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0.01)], verbose_name="Monto Total a Cobrar")
    # Aseguramos que monto_pagado siempre tenga un valor decimal
    monto_pagado = models.DecimalField(
        max_digits=12, decimal_places=2, default=0.00, 
        validators=[MinValueValidator(0)], verbose_name="Monto Pagado"
    )
    fecha_emision = models.DateField(verbose_name="Fecha de Emisión")
    fecha_vencimiento = models.DateField(verbose_name="Fecha de Vencimiento")

    class EstadoCxC(models.TextChoices):
        PENDIENTE = 'PENDIENTE', 'Pendiente'
        PARCIALMENTE_PAGADA = 'PARCIAL', 'Parcialmente Pagada'
        PAGADA = 'PAGADA', 'Pagada'
        VENCIDA = 'VENCIDA', 'Vencida'
        ANULADA = 'ANULADA', 'Anulada'

    estado = models.CharField(max_length=20, choices=EstadoCxC.choices, default=EstadoCxC.PENDIENTE, verbose_name="Estado")
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    @property
    def saldo_pendiente(self):
        # Manejar el caso donde monto_total podría ser None (especialmente al crear un nuevo objeto)
        monto_total_val = self.monto_total if self.monto_total is not None else 0
        monto_pagado_val = self.monto_pagado if self.monto_pagado is not None else 0
        return monto_total_val - monto_pagado_val

    class Meta:
        verbose_name = "Cuenta por Cobrar"
        verbose_name_plural = "Cuentas por Cobrar"
        ordering = ['-fecha_vencimiento', 'cliente']

    def __str__(self):
        return f"CxC #{self.id} - {self.cliente} - Saldo: {self.saldo_pendiente}"
    
class CuentaPorPagar(models.Model):
    # id_cxp es automático (id)
    proveedor = models.ForeignKey(Proveedor, on_delete=models.PROTECT, related_name="cuentas_por_pagar", verbose_name="Proveedor")
    pedido_proveedor = models.OneToOneField(
        PedidoProveedor,
        on_delete=models.CASCADE, # Si se borra el pedido, se borra la CxP asociada
        related_name="cuenta_por_pagar",
        verbose_name="Pedido a Proveedor Asociado",
        null=True, blank=True # Puede haber CxP no ligadas a un pedido directo
    )
    monto_total = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0.01)], verbose_name="Monto Total a Pagar")
    # Aseguramos que monto_pagado siempre tenga un valor decimal
    monto_pagado = models.DecimalField(
        max_digits=12, decimal_places=2, default=0.00, 
        validators=[MinValueValidator(0)], verbose_name="Monto Pagado"
    )
    fecha_emision = models.DateField(verbose_name="Fecha de Emisión")
    fecha_vencimiento = models.DateField(verbose_name="Fecha de Vencimiento")

    class EstadoCxP(models.TextChoices):
        PENDIENTE = 'PENDIENTE', 'Pendiente'
        PARCIALMENTE_PAGADA = 'PARCIAL', 'Parcialmente Pagada'
        PAGADA = 'PAGADA', 'Pagada'
        VENCIDA = 'VENCIDA', 'Vencida'
        ANULADA = 'ANULADA', 'Anulada'

    estado = models.CharField(max_length=20, choices=EstadoCxP.choices, default=EstadoCxP.PENDIENTE, verbose_name="Estado")
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    @property
    def saldo_pendiente(self):
        monto_total_val = self.monto_total if self.monto_total is not None else 0
        monto_pagado_val = self.monto_pagado if self.monto_pagado is not None else 0
        return monto_total_val - monto_pagado_val

    class Meta:
        verbose_name = "Cuenta por Pagar"
        verbose_name_plural = "Cuentas por Pagar"
        ordering = ['-fecha_vencimiento', 'proveedor']

    def __str__(self):
        return f"CxP #{self.id} - {self.proveedor} - Saldo: {self.saldo_pendiente}"


class MetodoPago(models.TextChoices):
    EFECTIVO = 'EFECTIVO', 'Efectivo'
    TRANSFERENCIA = 'TRANSFERENCIA', 'Transferencia Bancaria'
    TARJETA_DEBITO = 'TARJETA_DEBITO', 'Tarjeta de Débito'
    TARJETA_CREDITO = 'TARJETA_CREDITO', 'Tarjeta de Crédito'
    CHEQUE = 'CHEQUE', 'Cheque'
    WEBPAY = 'WEBPAY', 'Webpay' # Añadido para consistencia
    OTRO = 'OTRO', 'Otro'


class PagoRecibido(models.Model):
    # id_pago es automático (id)
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="pagos_recibidos", verbose_name="Cliente")
    cuenta_por_cobrar = models.ForeignKey(CuentaPorCobrar, on_delete=models.SET_NULL, null=True, blank=True, related_name="pagos", verbose_name="Cuenta por Cobrar Asociada")
    fecha_pago = models.DateTimeField(verbose_name="Fecha del Pago")
    monto = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0.01)], verbose_name="Monto del Pago")
    metodo_pago = models.CharField(max_length=20, choices=MetodoPago.choices, verbose_name="Método de Pago")
    referencia_pago = models.CharField(max_length=100, blank=True, null=True, verbose_name="Referencia del Pago") # Ej: N° comprobante, ID transacción
    observaciones = models.TextField(blank=True, null=True, verbose_name="Observaciones")
    registrado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="pagos_recibidos_registrados")
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    # Campos para la confirmación de pagos (ej. transferencias)
    class EstadoConfirmacion(models.TextChoices):
        PENDIENTE = 'PENDIENTE', 'Pendiente de Confirmación'
        CONFIRMADO = 'CONFIRMADO', 'Confirmado'
        RECHAZADO = 'RECHAZADO', 'Rechazado'

    estado_confirmacion = models.CharField(
        max_length=20,
        choices=EstadoConfirmacion.choices,
        default=EstadoConfirmacion.CONFIRMADO, # Por defecto, los pagos no-transferencia se consideran confirmados
        verbose_name="Estado de Confirmación"
    )
    comprobante_adjunto = models.FileField(
        upload_to='comprobantes_pago/', # Directorio donde se guardarán los archivos
        blank=True, null=True,
        verbose_name="Comprobante Adjunto"
    )

    class Meta:
        verbose_name = "Pago Recibido"
        verbose_name_plural = "Pagos Recibidos"
        ordering = ['-fecha_pago']

    def __str__(self):
        return f"Pago de {self.cliente} - {self.monto} ({self.get_metodo_pago_display()})"


class PagoRealizado(models.Model):
    # id_pago es automático (id)
    proveedor = models.ForeignKey(Proveedor, on_delete=models.PROTECT, related_name="pagos_realizados", verbose_name="Proveedor")
    cuenta_por_pagar = models.ForeignKey(CuentaPorPagar, on_delete=models.SET_NULL, null=True, blank=True, related_name="pagos", verbose_name="Cuenta por Pagar Asociada")
    fecha_pago = models.DateTimeField(verbose_name="Fecha del Pago")
    monto = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0.01)], verbose_name="Monto del Pago")
    metodo_pago = models.CharField(max_length=20, choices=MetodoPago.choices, verbose_name="Método de Pago")
    referencia_pago = models.CharField(max_length=100, blank=True, null=True, verbose_name="Referencia del Pago")
    observaciones = models.TextField(blank=True, null=True, verbose_name="Observaciones")
    registrado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="pagos_realizados_registrados")
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Pago Realizado"
        verbose_name_plural = "Pagos Realizados"
        ordering = ['-fecha_pago']

    def __str__(self):
        return f"Pago a {self.proveedor} - {self.monto} ({self.get_metodo_pago_display()})"


class CuentaBancaria(models.Model):
    # id_cuenta es automático (id)
    banco = models.CharField(max_length=100, verbose_name="Nombre del Banco")
    class TipoCuentaBancaria(models.TextChoices):
        CORRIENTE = 'CORRIENTE', 'Cuenta Corriente'
        VISTA = 'VISTA', 'Cuenta Vista'
        AHORRO = 'AHORRO', 'Cuenta de Ahorro'
        OTRA = 'OTRA', 'Otra'
    tipo_cuenta = models.CharField(max_length=20, choices=TipoCuentaBancaria.choices, verbose_name="Tipo de Cuenta")
    numero_cuenta = models.CharField(max_length=50, unique=True, verbose_name="Número de Cuenta")
    class MonedaCuenta(models.TextChoices):
        CLP = 'CLP', 'Peso Chileno (CLP)'
        USD = 'USD', 'Dólar Americano (USD)'
        EUR = 'EUR', 'Euro (EUR)'
    moneda = models.CharField(max_length=3, choices=MonedaCuenta.choices, default=MonedaCuenta.CLP, verbose_name="Moneda")
    titular = models.CharField(max_length=150, verbose_name="Titular de la Cuenta") # Puede ser el nombre de la empresa
    saldo_actual = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, verbose_name="Saldo Actual")
    activa = models.BooleanField(default=True, verbose_name="¿Está activa?")
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Cuenta Bancaria"
        verbose_name_plural = "Cuentas Bancarias"
        ordering = ['banco', 'numero_cuenta']

    def __str__(self):
        return f"{self.banco} - {self.numero_cuenta} ({self.get_moneda_display()})"


class MovimientoCaja(models.Model):
    # id_movimiento es automático (id)
    fecha = models.DateTimeField(verbose_name="Fecha y Hora del Movimiento")
    class TipoMovimiento(models.TextChoices):
        INGRESO = 'INGRESO', 'Ingreso'
        EGRESO = 'EGRESO', 'Egreso'
    tipo = models.CharField(max_length=10, choices=TipoMovimiento.choices, verbose_name="Tipo de Movimiento")
    concepto = models.CharField(max_length=255, verbose_name="Concepto")
    monto = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0.01)], verbose_name="Monto")
    class OrigenDestinoFondos(models.TextChoices):
        CAJA_CHICA = 'CAJA_CHICA', 'Caja Chica'
        BANCO = 'BANCO', 'Cuenta Bancaria' # Podría enlazarse a CuentaBancaria
        VENTA = 'VENTA', 'Venta Directa'
        PAGO_PROVEEDOR = 'PAGO_PROVEEDOR', 'Pago a Proveedor'
        OTRO = 'OTRO', 'Otro'
    origen_destino = models.CharField(max_length=20, choices=OrigenDestinoFondos.choices, verbose_name="Origen/Destino de Fondos")
    cuenta_bancaria_asociada = models.ForeignKey(CuentaBancaria, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Cuenta Bancaria Asociada (si aplica)")
    referencia = models.CharField(max_length=100, blank=True, null=True, verbose_name="Referencia (N° Boleta, Factura, etc.)")
    usuario_responsable = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, verbose_name="Usuario Responsable")
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Movimiento de Caja/Tesorería"
        verbose_name_plural = "Movimientos de Caja/Tesorería"
        ordering = ['-fecha']

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.concepto} - {self.monto}"


class DocumentoFinanciero(models.Model):
    # id_documento es automático (id)
    class TipoDocumento(models.TextChoices):
        FACTURA_VENTA = 'FACT_VENTA', 'Factura de Venta'
        BOLETA_VENTA = 'BOL_VENTA', 'Boleta de Venta'
        NOTA_CREDITO_VENTA = 'NC_VENTA', 'Nota de Crédito (Venta)'
        NOTA_DEBITO_VENTA = 'ND_VENTA', 'Nota de Débito (Venta)'
        FACTURA_COMPRA = 'FACT_COMPRA', 'Factura de Compra'
        NOTA_CREDITO_COMPRA = 'NC_COMPRA', 'Nota de Crédito (Compra)'
        OTRO = 'OTRO', 'Otro Documento'
    tipo_documento = models.CharField(max_length=20, choices=TipoDocumento.choices, verbose_name="Tipo de Documento")

    # Para la entidad (cliente o proveedor) usando GenericForeignKey
    content_type = models.ForeignKey(ContentType, on_delete=models.PROTECT, limit_choices_to={'model__in': ('cliente', 'proveedor')})
    object_id = models.PositiveIntegerField()
    entidad_asociada = GenericForeignKey('content_type', 'object_id')

    numero_documento = models.CharField(max_length=50, unique=True, verbose_name="Número de Documento") # Ej: Folio
    monto_neto = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="Monto Neto")
    monto_impuesto = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="Monto Impuesto (IVA)")
    monto_total = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Monto Total")
    fecha_emision = models.DateField(verbose_name="Fecha de Emisión")
    fecha_vencimiento = models.DateField(blank=True, null=True, verbose_name="Fecha de Vencimiento")

    class EstadoDocumento(models.TextChoices):
        EMITIDO = 'EMITIDO', 'Emitido'
        PAGADO = 'PAGADO', 'Pagado'
        ANULADO = 'ANULADO', 'Anulado'
        VENCIDO = 'VENCIDO', 'Vencido'
    estado = models.CharField(max_length=10, choices=EstadoDocumento.choices, default=EstadoDocumento.EMITIDO, verbose_name="Estado del Documento")
    url_pdf = models.URLField(blank=True, null=True, verbose_name="URL del PDF del Documento")
    # Podrías enlazar este documento a un PedidoCliente o PedidoProveedor
    pedido_cliente_asociado = models.ForeignKey(PedidoCliente, on_delete=models.SET_NULL, null=True, blank=True, related_name="documentos_financieros")
    pedido_proveedor_asociado = models.ForeignKey(PedidoProveedor, on_delete=models.SET_NULL, null=True, blank=True, related_name="documentos_financieros")
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Documento Financiero"
        verbose_name_plural = "Documentos Financieros"
        ordering = ['-fecha_emision', 'numero_documento']

    def __str__(self):
        return f"{self.get_tipo_documento_display()} N°{self.numero_documento} - {self.entidad_asociada}"

    def clean(self):
        # Validación para asegurar que monto_neto + monto_impuesto = monto_total
        if self.monto_neto is not None and self.monto_impuesto is not None and self.monto_total is not None:
            if self.monto_neto + self.monto_impuesto != self.monto_total:
                from django.core.exceptions import ValidationError
                raise ValidationError("El monto total no coincide con la suma del neto más el impuesto.")
        super().clean()