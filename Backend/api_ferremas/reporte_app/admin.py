from django.contrib import admin
from .models import ReporteConfigurado

# Register your models here.

@admin.register(ReporteConfigurado)
class ReporteConfiguradoAdmin(admin.ModelAdmin):
    list_display = (
        'nombre',
        'categoria',
        'tipo_especifico',
        'formato_salida_preferido',
        'creado_por',
        'ultima_ejecucion',
        'fecha_actualizacion'
    )
    list_filter = ('categoria', 'formato_salida_preferido', 'creado_por', 'ultima_ejecucion')
    search_fields = ('nombre', 'descripcion', 'tipo_especifico', 'parametros')
    readonly_fields = ('fecha_creacion', 'fecha_actualizacion', 'ultima_ejecucion')
    autocomplete_fields = ['creado_por']

    fieldsets = (
        (None, {
            'fields': ('nombre', 'descripcion', 'categoria', 'tipo_especifico')
        }),
        ('Configuración y Parámetros', {
            'fields': ('parametros', 'formato_salida_preferido')
        }),
        ('Auditoría y Ejecución', {
            'fields': ('creado_por', 'ultima_ejecucion', 'fecha_creacion', 'fecha_actualizacion')
        }),
    )
