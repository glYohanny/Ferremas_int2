from django.db import models
from django.conf import settings
from proveedor_app.models import Proveedor
from producto_app.models import Producto
from usuario_app.models import Cliente
from sucursal_app.models import Sucursal, Bodega # Importar Bodega
from django.core.validators import MinValueValidator
from ubicacion_app.models import Comuna # Descomentar si usas Comuna para dirección de entrega
 
# Create your models here.

class PedidoProveedor(models.Model):
    # id_pedido_proveedor es automático (id)
    proveedor = models.ForeignKey(
        Proveedor,
        on_delete=models.PROTECT, # Proteger para no borrar proveedores con pedidos asociados
        related_name="pedidos_realizados",
        verbose_name="Proveedor"
    )
    bodega_recepcion = models.ForeignKey(
        Bodega,
        on_delete=models.PROTECT,
        related_name="pedidos_proveedor_a_recibir",
        verbose_name="Bodega de Recepción",
        null=False, blank=False # Siempre se debe especificar una bodega de destino
    )
    fecha_pedido = models.DateTimeField(auto_now_add=True, verbose_name="Fecha del Pedido")

    class EstadoPedido(models.TextChoices):
        SOLICITADO = 'SOLICITADO', 'Solicitado'
        EN_TRANSITO = 'EN_TRANSITO', 'En Tránsito'
        RECIBIDO_PARCIAL = 'RECIBIDO_PARCIAL', 'Recibido Parcialmente'
        RECIBIDO_COMPLETO = 'RECIBIDO_COMPLETO', 'Recibido Completamente'
        CANCELADO = 'CANCELADO', 'Cancelado'

    estado = models.CharField(
        max_length=20,
        choices=EstadoPedido.choices,
        default=EstadoPedido.SOLICITADO,
        verbose_name="Estado del Pedido"
    )

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, validators=[MinValueValidator(0)], verbose_name="Subtotal")
    descuento_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, validators=[MinValueValidator(0)], verbose_name="Descuento Total")
    impuesto_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, validators=[MinValueValidator(0)], verbose_name="Impuesto Total") # Ej. IVA
    total_pedido = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, validators=[MinValueValidator(0)], verbose_name="Total del Pedido")

    fecha_estimada_entrega = models.DateField(blank=True, null=True, verbose_name="Fecha Estimada de Entrega")
    fecha_recepcion = models.DateTimeField(blank=True, null=True, verbose_name="Fecha de Recepción Completa")
    numero_guia_despacho = models.CharField(max_length=100, blank=True, null=True, verbose_name="Número Guía de Despacho/Factura")
    notas = models.TextField(blank=True, null=True, verbose_name="Notas Adicionales")

    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="pedidos_proveedor_creados",
        verbose_name="Creado Por"
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación del Registro")
    fecha_actualizacion = models.DateTimeField(auto_now=True, verbose_name="Fecha de Última Actualización")

    class Meta:
        verbose_name = "Pedido a Proveedor"
        verbose_name_plural = "Pedidos a Proveedores"
        ordering = ['-fecha_pedido']

    @property
    def sucursal_recepcion(self):
        """
        Propiedad para obtener la sucursal de recepción a través de la bodega.
        Mantiene compatibilidad con código que podría usar 'sucursal_recepcion'.
        """
        if self.bodega_recepcion:
            return self.bodega_recepcion.sucursal
        return None

    def __str__(self):
        return f"Pedido #{self.id} a {self.proveedor.razon_social} para Bodega {self.bodega_recepcion.nombre if self.bodega_recepcion else 'N/A'} ({self.get_estado_display()})"

    def calcular_totales(self):
        # Lógica para recalcular subtotal, impuesto y total basado en los detalles
        # Este método se llamaría al guardar un detalle o al modificar el pedido
        detalles = self.detalles_pedido.all()
        self.subtotal = sum(detalle.subtotal_linea() for detalle in detalles if detalle.subtotal_linea() is not None)
        # Aquí aplicarías lógica para descuento_total e impuesto_total si es necesario
        # Por ahora, un cálculo simple:
        # from decimal import Decimal
        # self.impuesto_total = self.subtotal * Decimal('0.19') # Ejemplo IVA 19%
        self.total_pedido = (self.subtotal or 0) - (self.descuento_total or 0) + (self.impuesto_total or 0)
        self.save(update_fields=['subtotal', 'descuento_total', 'impuesto_total', 'total_pedido'])


