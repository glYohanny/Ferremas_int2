from django.db import models
from producto_app.models import Producto
from sucursal_app.models import Sucursal, Bodega
from django.conf import settings # Para la ForeignKey a User (Personal)
from pedido_app.models import PedidoCliente # Importación cíclica potencial, manejar con cuidado o string

class InventarioSucursal(models.Model):
    # id es automático
    sucursal = models.OneToOneField(
        Sucursal,
        on_delete=models.CASCADE, # Si se elimina la sucursal, se elimina su inventario principal
        related_name="inventario_general",
        verbose_name="Sucursal"
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación del Inventario")
    ultima_actualizacion_general = models.DateTimeField(auto_now=True, verbose_name="Última Actualización General")

    class Meta:
        verbose_name = "Inventario de Sucursal"
        verbose_name_plural = "Inventarios de Sucursal"
        ordering = ['sucursal__nombre']

    def __str__(self):
        return f"Inventario de {self.sucursal.nombre}"

    def get_stock_producto_en_sucursal(self, producto_id):
        """
        Calcula el stock total de un producto específico en todas las bodegas
        asociadas a esta instancia de InventarioSucursal.
        """
        total_stock = self.detalles_bodega \
            .filter(producto_id=producto_id) \
            .aggregate(total=models.Sum('cantidad'))['total']
        return total_stock or 0

    def get_stock_total_de_todos_los_productos(self):
        """
        Calcula el stock total de todos los productos en todas las bodegas
        asociadas a esta instancia de InventarioSucursal.
        """
        total_stock = self.detalles_bodega \
            .aggregate(total=models.Sum('cantidad'))['total']
        return total_stock or 0

    @property
    def stock_consolidado_por_producto(self):
        """
        Devuelve un diccionario con el stock consolidado por producto en la sucursal.
        Ej: {'Martillo': 50, 'Destornillador': 30}
        """
        stock_data = self.detalles_bodega \
            .values('producto__nombre') \
            .annotate(cantidad_total=models.Sum('cantidad')) \
            .order_by('producto__nombre')
        
        return {
            item['producto__nombre']: item['cantidad_total']
            for item in stock_data if item['cantidad_total'] is not None and item['cantidad_total'] > 0
        }

class DetalleInventarioBodega(models.Model):
    # Este modelo es similar al StockInventario anterior
    inventario_sucursal = models.ForeignKey(
        InventarioSucursal,
        on_delete=models.CASCADE, # Si se elimina el inventario de la sucursal, se eliminan sus detalles
        related_name="detalles_bodega"
    )
    producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE, # Si se elimina el producto, se elimina su registro de stock
        related_name="stock_en_bodegas"
    )
    bodega = models.ForeignKey(
        Bodega,
        on_delete=models.CASCADE, # Si se elimina la bodega, se elimina su registro de stock
        related_name="stock_productos"
    )
    cantidad = models.PositiveIntegerField(default=0, verbose_name="Cantidad en Stock")
    stock_minimo = models.PositiveIntegerField(null=True, blank=True, verbose_name="Stock Mínimo")
    stock_maximo = models.PositiveIntegerField(null=True, blank=True, verbose_name="Stock Máximo")
    ultima_actualizacion = models.DateTimeField(auto_now=True, verbose_name="Última Actualización")

    class Meta:
        verbose_name = "Detalle de Stock en Bodega"
        verbose_name_plural = "Detalles de Stock en Bodega"
        # Asegura que solo haya un registro de stock para un producto en una bodega específica
        # dentro del contexto del inventario de una sucursal (implícito por la FK a InventarioSucursal y Bodega)
        unique_together = ('inventario_sucursal', 'producto', 'bodega')
        ordering = ['inventario_sucursal', 'bodega', 'producto']

    def __str__(self):
        return f"{self.cantidad} x {self.producto.nombre} en Bodega {self.bodega.tipo_bodega.tipo} (Suc: {self.inventario_sucursal.sucursal.nombre})"


