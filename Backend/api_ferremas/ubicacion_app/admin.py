from django.contrib import admin
from .models import Region, Comuna

@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ('nombre',)
    search_fields = ('nombre',)
    ordering = ('nombre',)

@admin.register(Comuna)
class ComunaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'region_nombre')
    search_fields = ('nombre', 'region__nombre')
    list_filter = ('region',)
    autocomplete_fields = ['region'] # Para una mejor selección de la región
    ordering = ('region__nombre', 'nombre',)

    def region_nombre(self, obj):
        if obj.region:
            return obj.region.nombre
        return None
    region_nombre.short_description = 'Región' # Nombre de la columna en el admin
    region_nombre.admin_order_field = 'region__nombre' # Permite ordenar por este campo

# Si prefieres el registro simple sin clases Admin personalizadas:
# admin.site.register(Region)
# admin.site.register(Comuna)