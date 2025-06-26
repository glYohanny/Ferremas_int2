from django.contrib import admin
from .models import PedidoProveedor, DetallePedidoProveedor, PedidoCliente, DetallePedidoCliente

# Register your models here.

class DetallePedidoProveedorInline(admin.TabularInline):
    model = DetallePedidoProveedor
    extra = 1
    autocomplete_fields = ['producto']
    readonly_fields = ('subtotal_linea_display',) 

    def subtotal_linea_display(self, obj):
        return obj.subtotal_linea()
    subtotal_linea_display.short_description = 'Subtotal Línea'


@admin.register(PedidoProveedor)
class PedidoProveedorAdmin(admin.ModelAdmin):
    list_display = ('id', 'proveedor', 'fecha_pedido', 'estado', 'total_pedido', 'creado_por')
    list_filter = ('estado', 'proveedor', 'fecha_pedido', 'creado_por')
    search_fields = ('id', 'proveedor__razon_social', 'numero_guia_despacho', 'notas')
    readonly_fields = ('fecha_pedido', 'fecha_creacion', 'fecha_actualizacion', 'subtotal', 'descuento_total', 'impuesto_total', 'total_pedido')
    autocomplete_fields = ['proveedor', 'creado_por']
    inlines = [DetallePedidoProveedorInline]
    date_hierarchy = 'fecha_pedido'

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        # Recalcular totales después de guardar los inlines
        form.instance.calcular_totales()

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        # Recalcular totales también al guardar el modelo principal (por si acaso)
        obj.calcular_totales()

@admin.register(DetallePedidoProveedor)
class DetallePedidoProveedorAdmin(admin.ModelAdmin):
    list_display = ('pedido_proveedor', 'producto', 'cantidad_solicitada', 'precio_unitario_compra', 'subtotal_linea_display', 'cantidad_recibida')
    list_filter = ('pedido_proveedor__proveedor', 'producto')
    search_fields = ('pedido_proveedor__id', 'producto__nombre')
    autocomplete_fields = ['pedido_proveedor', 'producto']
    readonly_fields = ('subtotal_linea_display',)

    def subtotal_linea_display(self, obj):
        return obj.subtotal_linea()
    subtotal_linea_display.short_description = 'Subtotal Línea'

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        # Cuando se guarda un detalle, recalcular los totales del pedido padre
        if obj.pedido_proveedor:
            obj.pedido_proveedor.calcular_totales()

    def delete_model(self, request, obj):
        pedido_padre = obj.pedido_proveedor
        super().delete_model(request, obj)
        if pedido_padre:
            pedido_padre.calcular_totales()

# --- Admin para Pedido de Cliente ---

class DetallePedidoClienteInline(admin.TabularInline):
    model = DetallePedidoCliente
    extra = 1
    autocomplete_fields = ['producto']
    readonly_fields = ('subtotal_linea_display',)

    def subtotal_linea_display(self, obj):
        return obj.subtotal_linea_cliente()
    subtotal_linea_display.short_description = 'Subtotal Línea'

@admin.register(PedidoCliente)
class PedidoClienteAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'cliente', 'fecha_pedido', 'estado', 'estado_preparacion', 
        'bodeguero_asignado', 'total_pedido', 'metodo_envio', 'sucursal_despacho', 'creado_por_personal'
    )
    list_filter = (
        'estado', 'estado_preparacion', 'metodo_envio', 'sucursal_despacho', 
        'bodeguero_asignado', 'cliente', 'fecha_pedido', 'creado_por_personal'
    )
    search_fields = (
        'id', 'cliente__usuario__email', 'cliente__usuario__first_name', 
        'sucursal_despacho__nombre', 'bodeguero_asignado__email'
    )
    readonly_fields = ('fecha_pedido', 'fecha_creacion', 'fecha_actualizacion', 'subtotal', 'descuento_total', 'impuesto_total', 'total_pedido')
    autocomplete_fields = ['cliente', 'creado_por_personal', 'sucursal_despacho', 'bodeguero_asignado']
    inlines = [DetallePedidoClienteInline]
    date_hierarchy = 'fecha_pedido'

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        form.instance.calcular_totales_cliente()

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        obj.calcular_totales_cliente()

@admin.register(DetallePedidoCliente)
class DetallePedidoClienteAdmin(admin.ModelAdmin):
    list_display = ('pedido_cliente', 'producto', 'cantidad', 'precio_unitario_venta', 'subtotal_linea_display')
    list_filter = ('pedido_cliente__cliente', 'producto')
    search_fields = ('pedido_cliente__id', 'producto__nombre')
    autocomplete_fields = ['pedido_cliente', 'producto']
    readonly_fields = ('subtotal_linea_display',)

    def subtotal_linea_display(self, obj):
        return obj.subtotal_linea_cliente()
    subtotal_linea_display.short_description = 'Subtotal Línea'

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if obj.pedido_cliente:
            obj.pedido_cliente.calcular_totales_cliente()

    def delete_model(self, request, obj):
        pedido_padre = obj.pedido_cliente
        super().delete_model(request, obj)
        if pedido_padre:
            pedido_padre.calcular_totales_cliente()
            
            
