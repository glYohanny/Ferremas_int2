from django.contrib import admin
from .models import Sucursal, Bodega, TipoBodega

@admin.register(TipoBodega)
class TipoBodegaAdmin(admin.ModelAdmin):
    list_display = ('tipo',)
    search_fields = ('tipo',)

@admin.register(Sucursal)
class SucursalAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'comuna', 'region', 'fecha_registro')
    list_filter = ('region', 'comuna')
    search_fields = ('nombre', 'direccion', 'comuna__nombre', 'region__nombre')
    readonly_fields = ('fecha_registro',)

@admin.register(Bodega)
class BodegaAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'sucursal', 'tipo_bodega', 'direccion')
    list_filter = ('sucursal', 'tipo_bodega')
    search_fields = ('direccion', 'sucursal__nombre', 'tipo_bodega__tipo')
    # Si tienes muchas sucursales o tipos de bodega, podrías usar autocomplete_fields aquí también
    # autocomplete_fields = ['sucursal', 'tipo_bodega']

# Nota: El __str__ de Bodega es "Bodega {self.tipo_bodega.tipo} - {self.sucursal.nombre}"
# por lo que search_fields en TipoBodegaAdmin y SucursalAdmin son importantes si
# quieres que la búsqueda global en el admin de Bodega funcione bien a través de esos campos.