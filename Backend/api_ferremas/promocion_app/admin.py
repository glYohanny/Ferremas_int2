from django.contrib import admin
from .models import Promocion

# Register your models here.

@admin.register(Promocion)
class PromocionAdmin(admin.ModelAdmin):
    list_display = (
        'titulo',
        'tipo_promocion',
        'valor',
        'fecha_inicio',
        'fecha_fin',
        'activo',
        'objetivo_promocion', # Esto mostrará la representación __str__ del objeto relacionado
        'codigo_promocional',
        'usos_actuales',
        'limite_uso_total',
    )
    list_filter = ('tipo_promocion', 'activo', 'fecha_inicio', 'fecha_fin', 'content_type')
    search_fields = ('titulo', 'descripcion', 'codigo_promocional')
    readonly_fields = ('usos_actuales',)
    fieldsets = (
        (None, {'fields': ('titulo', 'descripcion', 'tipo_promocion', 'valor')}),
        ('Vigencia y Estado', {'fields': ('fecha_inicio', 'fecha_fin', 'activo')}),
        ('Aplicabilidad', {'fields': ('content_type', 'object_id', 'solo_para_clientes_registrados')}),
        ('Control y Restricciones', {'fields': ('codigo_promocional', 'restricciones', 'limite_uso_total', 'usos_actuales')}),
    )
    list_per_page = 20