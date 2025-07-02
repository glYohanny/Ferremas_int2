from rest_framework import serializers
from ..models import Usuario, Cliente, Personal, DireccionCliente
from sucursal_app.api.serializers import SucursalSerializer # Importar el serializer de Sucursal
from django.contrib.auth.password_validation import validate_password # type: ignore
from django.db import transaction
from django.contrib.auth.tokens import PasswordResetTokenGenerator

class SimpleClienteProfileSerializer(serializers.ModelSerializer):
    """
    Serializer simple para el perfil de cliente, para ser anidado en UsuarioSerializer.
    """
    class Meta:
        model = Cliente
        fields = ['id', 'rut', 'num_telefono']

class PerfilPersonalSerializer(serializers.ModelSerializer):
    """
    Serializer para el perfil de personal, incluyendo los detalles de la sucursal.
    """
    # Usamos el SucursalSerializer para anidar la información completa de la sucursal.
    sucursal = SucursalSerializer(read_only=True)

    class Meta:
        model = Personal
        fields = ['id', 'rol', 'sucursal']

class UsuarioSerializer(serializers.ModelSerializer):
    """
    Serializer principal para el modelo Usuario.
    Ahora incluye el perfil de personal con sus detalles anidados.
    """
    rol = serializers.CharField(source='perfil_personal.rol', read_only=True, allow_null=True)
    rol_display = serializers.CharField(source='get_rol_display', read_only=True)
    tipo_perfil = serializers.CharField(source='get_tipo_perfil', read_only=True)
    perfil_personal = PerfilPersonalSerializer(read_only=True)
    perfil_cliente = SimpleClienteProfileSerializer(read_only=True, allow_null=True)

    class Meta:
        model = Usuario
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'is_staff', 'is_active',
            'tipo_perfil', 'rol', 'rol_display',
            'perfil_personal', 'perfil_cliente'
        ]
        read_only_fields = ['is_staff', 'is_active', 'perfil_personal', 'perfil_cliente', 'rol', 'rol_display', 'tipo_perfil']

class DireccionClienteSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo DireccionCliente.
    """
    sucursal_favorita_nombre = serializers.CharField(source='sucursal_favorita.nombre', read_only=True)

    class Meta:
        model = DireccionCliente
        fields = [
            'id', 'alias', 'direccion_calle_numero', 'informacion_adicional',
            'es_principal', 'sucursal_favorita', 'sucursal_favorita_nombre'
        ]
        read_only_fields = ['id', 'sucursal_favorita_nombre']

class ClienteSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Cliente.
    Incluye información del Usuario anidada.
    """
    usuario = UsuarioSerializer(read_only=True) # Para mostrar datos del usuario
    direcciones = DireccionClienteSerializer(many=True, read_only=True)

    class Meta:
        model = Cliente
        # Añadir 'rut' para que se pueda ver y potencialmente actualizar
        fields = ['id', 'usuario', 'rut', 'num_telefono', 'fecha_creacion_perfil', 'direcciones']
        read_only_fields = ['fecha_creacion_perfil']

class ClienteRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer para el registro de nuevos Clientes.
    Maneja la creación del Usuario y el Perfil de Cliente.
    """
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True, label="Confirmar contraseña")
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=True, max_length=150)
    last_name = serializers.CharField(required=True, max_length=150)
    # Declarar explícitamente los campos del perfil Cliente
    rut = serializers.CharField(required=True, max_length=12)
    # Campos para la primera dirección del cliente
    direccion_calle_numero = serializers.CharField(required=True, max_length=255, write_only=True)
    direccion_alias = serializers.CharField(required=False, max_length=50, write_only=True, default="Principal")
    num_telefono = serializers.CharField(required=False, max_length=20, allow_blank=True, allow_null=True)

    class Meta:
        model = Usuario # El serializer principal se basa en Usuario para crear la cuenta
        fields = ['email', 'username', 'first_name', 'last_name', 'password', 'password2', 'rut', 'num_telefono', 'direccion_calle_numero', 'direccion_alias']
        extra_kwargs = {
            'username': {'required': True}, # Aunque el email es el USERNAME_FIELD, username sigue siendo requerido por AbstractUser
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Las contraseñas no coinciden."})
        return attrs

    @transaction.atomic # Asegura que ambas creaciones (Usuario y Cliente) sean exitosas o ninguna
    def create(self, validated_data):
        # Extraer datos para el Cliente y su primera Dirección
        cliente_data = {
            'rut': validated_data.pop('rut'),
            'num_telefono': validated_data.pop('num_telefono', None)
        }
        direccion_data = {
            'direccion_calle_numero': validated_data.pop('direccion_calle_numero'),
            'alias': validated_data.pop('direccion_alias', 'Principal'),
            'es_principal': True # La primera dirección creada en el registro es la principal
        }
        
        user = Usuario.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            password=validated_data['password']
        )
        # Por defecto, los nuevos usuarios clientes no son staff ni superusuarios
        user.is_staff = False
        user.is_superuser = False
        user.save()

        # Crear el perfil del Cliente
        cliente_instance = Cliente.objects.create(usuario=user, **cliente_data)

        # Crear la primera dirección del cliente, asociada a su perfil
        DireccionCliente.objects.create(cliente=cliente_instance, **direccion_data)
        return user 

class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializer para solicitar el restablecimiento de contraseña.
    Valida que el email exista.
    """
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        if not Usuario.objects.filter(email=value).exists():
            raise serializers.ValidationError("No existe un usuario con esta dirección de correo electrónico.")
        return value

