from django.contrib import admin
from .models import InventarioSucursal, DetalleInventarioBodega, TraspasoInternoStock, DetalleTraspasoStock

# Register your models here.

class DetalleInventarioBodegaInline(admin.TabularInline): # O admin.StackedInline
    model = DetalleInventarioBodega
    extra = 1 # Número de formularios extra para añadir detalles
    # raw_id_fields = ('producto', 'bodega') # Útil si tienes muchos productos/bodegas
    autocomplete_fields = ['producto', 'bodega']

@admin.register(InventarioSucursal)
class InventarioSucursalAdmin(admin.ModelAdmin):
    list_display = ('sucursal', 'fecha_creacion', 'ultima_actualizacion_general')
    search_fields = ('sucursal__nombre',)
    readonly_fields = ('fecha_creacion', 'ultima_actualizacion_general')
    inlines = [DetalleInventarioBodegaInline]

@admin.register(DetalleInventarioBodega)
class DetalleInventarioBodegaAdmin(admin.ModelAdmin):
    list_display = ('inventario_sucursal', 'producto', 'bodega', 'cantidad', 'ultima_actualizacion')
    list_filter = ('inventario_sucursal__sucursal', 'bodega', 'producto__categoria')
    search_fields = ('producto__nombre', 'bodega__sucursal__nombre', 'inventario_sucursal__sucursal__nombre')
    autocomplete_fields = ['inventario_sucursal', 'producto', 'bodega'] # Asegúrate que InventarioSucursalAdmin tenga search_fields si es necesario

class DetalleTraspasoStockInline(admin.TabularInline):
    model = DetalleTraspasoStock
    extra = 1
    autocomplete_fields = ['producto']
    # Podrías añadir campos readonly para cantidades enviadas/recibidas si se manejan en otro flujo

@admin.register(TraspasoInternoStock)
class TraspasoInternoStockAdmin(admin.ModelAdmin):
    list_display = ('id', 'sucursal_origen', 'sucursal_destino', 'estado', 'motivo', 'fecha_pedido', 'creado_por', 'pedido_cliente_origen')
    list_filter = ('estado', 'motivo', 'sucursal_origen', 'sucursal_destino', 'creado_por')
    search_fields = ('id', 'sucursal_origen__nombre', 'sucursal_destino__nombre', 'comentarios', 'pedido_cliente_origen__id')
    readonly_fields = ('fecha_pedido', 'fecha_creacion', 'fecha_actualizacion')
    autocomplete_fields = ['sucursal_origen', 'sucursal_destino', 'creado_por', 'pedido_cliente_origen']
    inlines = [DetalleTraspasoStockInline]
    date_hierarchy = 'fecha_pedido'