class DetallePedidoProveedor(models.Model):
    pedido_proveedor = models.ForeignKey(
        PedidoProveedor,
        related_name="detalles_pedido",
        on_delete=models.CASCADE,
        verbose_name="Pedido Asociado"
    )
    producto = models.ForeignKey(
        Producto,
        on_delete=models.PROTECT, # Proteger para no borrar productos si están en un pedido
        verbose_name="Producto"
    )
    cantidad_solicitada = models.PositiveIntegerField(validators=[MinValueValidator(1)], verbose_name="Cantidad Solicitada")
    precio_unitario_compra = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)], verbose_name="Precio Unitario de Compra")
    cantidad_recibida = models.PositiveIntegerField(default=0, verbose_name="Cantidad Recibida")

    class Meta:
        verbose_name = "Detalle de Pedido a Proveedor"
        verbose_name_plural = "Detalles de Pedidos a Proveedores"
        unique_together = ('pedido_proveedor', 'producto') # No repetir el mismo producto en un pedido

    def __str__(self):
        return f"{self.cantidad_solicitada} x {self.producto.nombre} @ {self.precio_unitario_compra}"

    def subtotal_linea(self):
        if self.cantidad_solicitada is not None and self.precio_unitario_compra is not None:
            return self.cantidad_solicitada * self.precio_unitario_compra
        return 0
    subtotal_linea.short_description = "Subtotal Línea"

# --- Modelos para Pedido de Cliente ---

class EstadoPedidoCliente(models.TextChoices):
    PENDIENTE = 'PENDIENTE', 'Pendiente'
    PROCESANDO = 'PROCESANDO', 'Procesando'
    PENDIENTE_REABASTECIMIENTO = 'PENDIENTE_REABASTECIMIENTO', 'Pendiente de Reabastecimiento' # Nuevo estado
    PAGADO = 'PAGADO', 'Pagado' # Nuevo estado para reflejar pago exitoso
    ENVIADO = 'ENVIADO', 'Enviado'
    ENTREGADO = 'ENTREGADO', 'Entregado'
    CANCELADO = 'CANCELADO', 'Cancelado'
    RECHAZADO_STOCK = 'RECHAZADO_STOCK', 'Rechazado por Falta de Stock' # Si no se puede reabastecer
    FALLIDO = 'FALLIDO', 'Fallido' # Nuevo estado para pago fallido

class EstadoPreparacionPedido(models.TextChoices):
    PENDIENTE_ASIGNACION = 'PENDIENTE_ASIGNACION', 'Pendiente de Asignación'
    ASIGNADO = 'ASIGNADO', 'Asignado para Preparación'
    EN_PREPARACION = 'EN_PREPARACION', 'En Preparación'
    LISTO_PARA_ENTREGA = 'LISTO_PARA_ENTREGA', 'Listo para Entrega/Despacho'
    # Podrías añadir más estados si el flujo de despacho es complejo


class MetodoEnvio(models.TextChoices):
    RETIRO_TIENDA = 'RETIRO_TIENDA', 'Retiro en Tienda'
    DESPACHO_DOMICILIO = 'DESPACHO_DOMICILIO', 'Despacho a Domicilio'
    # Podrías añadir más como 'COURIER_EXTERNO'


