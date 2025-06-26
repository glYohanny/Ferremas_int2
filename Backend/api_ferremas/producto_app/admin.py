from django.contrib import admin
from .models import Producto, Categoria, Marca

# Register your models here.

@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ('nombre',)
    search_fields = ('nombre',)

@admin.register(Marca)
class MarcaAdmin(admin.ModelAdmin):
    list_display = ('nombre',)
    search_fields = ('nombre',)

@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'marca', 'categoria', 'precio', 'fecha_actualizacion')
    list_filter = ('categoria', 'marca', 'fecha_actualizacion')
    search_fields = ('nombre', 'marca__nombre', 'categoria__nombre', 'descripcion')
    readonly_fields = ('fecha_creacion', 'fecha_actualizacion')
    # Si tienes muchas marcas o categorías, podrías usar autocomplete_fields aquí también
    # autocomplete_fields = ['marca', 'categoria']
