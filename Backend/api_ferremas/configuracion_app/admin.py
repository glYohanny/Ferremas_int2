from django.contrib import admin
from django.http import HttpResponseRedirect
from django.urls import reverse # Importar reverse
from .models import ConfiguracionGlobal

# Register your models here.

@admin.register(ConfiguracionGlobal)
class ConfiguracionGlobalAdmin(admin.ModelAdmin):
    list_display = ('nombre_empresa', 'rut_empresa', 'email_contacto', 'modo_mantenimiento', 'fecha_actualizacion')
    readonly_fields = ('fecha_actualizacion',) # _singleton es editable=False en el modelo

    fieldsets = (
        ("Datos de la Empresa", {
            'fields': ('nombre_empresa', 'rut_empresa', 'direccion_empresa', 'telefono_contacto', 'email_contacto', 'logo_empresa')
        }),
        ("Parámetros Financieros", {
            'fields': ('porcentaje_iva',)
        }),
        ("Límites y Umbrales", {
            'fields': ('monto_minimo_despacho_gratuito',)
        }),
        ("Textos Legales y Enlaces", {
            'fields': ('url_terminos_condiciones', 'url_politica_privacidad')
        }),
        ("Configuraciones de Funcionalidades", {
            'fields': ('modo_mantenimiento', 'mensaje_mantenimiento')
        }),
        ("Auditoría", {
            'fields': ('fecha_actualizacion',),
        }),
    )

    def has_add_permission(self, request):
        # No permitir añadir nuevas instancias si ya existe una
        return not ConfiguracionGlobal.objects.exists()

    def changelist_view(self, request, extra_context=None):
        # Si no hay instancias, redirigir a la vista de añadir.
        # Si hay una instancia, redirigir directamente a la vista de edición de esa instancia.
        app_label = self.model._meta.app_label
        model_name = self.model._meta.model_name

        if not ConfiguracionGlobal.objects.exists():
            return HttpResponseRedirect(reverse(f'admin:{app_label}_{model_name}_add'))
        
        # Obtener la única instancia (o la primera, si por error hubiera más)
        config_obj = ConfiguracionGlobal.objects.first()
        return HttpResponseRedirect(reverse(f'admin:{app_label}_{model_name}_change', args=(config_obj.pk,)))
