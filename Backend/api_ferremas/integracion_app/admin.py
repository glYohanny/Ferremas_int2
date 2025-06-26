from django.contrib import admin
from .models import ConfiguracionApiExterna

# Register your models here.

@admin.register(ConfiguracionApiExterna)
class ConfiguracionApiExternaAdmin(admin.ModelAdmin):
    list_display = ('nombre_integracion', 'tipo', 'activa', 'fecha_actualizacion')
    list_filter = ('tipo', 'activa')
    search_fields = ('nombre_integracion', 'descripcion', 'base_url')
    readonly_fields = ('fecha_creacion', 'fecha_actualizacion')

    fieldsets = (
        (None, {
            'fields': ('nombre_integracion', 'descripcion', 'tipo', 'activa')
        }),
        ('Detalles de Conexión (¡Manejar con Cuidado!)', {
            'classes': ('collapse',), # Opcional: colapsar esta sección por defecto
            'fields': ('base_url', 'api_key', 'api_secret', 'configuracion_adicional'),
            'description': "<b>¡ADVERTENCIA!</b> La información de API Key y Secret es sensible. Considere usar variables de entorno o un gestor de secretos para producción."
        }),
        ('Auditoría', {
            'fields': ('fecha_creacion', 'fecha_actualizacion'),
        }),
    )