class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer para confirmar el restablecimiento de contraseña.
    Requiere uid, token, y la nueva contraseña.
    """
    # uidb64 = serializers.CharField(required=True) # uidb64 se pasará por URL
    # token = serializers.CharField(required=True)  # token se pasará por URL
    new_password1 = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    new_password2 = serializers.CharField(write_only=True, required=True, label="Confirmar nueva contraseña")

    def validate(self, attrs):
        if attrs['new_password1'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "Las nuevas contraseñas no coinciden."})
        return attrs

class PersonalCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear y actualizar perfiles de Personal.
    Maneja la creación/actualización del Usuario y el Perfil de Personal.
    """
    # For representation (output)
    usuario = UsuarioSerializer(read_only=True)
    rol_display = serializers.CharField(source='get_rol_display', read_only=True) # Re-declarar para que aparezca en la salida
    tipo_perfil = serializers.SerializerMethodField(read_only=True)

    # For writing (input) - these are handled in create/update methods
    email = serializers.EmailField(write_only=True, required=False) # No es obligatorio en update
    username = serializers.CharField(write_only=True, required=False) # No es obligatorio en update
    first_name = serializers.CharField(write_only=True, required=False, max_length=150) # No es obligatorio en update
    last_name = serializers.CharField(write_only=True, required=False, max_length=150) # No es obligatorio en update
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, validators=[validate_password]) # Opcional al actualizar
    is_active = serializers.BooleanField(write_only=True, required=False) # Para activar/desactivar
    
    # Campos del modelo Personal
    # rol, sucursal, bodega se toman directamente de los campos del modelo Personal
    class Meta:
        model = Personal
        fields = [
            'id',
            'usuario', # For representing the nested Usuario
            'rol', 'rol_display', # From Personal model / method
            'sucursal', 'bodega', # From Personal model
            'tipo_perfil', # Method field for representation
            # Write-only fields for user creation/update
            'email', 'username', 'first_name', 'last_name', 'password', 'is_active',
        ]
        # Los campos de solo lectura no necesitan estar en la lista de campos si no se usan para la escritura.
        # Sin embargo, para la representación, es útil tenerlos.
        # Para evitar conflictos, los campos de solo escritura se manejan en los métodos create/update.
        read_only_fields = ('id', 'usuario', 'rol_display', 'tipo_perfil')


    def get_tipo_perfil(self, obj: Personal) -> str:
        return 'Personal'

    def validate_email(self, value):
        """
        Check if the email is already in use during creation or by another user during update.
        """
        # En creación (self.instance es None)
        if self.instance is None and Usuario.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este correo electrónico ya está en uso por otro usuario.")
        # En actualización (self.instance existe), verificar si el email está siendo cambiado a uno que ya usa OTRO usuario
        if self.instance and self.instance.usuario.email != value and Usuario.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este correo electrónico ya está en uso por otro usuario.")
        return value
    @transaction.atomic
    def create(self, validated_data):
        # Extraer datos del usuario
        user_data = {
            'email': validated_data.pop('email'),
            'username': validated_data.pop('username'),
            'first_name': validated_data.pop('first_name'),
            'last_name': validated_data.pop('last_name'),
        }
        password = validated_data.pop('password', None) # La contraseña es obligatoria al crear
        # Email y username son requeridos para crear un Usuario
        if not user_data.get('email'):
            raise serializers.ValidationError({"email": ["El correo electrónico es requerido para crear personal."]})
        if not user_data.get('username'): # Username es requerido por AbstractUser
            raise serializers.ValidationError({"username": ["El nombre de usuario es requerido para crear personal."]})
        if not password and self.instance is None: # Password requerido solo en creación
            raise serializers.ValidationError({"password": ["La contraseña es requerida para crear personal."]})

        usuario_instance = Usuario.objects.create_user(**user_data, password=password)
        usuario_instance.is_staff = True
        usuario_instance.save()

        # validated_data now only contains 'rol', 'sucursal', 'bodega'
        personal = Personal.objects.create(usuario=usuario_instance, **validated_data)
        return personal

    @transaction.atomic
    def update(self, instance, validated_data):
        # Actualizar datos del Usuario si se proporcionan
        usuario = instance.usuario
        usuario.email = validated_data.get('email', usuario.email)
        usuario.username = validated_data.get('username', usuario.username)
        usuario.first_name = validated_data.get('first_name', usuario.first_name)
        usuario.last_name = validated_data.get('last_name', usuario.last_name)
        
        # Actualizar is_active si se proporciona
        if 'is_active' in validated_data:
            usuario.is_active = validated_data.get('is_active')

        password = validated_data.get('password', None)
        if password:
            usuario.set_password(password)
        usuario.save(update_fields=['email', 'username', 'first_name', 'last_name', 'password', 'is_active'] if password else ['email', 'username', 'first_name', 'last_name', 'is_active'])

        # Actualizar datos del Personal
        instance.rol = validated_data.get('rol', instance.rol)
        instance.sucursal = validated_data.get('sucursal', instance.sucursal)
        instance.bodega = validated_data.get('bodega', instance.bodega)
        instance.save()
        return instance

