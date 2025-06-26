from django.contrib import admin
from .models import MensajeContacto

# Register your models here.

@admin.register(MensajeContacto)
class MensajeContactoAdmin(admin.ModelAdmin):
    list_display = (
        'asunto', 
        'nombre_completo', 
        'email', 
        'fecha_envio', 
        'leido', 
        'respondido',
        'atendido_por'
    )
    list_filter = ('leido', 'respondido', 'fecha_envio', 'atendido_por')
    search_fields = ('nombre_completo', 'email', 'asunto', 'mensaje')
    readonly_fields = ('fecha_envio',) # Campos que no se deben editar directamente
    list_per_page = 25