class TraspasoInternoStock(models.Model):
    # id_pedido_interno es automático (id)
    sucursal_origen = models.ForeignKey(
        Sucursal,
        on_delete=models.PROTECT, # Proteger para no borrar sucursales con traspasos pendientes/históricos
        related_name="traspasos_origen",
        verbose_name="Sucursal de Origen"
    )
    sucursal_destino = models.ForeignKey(
        Sucursal,
        on_delete=models.PROTECT,
        related_name="traspasos_destino",
        verbose_name="Sucursal de Destino"
    )
    fecha_pedido = models.DateTimeField(auto_now_add=True, verbose_name="Fecha del Pedido de Traspaso")

    class EstadoTraspaso(models.TextChoices):
        PENDIENTE = 'PENDIENTE', 'Pendiente'
        EN_TRANSITO = 'EN_TRANSITO', 'En Tránsito'
        RECIBIDO_PENDIENTE_VERIFICACION = 'RECIBIDO_PENDIENTE_VERIFICACION', 'Recibido, Pendiente de Verificación' # Nuevo estado
        COMPLETADO = 'COMPLETADO', 'Completado'
        CANCELADO = 'CANCELADO', 'Cancelado'

    estado = models.CharField(
        max_length=35, # Ajustado para el nuevo estado más largo
        choices=EstadoTraspaso.choices,
        default=EstadoTraspaso.PENDIENTE,
        verbose_name="Estado del Traspaso"
    )

    class MotivoTraspaso(models.TextChoices):
        REABASTECIMIENTO = 'REABASTECIMIENTO', 'Reabastecimiento'
        TRASPASO_DIRECTO = 'TRASPASO_DIRECTO', 'Traspaso Directo' # Renombrado de "Traspaso" para evitar ambigüedad
        PARA_COMPLETAR_PEDIDO = 'PARA_COMPLETAR_PEDIDO', 'Para Completar Pedido Cliente' # Más específico
        AJUSTE_INVENTARIO = 'AJUSTE_INVENTARIO', 'Ajuste de Inventario'
        OTRO = 'OTRO', 'Otro'


    motivo = models.CharField(
        max_length=30,
        choices=MotivoTraspaso.choices,
        verbose_name="Motivo del Traspaso"
    )
    comentarios = models.TextField(blank=True, null=True, verbose_name="Comentarios Adicionales")
    fecha_envio = models.DateTimeField(blank=True, null=True, verbose_name="Fecha de Envío")
    fecha_recepcion = models.DateTimeField(blank=True, null=True, verbose_name="Fecha de Recepción")

    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, # Referencia al modelo de usuario personalizado (Personal)
        on_delete=models.SET_NULL, # Si el usuario se elimina, mantener el registro del traspaso
        null=True, blank=True,
        related_name="traspasos_creados",
        verbose_name="Creado Por"
    )
    # Opcional: Enlace al PedidoCliente que originó este traspaso automático
    pedido_cliente_origen = models.ForeignKey(
        'pedido_app.PedidoCliente', # Usar string para evitar importación cíclica directa
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="traspasos_generados",
        verbose_name="Pedido Cliente Origen (Automático)"
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación del Registro")
    fecha_actualizacion = models.DateTimeField(auto_now=True, verbose_name="Fecha de Última Actualización")

    class Meta:
        verbose_name = "Traspaso Interno de Stock"
        verbose_name_plural = "Traspasos Internos de Stock"
        ordering = ['-fecha_pedido']

    def __str__(self):
        return f"Traspaso de {self.sucursal_origen.nombre} a {self.sucursal_destino.nombre} ({self.get_estado_display()})"


class DetalleTraspasoStock(models.Model):
    traspaso = models.ForeignKey(
        TraspasoInternoStock,
        related_name="detalles_traspaso",
        on_delete=models.CASCADE,
        verbose_name="Traspaso Asociado"
    )
    producto = models.ForeignKey(
        Producto,
        on_delete=models.PROTECT, # Proteger para no borrar productos si están en un traspaso
        verbose_name="Producto"
    )
    cantidad_solicitada = models.PositiveIntegerField(verbose_name="Cantidad Solicitada")
    cantidad_enviada = models.PositiveIntegerField(null=True, blank=True, verbose_name="Cantidad Enviada")
    cantidad_recibida = models.PositiveIntegerField(null=True, blank=True, verbose_name="Cantidad Recibida")
    
    # Bodegas específicas para este ítem del traspaso.
    # Asumimos que estas bodegas pertenecen a sucursal_origen y sucursal_destino del Traspaso padre.
    # La validación de esta pertenencia se podría hacer en el serializer o en el clean() del modelo.
    bodega_origen = models.ForeignKey(
        Bodega, related_name='items_traspasados_desde', 
        on_delete=models.PROTECT, # Proteger para no borrar bodegas con traspasos referenciándolas
        verbose_name="Bodega de Origen del Ítem", null=True, blank=False # Hacer no nulo si siempre se requiere
    )
    bodega_destino = models.ForeignKey(
        Bodega, related_name='items_recibidos_en', 
        on_delete=models.PROTECT, # Proteger para no borrar bodegas con traspasos referenciándolas
        verbose_name="Bodega de Destino del Ítem", null=True, blank=False # Hacer no nulo si siempre se requiere
    )

    class Meta:
        verbose_name = "Detalle de Traspaso de Stock"
        verbose_name_plural = "Detalles de Traspasos de Stock"
        unique_together = ('traspaso', 'producto') # Para no repetir el mismo producto en un traspaso

    def __str__(self):
        return f"{self.cantidad_solicitada} x {self.producto.nombre} (Traspaso ID: {self.traspaso.id})"