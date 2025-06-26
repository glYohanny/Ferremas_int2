from django.contrib import admin
from .models import Pago, MetodoPago, EstadoPago, TipoCuota # Importa todos los modelos relevantes

@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'pedido_cliente_link', # Método para mostrar el link al pedido
        'fecha_pago',
        'monto_pagado',
        'metodo_pago',
        'estado_pago',
        'tipo_cuotas',
        'numero_cuotas',
        'id_transaccion_pasarela',
    )
    list_filter = ('estado_pago', 'metodo_pago', 'tipo_cuotas', 'fecha_pago')
    search_fields = (
        'pedido_cliente__id', # Buscar por ID de pedido
        'pedido_cliente__cliente__usuario__email', # Buscar por email del cliente
        'id_transaccion_pasarela', # Buscar por ID de transacción de pasarela
    )
    readonly_fields = ('fecha_pago', 'datos_adicionales_pasarela') # Campos que no se deben editar manualmente
    autocomplete_fields = ['pedido_cliente'] # Permite autocompletar el campo pedido_cliente
    ordering = ('-fecha_pago',) # Ordenar por fecha de pago descendente por defecto

    def pedido_cliente_link(self, obj):
        if obj.pedido_cliente:
            return f"Pedido #{obj.pedido_cliente.id}" # Puedes hacer esto un link real en el admin si configuras la URL
        return "N/A"
    pedido_cliente_link.short_description = 'Pedido Cliente' # Nombre de la columna

# Si quieres registrar los modelos de choices (MetodoPago, EstadoPago, TipoCuota)
# en el admin para ver sus opciones, puedes hacerlo, pero generalmente no es necesario editarlos.
# admin.site.register(MetodoPago)
# admin.site.register(EstadoPago)
# admin.site.register(TipoCuota)