class PedidoCliente(models.Model):
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.PROTECT,
        related_name="pedidos_cliente",
        verbose_name="Cliente"
    )
    sucursal_despacho = models.ForeignKey(
        Sucursal,
        on_delete=models.PROTECT, # Proteger la sucursal si tiene pedidos asociados
        related_name="pedidos_a_despachar",
        verbose_name="Sucursal de Despacho", # La bodega específica se determina por reglas de negocio (ej. bodega principal)
        null=False, blank=False # Siempre se debe especificar una sucursal de despacho
    )
    fecha_pedido = models.DateTimeField(auto_now_add=True, verbose_name="Fecha del Pedido")

    estado = models.CharField(
        max_length=30, # Aumentado para acomodar 'PENDIENTE_REABASTECIMIENTO' (26 chars) y 'RECHAZADO_STOCK' (20 chars)
        choices=EstadoPedidoCliente.choices,
        default=EstadoPedidoCliente.PENDIENTE,
        verbose_name="Estado del Pedido"
    )

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, validators=[MinValueValidator(0)], verbose_name="Subtotal")
    descuento_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, validators=[MinValueValidator(0)], verbose_name="Descuento Total Aplicado")
    impuesto_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, validators=[MinValueValidator(0)], verbose_name="Impuesto Total")
    total_pedido = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, validators=[MinValueValidator(0)], verbose_name="Total del Pedido")

    metodo_envio = models.CharField(
        max_length=30,
        choices=MetodoEnvio.choices,
        verbose_name="Método de Envío"
    )
    # Para la dirección de entrega, puedes usar un TextField o campos más estructurados.
    # Si usas campos estructurados, considera crear un modelo Direccion separado o usar campos de Comuna, etc.
    direccion_entrega_texto = models.TextField(blank=True, null=True, verbose_name="Dirección de Entrega (si aplica)") # Asegúrate que este campo exista y no esté comentado
    comuna_entrega = models.ForeignKey(Comuna, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Comuna de Entrega")
    telefono_contacto_envio = models.CharField(max_length=20, blank=True, null=True, verbose_name="Teléfono de Contacto para Envío")
    email_contacto_envio = models.EmailField(blank=True, null=True, verbose_name="Email de Contacto para Envío")

    fecha_entrega_estimada = models.DateField(blank=True, null=True, verbose_name="Fecha Estimada de Entrega")
    fecha_entregado = models.DateTimeField(blank=True, null=True, verbose_name="Fecha de Entrega Real")
    notas_cliente = models.TextField(blank=True, null=True, verbose_name="Notas del Cliente") # Renombrado de 'notas'

    # Si el personal puede crear pedidos en nombre de los clientes
    creado_por_personal = models.ForeignKey(
        settings.AUTH_USER_MODEL, # Refiere al modelo Personal
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="pedidos_cliente_gestionados",
        verbose_name="Gestionado por (Personal)"
    )
    bodeguero_asignado = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="pedidos_cliente_asignados_bodega",
        verbose_name="Bodeguero Asignado",
        limit_choices_to={'perfil_personal__rol': 'BODEGUERO'} # Limitar a usuarios con rol Bodeguero
    )
    estado_preparacion = models.CharField(
        max_length=30,
        choices=EstadoPreparacionPedido.choices,
        default=EstadoPreparacionPedido.PENDIENTE_ASIGNACION,
        verbose_name="Estado de Preparación en Bodega"
    )

    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación del Registro")
    fecha_actualizacion = models.DateTimeField(auto_now=True, verbose_name="Fecha de Última Actualización")

    class Meta:
        verbose_name = "Pedido de Cliente"
        verbose_name_plural = "Pedidos de Clientes"
        ordering = ['-fecha_pedido']

    def __str__(self):
        return f"Pedido Cliente #{self.id} - {self.cliente} ({self.get_estado_display()})"

    def calcular_totales_cliente(self):
        detalles = self.detalles_pedido_cliente.all()
        self.subtotal = sum(detalle.subtotal_linea_cliente() for detalle in detalles if detalle.subtotal_linea_cliente() is not None)
        # Aquí aplicarías lógica para descuento_total (podría venir de promociones) e impuesto_total
        # from decimal import Decimal
        # self.impuesto_total = self.subtotal * Decimal('0.19') # Ejemplo IVA 19%
        self.total_pedido = (self.subtotal or 0) - (self.descuento_total or 0) + (self.impuesto_total or 0)
        self.save(update_fields=['subtotal', 'descuento_total', 'impuesto_total', 'total_pedido'])


class DetallePedidoCliente(models.Model):
    pedido_cliente = models.ForeignKey(
        PedidoCliente,
        related_name="detalles_pedido_cliente",
        on_delete=models.CASCADE,
        verbose_name="Pedido Cliente Asociado"
    )
    producto = models.ForeignKey(
        Producto,
        on_delete=models.PROTECT,
        verbose_name="Producto"
    )
    cantidad = models.PositiveIntegerField(validators=[MinValueValidator(1)], verbose_name="Cantidad")
    precio_unitario_venta = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)], verbose_name="Precio Unitario de Venta")
    # Nuevos campos para promociones
    precio_unitario_con_descuento = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Precio Unitario con Descuento")
    descuento_total_linea = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name="Descuento Total en Línea")
    # descuento_aplicado_linea = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name="Descuento en Línea")

    class Meta:
        verbose_name = "Detalle de Pedido de Cliente"
        verbose_name_plural = "Detalles de Pedidos de Clientes"
        unique_together = ('pedido_cliente', 'producto')

    def __str__(self):
        return f"{self.cantidad} x {self.producto.nombre} @ {self.precio_unitario_venta}"

    def subtotal_linea_cliente(self):
        # Este método ahora debería devolver el subtotal DESPUÉS de descuentos.
        # El precio_unitario_con_descuento ya debería estar calculado y guardado.
        if self.cantidad is not None and self.precio_unitario_con_descuento is not None:
            return self.cantidad * self.precio_unitario_con_descuento
        elif self.cantidad is not None and self.precio_unitario_venta is not None: # Fallback si no hay descuento calculado
            return self.cantidad * self.precio_unitario_venta
        return 0
    subtotal_linea_cliente.short_description = "Subtotal Línea"
