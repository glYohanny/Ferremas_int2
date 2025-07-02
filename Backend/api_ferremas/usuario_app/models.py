from django.db import models
from django.contrib.auth.models import AbstractUser, Group, Permission
from django.utils.translation import gettext_lazy as _ # For email field
from django.conf import settings # Para AUTH_USER_MODEL
from sucursal_app.models import Sucursal, Bodega
# Considera si necesitas importar Region y Comuna para la dirección del cliente
# from ubicacion_app.models import Comuna

class Usuario(AbstractUser):
    """
    Modelo de Usuario base que hereda de AbstractUser.
    Este será el AUTH_USER_MODEL.
    Contiene campos comunes como email, nombre, apellido, contraseña, etc.
    """
    # Override the email field to make it unique as it's the USERNAME_FIELD
    email = models.EmailField(_("email address"), unique=True)

    # Hereda username, first_name, last_name, email, password, is_active, is_staff, etc.
    
    # Configuración para login con email
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username'] # username sigue siendo útil y requerido para createsuperuser

    # Redefinir groups y user_permissions para evitar conflictos de related_name
    # si se usara el User original de Django en algún punto (aunque con AUTH_USER_MODEL no debería ser un problema directo)
    # Es buena práctica definirlos explícitamente con related_names únicos.
    groups = models.ManyToManyField(
        Group,
        verbose_name='grupos',
        blank=True,
        help_text='Los grupos a los que pertenece este usuario. Un usuario obtendrá todos los permisos otorgados a cada uno de sus grupos.',
        related_name="usuario_groups",
        related_query_name="usuario", # Cambiado de "personal" a "usuario"
    )
    user_permissions = models.ManyToManyField(
        Permission,
        verbose_name='permisos de usuario',
        blank=True,
        help_text='Permisos específicos para este usuario.',
        related_name="usuario_user_permissions",
        related_query_name="usuario", # Cambiado de "personal" a "usuario"
    )

    class Meta:
        verbose_name = "Usuario del Sistema"
        verbose_name_plural = "Usuarios del Sistema"
        ordering = ['email']

    def __str__(self):
        name_display = f"{self.first_name} {self.last_name}".strip()
        return name_display if name_display else self.email

class Personal(models.Model):
    """
    Perfil para el Personal interno. Se enlaza al modelo Usuario base.
    """
    class Roles(models.TextChoices):
        BODEGUERO = 'BODEGUERO', _('Bodeguero')
        ADMINISTRADOR = 'ADMINISTRADOR', _('Administrador')
        VENDEDOR = 'VENDEDOR', _('Vendedor')
        CONTABLE = 'CONTABLE', _('Contable')

    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL, # Apuntará a 'usuario_app.Usuario'
        on_delete=models.CASCADE,
        # primary_key=True, # Se quitará temporalmente
        null=True,          # Se hace anulable para las filas existentes
        blank=True,         # Se permite en blanco en formularios/admin por ahora
        related_name='perfil_personal'
    )
    rol = models.CharField(
        max_length=20,
        choices=Roles.choices,
        null=True, # Puede ser nulo si un personal no tiene rol asignado inmediatamente
        blank=True, # Puede estar en blanco en formularios
        verbose_name="Rol"
    )
    sucursal = models.ForeignKey(Sucursal, on_delete=models.SET_NULL, null=True, blank=True, related_name="personal_en_sucursal", verbose_name="Sucursal Asignada")
    bodega = models.ForeignKey(Bodega, on_delete=models.SET_NULL, null=True, blank=True, related_name="personal_en_bodega", verbose_name="Bodega Asignada (si aplica)")

    class Meta:
        verbose_name = "Perfil de Personal"
        verbose_name_plural = "Perfiles de Personal"

    def __str__(self):
        try:
            rol_display = self.get_rol_display() if self.rol else "Sin rol asignado"
            if self.usuario:
                return f"{self.usuario} ({rol_display})"
            return f"Perfil de Personal ID: {self.pk} ({rol_display})"
        except (settings.AUTH_USER_MODEL.DoesNotExist, AttributeError): # type: ignore
            return f"Perfil de Personal ID: {self.pk} (Cuenta de usuario no enlazada)"


class Cliente(models.Model):
    """
    Perfil para los Clientes. Se enlaza al modelo Usuario base.
    """
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL, # Apuntará a 'usuario_app.Usuario'
        on_delete=models.CASCADE,
        # primary_key=True, # Temporarily remove this
        null=True,          # Make nullable for existing rows
        blank=True,         # Allow blank in forms/admin for now
        related_name='perfil_cliente'
    )
    rut = models.CharField(max_length=12, unique=True, blank=True, null=True, verbose_name="RUT") # ¡CAMPO RUT AÑADIDO!
    # Los campos nombre, apellido, email se gestionan a través del modelo 'Usuario' (usuario)
    num_telefono = models.CharField(max_length=20, blank=True, null=True, verbose_name="Número de Teléfono")
    # fecha_registro del perfil, la fecha de registro del usuario está en el modelo Usuario (date_joined)
    fecha_creacion_perfil = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación del Perfil")

    class Meta:
        verbose_name = "Perfil de Cliente"
        verbose_name_plural = "Perfiles de Cliente"
        ordering = ['usuario__last_name', 'usuario__first_name'] # Ordenar por campos del Usuario base

    def __str__(self):
        try:
            return str(self.usuario) # Muestra la representación del Usuario base
        except (settings.AUTH_USER_MODEL.DoesNotExist, AttributeError): # type: ignore
            pass
        return f"Perfil de Cliente ID: {self.pk} (Cuenta de usuario no enlazada o incompleta)"

    # Propiedades para acceder fácilmente a los campos del usuario si se desea
    @property
    def email(self):
        try:
            return self.usuario.email if self.usuario else None
        except (settings.AUTH_USER_MODEL.DoesNotExist, AttributeError): # type: ignore
            return None

    @property
    def nombre_completo(self):
        try:
            if self.usuario:
                return f"{self.usuario.first_name} {self.usuario.last_name}".strip()
            return ""
        except (settings.AUTH_USER_MODEL.DoesNotExist, AttributeError): # type: ignore
            return ""

class DireccionCliente(models.Model):
    """
    Almacena las direcciones de envío de un cliente.
    Un cliente puede tener múltiples direcciones.
    """
    cliente = models.ForeignKey(
        Cliente, 
        on_delete=models.CASCADE, 
        related_name='direcciones',
        verbose_name="Cliente"
    )
    alias = models.CharField(max_length=50, verbose_name="Alias de la Dirección (ej: Casa, Oficina)")
    direccion_calle_numero = models.CharField(max_length=255, verbose_name="Dirección (Calle y Número)")
    # comuna = models.ForeignKey(Comuna, on_delete=models.SET_NULL, null=True, verbose_name="Comuna")
    informacion_adicional = models.CharField(max_length=255, blank=True, null=True, verbose_name="Información Adicional (ej: Depto, Casa)")
    
    es_principal = models.BooleanField(
        default=False, 
        verbose_name="¿Es la dirección principal?",
        help_text="Marca esta casilla si esta es tu dirección de envío por defecto."
    )
    sucursal_favorita = models.ForeignKey(
        Sucursal, 
        on_delete=models.SET_NULL, 
        null=True, blank=True, 
        related_name='clientes_preferentes',
        verbose_name="Sucursal Favorita",
        help_text="Selecciona tu sucursal preferida para retiros o para ver stock local."
    )

    def __str__(self):
        return f"Dirección '{self.alias}' de {self.cliente.usuario.username}"