class PersonalSerializer(serializers.ModelSerializer):
    """
    Serializer para leer datos del Personal, incluyendo información del Usuario.
    """
    usuario = UsuarioSerializer(read_only=True)
    rol_display = serializers.CharField(source='get_rol_display', read_only=True) # Para mostrar el label del rol
    tipo_perfil = serializers.SerializerMethodField()

    class Meta:
        model = Personal
        fields = ['id', 'usuario', 'rol', 'rol_display', 'sucursal', 'bodega', 'tipo_perfil']
    def get_tipo_perfil(self, obj: Personal) -> str:
        return 'Personal'
class UsuarioListSerializer(serializers.ModelSerializer):
    """
    Serializer para listar usuarios con información básica y tipo de perfil.
    """
    tipo_perfil = serializers.SerializerMethodField()
    rol = serializers.CharField(source='perfil_personal.get_rol_display', read_only=True, default=None)  # Para el rol del personal

    class Meta:
        model = Usuario
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'is_active', 'tipo_perfil', 'rol']

    def get_tipo_perfil(self, obj):
        if hasattr(obj, 'perfil_personal'):
            return 'Personal'
        elif hasattr(obj, 'perfil_cliente'):
            return 'Cliente'
        return 'Usuario Base' # O un valor por defecto para usuarios sin perfil específico

class UserProfileDataSerializer(serializers.ModelSerializer):
    """
    Serializer para mostrar los datos del perfil del cliente autenticado.
    Combina información del modelo User y Cliente.
    """
    # Campos del modelo User (obtenidos a través de la relación 'usuario' en Cliente)
    email = serializers.EmailField(source='usuario.email', read_only=True)
    first_name = serializers.CharField(source='usuario.first_name', read_only=True)
    last_name = serializers.CharField(source='usuario.last_name', read_only=True)
    username = serializers.CharField(source='usuario.username', read_only=True)
    tipo_perfil = serializers.SerializerMethodField()
    direcciones = DireccionClienteSerializer(many=True, read_only=True)

    class Meta:
        model = Cliente # El serializer se basa en el modelo Cliente
        fields = [
            'id', # Es buena práctica incluir el ID del perfil de cliente
            'email', 
            'first_name', 
            'last_name', 
            'username',
            'tipo_perfil', # Añadido
            'rut',
            'num_telefono',
            'direcciones',
            # 'fecha_nacimiento', # Descomenta si lo tienes en el modelo Cliente y quieres incluirlo
        ]

    def get_tipo_perfil(self, obj: Cliente) -> str:
        # Dado que este serializer es para un Cliente, su tipo_perfil siempre será 'Cliente'.
        return 'Cliente'

class ClienteFrecuenteSerializer(serializers.ModelSerializer):
    """
    Serializer para listar clientes frecuentes, incluyendo su nombre completo
    y el número total de pedidos.
    """
    nombre_completo = serializers.CharField(source='usuario.get_full_name', read_only=True)
    email = serializers.EmailField(source='usuario.email', read_only=True)
    # Este campo 'total_pedidos' será anotado en la vista
    total_pedidos = serializers.IntegerField(read_only=True)
    # Puedes añadir más campos si son relevantes para el vendedor, como el último pedido
    # ultimo_pedido_fecha = serializers.DateTimeField(source='pedidos_cliente__fecha_pedido', read_only=True)

    class Meta:
        model = Cliente
        fields = ['id', 'nombre_completo', 'email', 'rut', 'num_telefono', 'total_pedidos']
        # Si añades 'ultimo_pedido_fecha', asegúrate de incluirlo en el queryset de la vista

    def get_tipo_perfil(self, obj: Cliente) -> str:
        # Dado que este serializer es para un Cliente, su tipo_perfil siempre será 'Cliente'.
        # obj es una instancia de Cliente.
        # Si el usuario asociado a este cliente también tuviera un perfil_personal,
        # la lógica para determinar el "rol principal" podría ser más compleja,
        # pero para un perfil de cliente, es seguro asumir 'Cliente'.
        return 'Cliente'