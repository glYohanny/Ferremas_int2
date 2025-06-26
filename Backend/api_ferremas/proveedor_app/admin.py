from django.contrib import admin
from .models import Proveedor

@admin.register(Proveedor)
class ProveedorAdmin(admin.ModelAdmin):
    list_display = ('razon_social', 'rut', 'nombre_fantasia', 'comuna', 'activo')
    list_filter = ('activo', 'comuna__region', 'comuna')
    search_fields = ('razon_social', 'rut', 'nombre_fantasia', 'id') # Añadido 'id'
    readonly_fields = ('fecha_registro',)
    # Si ComunaAdmin tiene search_fields, podrías añadir 'comuna' a autocomplete_fields
    # autocomplete_fields = ['comuna']