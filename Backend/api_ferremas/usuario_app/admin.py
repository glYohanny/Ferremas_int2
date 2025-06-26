from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario, Personal, Cliente

# Register your models here.

class PerfilPersonalInline(admin.StackedInline):
    """
    Permite editar el perfil de Personal directamente desde la vista de Usuario.
    """
    model = Personal
    can_delete = False
    verbose_name_plural = 'Perfil de Personal'
    fk_name = 'usuario'
    # Campos a mostrar en el inline
    fields = ('rol', 'sucursal', 'bodega')
    # Ayuda a la carga si hay muchas sucursales o bodegas
    autocomplete_fields = ('sucursal', 'bodega')


class PerfilClienteInline(admin.StackedInline):
    """
    Permite editar el perfil de Cliente directamente desde la vista de Usuario.
    """
    model = Cliente
    can_delete = False
    verbose_name_plural = 'Perfil de Cliente'
    fk_name = 'usuario'
    # Campos a mostrar en el inline
    fields = ('rut', 'direccion_calle_numero', 'num_telefono')


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    """
    Configuración del admin para el modelo Usuario base.
    Hereda de UserAdmin para mantener la funcionalidad de gestión de usuarios de Django.
    """
    # Columnas a mostrar en la lista de usuarios
    list_display = ('email', 'username', 'first_name', 'last_name', 'is_staff', 'is_active', 'get_tipo_perfil')
    # Campos por los que se puede buscar
    search_fields = ('email', 'username', 'first_name', 'last_name')
    # Orden por defecto
    ordering = ('email',)
    # Filtros personalizados
    list_filter = UserAdmin.list_filter + ('perfil_personal__rol', 'perfil_personal__sucursal__nombre')

    # Inlines para editar perfiles relacionados
    inlines = [PerfilPersonalInline, PerfilClienteInline]

    def get_tipo_perfil(self, obj):
        """
        Método para mostrar el tipo de perfil en la lista de usuarios.
        """
        if hasattr(obj, 'perfil_personal') and obj.perfil_personal is not None:
            return "Personal"
        if hasattr(obj, 'perfil_cliente') and obj.perfil_cliente is not None:
            return "Cliente"
        return "Usuario Base"
    get_tipo_perfil.short_description = 'Tipo de Perfil'

    def get_inline_instances(self, request, obj=None):
        """
        Evita mostrar los inlines al crear un nuevo usuario, ya que aún no existe.
        """
        if not obj:
            return []
        return super().get_inline_instances(request, obj)


@admin.register(Personal)
class PersonalAdmin(admin.ModelAdmin):
    """
    Configuración del admin para el modelo Personal.
    """
    list_display = ('usuario', 'get_usuario_email', 'get_rol_display', 'sucursal', 'bodega')
    search_fields = ('usuario__email', 'usuario__username', 'usuario__first_name', 'usuario__last_name', 'rol')
    list_filter = ('rol', 'sucursal', 'bodega')
    autocomplete_fields = ['usuario', 'sucursal', 'bodega']

    def get_usuario_email(self, obj):
        return obj.usuario.email
    get_usuario_email.short_description = 'Email del Usuario'
    get_usuario_email.admin_order_field = 'usuario__email'


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    """
    Configuración del admin para el modelo Cliente.
    """
    list_display = ('usuario', 'get_usuario_email', 'rut', 'get_usuario_nombre_completo', 'num_telefono', 'fecha_creacion_perfil')
    search_fields = ('usuario__email', 'usuario__username', 'usuario__first_name', 'usuario__last_name', 'rut', 'num_telefono')
    readonly_fields = ('fecha_creacion_perfil',)
    fields = ('usuario', 'rut', 'direccion_calle_numero', 'num_telefono')
    autocomplete_fields = ['usuario']

    def get_usuario_email(self, obj):
        return obj.usuario.email if obj.usuario else 'N/A'
    get_usuario_email.short_description = 'Email Usuario'
    get_usuario_email.admin_order_field = 'usuario__email'

    def get_usuario_nombre_completo(self, obj):
        if obj.usuario:
            return f"{obj.usuario.first_name} {obj.usuario.last_name}".strip()
        return 'N/A'
    get_usuario_nombre_completo.short_description = 'Nombre Completo'
    get_usuario_nombre_completo.admin_order_field = 'usuario__last_name'

