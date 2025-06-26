from django.contrib import admin
from .models import RegistroActividad

# Register your models here.

@admin.register(RegistroActividad)
class RegistroActividadAdmin(admin.ModelAdmin):
    list_display = (
        'fecha_hora',
        'usuario',
        'accion',
        'descripcion_corta',
        'objeto_relacionado',
        'ip_address',
    )
    list_filter = ('fecha_hora', 'accion', 'usuario', 'content_type')
    search_fields = ('usuario__email', 'usuario__username', 'accion', 'descripcion', 'ip_address')
    readonly_fields = ('fecha_hora', 'usuario', 'accion', 'descripcion', 'content_type', 'object_id', 'objeto_relacionado', 'ip_address') # Hacer todos de solo lectura

    def descripcion_corta(self, obj):
        return (obj.descripcion[:75] + '...') if obj.descripcion and len(obj.descripcion) > 75 else obj.descripcion
    descripcion_corta.short_description = 'Descripción'
