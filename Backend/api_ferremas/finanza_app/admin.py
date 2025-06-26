from django.contrib import admin
from .models import (
    CuentaPorCobrar, CuentaPorPagar,
    PagoRecibido, PagoRealizado,
    CuentaBancaria, MovimientoCaja,
    DocumentoFinanciero
)

@admin.register(CuentaPorCobrar)
class CuentaPorCobrarAdmin(admin.ModelAdmin):
    list_display = ('id', 'cliente', 'pedido_cliente', 'monto_total', 'saldo_pendiente', 'fecha_vencimiento', 'estado')
    list_filter = ('estado', 'cliente', 'fecha_vencimiento', 'fecha_emision')
    search_fields = ('id', 'cliente__nombre', 'cliente__apellido', 'pedido_cliente__id')
    readonly_fields = ('get_saldo_pendiente_display', 'fecha_creacion', 'fecha_actualizacion')
    autocomplete_fields = ['cliente', 'pedido_cliente']
    date_hierarchy = 'fecha_emision'

    fieldsets = (
        (None, {
            'fields': ('cliente', 'pedido_cliente', 'monto_total', 'monto_pagado', 'estado')
        }),
        ('Fechas', {
            'fields': ('fecha_emision', 'fecha_vencimiento')
        }),
        ('Auditoría', {
            'fields': ('get_saldo_pendiente_display', 'fecha_creacion', 'fecha_actualizacion'),
        }),
    )

    def get_saldo_pendiente_display(self, obj):
        return obj.saldo_pendiente
    get_saldo_pendiente_display.short_description = 'Saldo Pendiente'

@admin.register(CuentaPorPagar)
class CuentaPorPagarAdmin(admin.ModelAdmin):
    list_display = ('id', 'proveedor', 'pedido_proveedor', 'monto_total', 'saldo_pendiente', 'fecha_vencimiento', 'estado')
    list_filter = ('estado', 'proveedor', 'fecha_vencimiento', 'fecha_emision')
    search_fields = ('id', 'proveedor__razon_social', 'pedido_proveedor__id')
    readonly_fields = ('get_saldo_pendiente_display', 'fecha_creacion', 'fecha_actualizacion')
    autocomplete_fields = ['proveedor', 'pedido_proveedor']
    date_hierarchy = 'fecha_emision'

    fieldsets = (
        (None, {
            'fields': ('proveedor', 'pedido_proveedor', 'monto_total', 'monto_pagado', 'estado')
        }),
        ('Fechas', {
            'fields': ('fecha_emision', 'fecha_vencimiento')
        }),
        ('Auditoría', {
            'fields': ('get_saldo_pendiente_display', 'fecha_creacion', 'fecha_actualizacion'),
        }),
    )

    def get_saldo_pendiente_display(self, obj):
        return obj.saldo_pendiente
    get_saldo_pendiente_display.short_description = 'Saldo Pendiente'

@admin.register(PagoRecibido)
class PagoRecibidoAdmin(admin.ModelAdmin):
    list_display = ('id', 'cliente', 'cuenta_por_cobrar', 'fecha_pago', 'monto', 'metodo_pago', 'registrado_por')
    list_filter = ('metodo_pago', 'cliente', 'fecha_pago', 'registrado_por')
    search_fields = ('id', 'cliente__nombre', 'cliente__apellido', 'referencia_pago', 'cuenta_por_cobrar__id')
    readonly_fields = ('fecha_creacion',)
    autocomplete_fields = ['cliente', 'cuenta_por_cobrar', 'registrado_por']
    date_hierarchy = 'fecha_pago'

@admin.register(PagoRealizado)
class PagoRealizadoAdmin(admin.ModelAdmin):
    list_display = ('id', 'proveedor', 'cuenta_por_pagar', 'fecha_pago', 'monto', 'metodo_pago', 'registrado_por')
    list_filter = ('metodo_pago', 'proveedor', 'fecha_pago', 'registrado_por')
    search_fields = ('id', 'proveedor__razon_social', 'referencia_pago', 'cuenta_por_pagar__id')
    readonly_fields = ('fecha_creacion',)
    autocomplete_fields = ['proveedor', 'cuenta_por_pagar', 'registrado_por']
    date_hierarchy = 'fecha_pago'

@admin.register(CuentaBancaria)
class CuentaBancariaAdmin(admin.ModelAdmin):
    list_display = ('banco', 'numero_cuenta', 'tipo_cuenta', 'moneda', 'titular', 'saldo_actual', 'activa')
    list_filter = ('banco', 'tipo_cuenta', 'moneda', 'activa')
    search_fields = ('banco', 'numero_cuenta', 'titular')
    readonly_fields = ('fecha_creacion', 'fecha_actualizacion')

@admin.register(MovimientoCaja)
class MovimientoCajaAdmin(admin.ModelAdmin):
    list_display = ('fecha', 'tipo', 'concepto', 'monto', 'origen_destino', 'usuario_responsable')
    list_filter = ('tipo', 'origen_destino', 'fecha', 'usuario_responsable', 'cuenta_bancaria_asociada')
    search_fields = ('concepto', 'referencia', 'usuario_responsable__username', 'usuario_responsable__email')
    readonly_fields = ('fecha_creacion',)
    autocomplete_fields = ['usuario_responsable', 'cuenta_bancaria_asociada']
    date_hierarchy = 'fecha'

@admin.register(DocumentoFinanciero)
class DocumentoFinancieroAdmin(admin.ModelAdmin):
    list_display = ('numero_documento', 'tipo_documento', 'entidad_asociada_display', 'monto_total', 'fecha_emision', 'estado')
    list_filter = ('tipo_documento', 'estado', 'fecha_emision', 'content_type')
    search_fields = ('numero_documento', 'object_id') # Búsqueda por object_id puede ser útil
    readonly_fields = ('fecha_creacion', 'fecha_actualizacion', 'entidad_asociada_display')
    autocomplete_fields = ['pedido_cliente_asociado', 'pedido_proveedor_asociado'] # No para GenericForeignKey directamente
    date_hierarchy = 'fecha_emision'

    fieldsets = (
        (None, {
            'fields': ('tipo_documento', 'numero_documento', 'estado')
        }),
        ('Entidad Asociada', {
            'fields': ('content_type', 'object_id') # Para seleccionar la entidad genérica
        }),
        ('Montos', {
            'fields': ('monto_neto', 'monto_impuesto', 'monto_total')
        }),
        ('Fechas', {
            'fields': ('fecha_emision', 'fecha_vencimiento')
        }),
        ('Asociaciones a Pedidos (Opcional)', {
            'classes': ('collapse',),
            'fields': ('pedido_cliente_asociado', 'pedido_proveedor_asociado')
        }),
        ('Otros', {
            'fields': ('url_pdf',)
        }),
        ('Auditoría', {
            'fields': ('fecha_creacion', 'fecha_actualizacion'),
        }),
    )

    def entidad_asociada_display(self, obj):
        return obj.entidad_asociada
    entidad_asociada_display.short_description = "Entidad Asociada"

    # Para que GenericForeignKey funcione bien con autocomplete_fields,
    # se necesitaría una solución más personalizada, como django-generic-admin o similar,
    # o dejar que el usuario seleccione el ContentType y luego ingrese el ID del objeto.
    # Por simplicidad, no se usa autocomplete_fields para 'content_type' y 'object_id' aquí.