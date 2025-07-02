from rest_framework import generics, status, viewsets, filters
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from .serializers import ( # Asegúrate que UserProfileDataSerializer esté importado si lo usas aquí
    ClienteRegistrationSerializer, UsuarioSerializer, ClienteSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    PersonalSerializer, PersonalCreateUpdateSerializer,UsuarioListSerializer,
    UserProfileDataSerializer, # Asegúrate que este esté importado
    ClienteFrecuenteSerializer
)
from usuario_app.api.permissions import EsVendedor # Importar EsVendedor
from ..models import Usuario, Cliente, Personal
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.db import models
from django.db.models import Count, Max
from django.utils.decorators import method_decorator # Importar method_decorator
from django.views.decorators.csrf import csrf_exempt # Importar csrf_exempt
from rest_framework import mixins # Asegúrate de que mixins esté importado

class UsuarioListView(generics.ListAPIView):
    """
    Vista para listar usuarios, filtrando por tipo de perfil y rol (para personal).
    """
    serializer_class = UsuarioListSerializer
    permission_classes = [IsAdminUser] 
    filter_backends = [filters.OrderingFilter] # Opcional: para permitir ordenar los resultados
    ordering_fields = ['email', 'username', 'first_name', 'last_name', 'tipo_perfil', 'rol'] # Campos por los que se puede ordenar

    def get_queryset(self):
        # Optimización: precargar perfiles de personal y cliente
        # Usar prefetch_related si la relación es inversa o ManyToMany
        # Usar select_related para ForeignKey o OneToOneField directos
        queryset = Usuario.objects.all().select_related('perfil_personal', 'perfil_cliente')
        tipo_perfil = self.request.query_params.get('tipo_perfil', None)
        rol = self.request.query_params.get('rol', None)

        if tipo_perfil:
            if tipo_perfil == 'cliente':
                queryset = queryset.filter(perfil_cliente__isnull=False)
            elif tipo_perfil == 'personal':
                queryset = queryset.filter(perfil_personal__isnull=False)
            elif tipo_perfil == 'base': # Usuarios sin perfil específico
                queryset = queryset.filter(perfil_cliente__isnull=True, perfil_personal__isnull=True)
            else:
                return Usuario.objects.none()  # Tipo de perfil no válido

        if rol and tipo_perfil == 'personal': # El filtro de rol solo aplica al personal
            queryset = queryset.filter(perfil_personal__rol=rol)

        return queryset
    

class ClienteRegistrationAPIView(generics.CreateAPIView):
    """
    Vista para el registro de nuevos clientes.
    Permite a cualquier usuario (AllowAny) crear una nueva cuenta.
    """
    serializer_class = ClienteRegistrationSerializer
    permission_classes = [AllowAny] # Cualquiera puede registrarse

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Devolvemos los datos del usuario creado (sin la contraseña)
        return Response(UsuarioSerializer(user).data, status=status.HTTP_201_CREATED)

class ClienteProfileAPIView(generics.RetrieveUpdateAPIView):
    """
    Vista para que un cliente autenticado pueda ver y actualizar su perfil.
    GET: Devuelve el perfil del cliente.
    PUT/PATCH: Actualiza el perfil del cliente.
    """
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated] # Solo usuarios autenticados

    def get_object(self):
        # Devuelve el objeto Cliente asociado al usuario autenticado.
        # Asumimos que existe un perfil Cliente para cada Usuario que accede aquí.
        # Si no, se podría crear o manejar el error.
        try:
            return Cliente.objects.get(usuario=self.request.user)
        except Cliente.DoesNotExist:
            # Opcional: Podrías crear un perfil de cliente aquí si no existe
            # o levantar un Http404 o un error personalizado.
            # Por ahora, si un usuario autenticado no tiene perfil de cliente,
            # esto resultará en un 404, lo cual es razonable si el registro siempre crea uno.
            from django.http import Http404
            raise Http404("Perfil de cliente no encontrado para este usuario.")

@method_decorator(csrf_exempt, name='dispatch') # Aplicar csrf_exempt a la vista
class PasswordResetRequestAPIView(generics.GenericAPIView):
    """
    Vista para solicitar el restablecimiento de contraseña.
    Envía un email al usuario con un enlace para restablecerla.
    """
    authentication_classes = [] # No se requiere autenticación para esta vista
    serializer_class = PasswordResetRequestSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        user = Usuario.objects.get(email=email)

        # Generar token y uid
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        # Construir el enlace de restablecimiento (ajusta la URL base según tu frontend)
        # Esta URL apuntará a la página de tu frontend que maneja la confirmación.
        reset_link = f"{settings.FRONTEND_URL}/reset-password-confirm/{uid}/{token}/" 
        
        # Enviar correo
        # (Asegúrate de tener configurado EMAIL_BACKEND en settings.py)
        # (Para desarrollo, EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend' es útil)
        mail_subject = 'Restablecer tu contraseña en Ferremas'
        message = f"""Hola {user.first_name},

Has solicitado restablecer tu contraseña. Por favor, haz clic en el siguiente enlace para continuar:
{reset_link}

Si no solicitaste esto, por favor ignora este correo.

Gracias,
El equipo de Ferremas
"""
        send_mail(mail_subject, message, settings.DEFAULT_FROM_EMAIL, [user.email])

        return Response({"detail": "Se ha enviado un correo con instrucciones para restablecer tu contraseña."}, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch') # Aplicar csrf_exempt también aquí por consistencia
class PasswordResetConfirmAPIView(generics.GenericAPIView):
    """
    Vista para confirmar el restablecimiento de contraseña.
    Valida el token y uid, y actualiza la contraseña del usuario.
    """
    authentication_classes = [] # No se requiere autenticación para esta vista
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [AllowAny]

    def post(self, request, uidb64, token, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = Usuario.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, Usuario.DoesNotExist):
            user = None

        if user is not None and default_token_generator.check_token(user, token):
            user.set_password(serializer.validated_data['new_password1'])
            user.save()
            return Response({"detail": "Tu contraseña ha sido restablecida exitosamente."}, status=status.HTTP_200_OK)
        else:
            return Response({"detail": "El enlace de restablecimiento no es válido o ha expirado."}, status=status.HTTP_400_BAD_REQUEST)


class PersonalViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar el personal.
    Solo accesible por administradores.
    """
    queryset = Personal.objects.select_related('usuario', 'sucursal', 'bodega').all()
    permission_classes = [IsAdminUser] # Solo administradores pueden gestionar personal
    lookup_field = 'usuario__id' # Use the ID of the related 'usuario' for lookup

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PersonalCreateUpdateSerializer
        return PersonalSerializer

    # Opcional: Personalizar la creación si se quiere hacer algo más,
    # como asignar el usuario que crea como 'creado_por', etc.
    # def perform_create(self, serializer):
    #     # Ejemplo: serializer.save(creado_por=self.request.user)
    #     serializer.save()

    def perform_destroy(self, instance):
        """
        Override to delete the associated Usuario instance as well.
        'instance' here is the Personal object.
        """
        user_to_delete = instance.usuario
        instance.delete()  # Deletes the Personal profile
        if user_to_delete:
            user_to_delete.delete()  # Deletes the associated Usuario

# Vista para obtener el perfil del cliente autenticado
from rest_framework.views import APIView # Ya importado arriba

class CurrentClienteProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        print(f"[DEBUG CurrentClienteProfileView] Usuario solicitante: {request.user} (ID: {request.user.id}), Autenticado: {request.user.is_authenticated}")
        try:
            # Asumiendo que tu modelo Cliente tiene un OneToOneField 'usuario' al modelo User
            print(f"[DEBUG CurrentClienteProfileView] Intentando obtener Cliente para usuario ID: {request.user.id}")
            cliente_profile = Cliente.objects.get(usuario=request.user)
            print(f"[DEBUG CurrentClienteProfileView] Perfil de Cliente encontrado: {cliente_profile}")
            serializer = UserProfileDataSerializer(cliente_profile) # Usar el serializer específico
            print(f"[DEBUG CurrentClienteProfileView] Datos serializados: {serializer.data}")
            return Response(serializer.data)
        except Cliente.DoesNotExist:
            print(f"[DEBUG CurrentClienteProfileView] Cliente.DoesNotExist para usuario ID: {request.user.id}")
            return Response(
                {"detail": "Perfil de cliente no encontrado para este usuario."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except AttributeError:
            print(f"[DEBUG CurrentClienteProfileView] AttributeError al intentar acceder al perfil del cliente para usuario: {request.user}")
            return Response(
                {"detail": "Error al acceder a la relación del perfil del cliente."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            print(f"[DEBUG CurrentClienteProfileView] Excepción general: {str(e)}")
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UnifiedUserProfileView(APIView):
    """
    Vista unificada para obtener el perfil del usuario autenticado,
    determinando si es Cliente o Personal.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Devuelve el objeto del usuario autenticado, serializado con el
        UsuarioSerializer que ahora incluye todos los perfiles anidados.
        """
        # Para asegurar que perfil_personal y perfil_cliente estén cargados
        # Usamos select_related para OneToOneField
        user_instance = request.user
        user_instance = user_instance.__class__.objects.select_related('perfil_personal', 'perfil_cliente').get(pk=user_instance.pk)
        serializer = UsuarioSerializer(user_instance)
        return Response(serializer.data)


class VendedorClientesFrecuentesAPIView(generics.ListAPIView):
    """
    Endpoint para que los Vendedores vean una lista de clientes frecuentes.
    Un cliente se considera frecuente si tiene más de un pedido completado.
    """
    serializer_class = ClienteFrecuenteSerializer
    permission_classes = [IsAuthenticated, EsVendedor]

    def get_queryset(self):
        # Anotar cada cliente con el número total de pedidos completados
        # y la fecha del último pedido (opcional, si se usa en el serializer)
        queryset = Cliente.objects.annotate(
            total_pedidos=Count('pedidos_cliente', filter=models.Q(pedidos_cliente__estado='ENTREGADO')),
            # ultimo_pedido_fecha=Max('pedidos_cliente__fecha_pedido', filter=models.Q(pedidos_cliente__estado='ENTREGADO'))
        ).filter(
            total_pedidos__gt=1 # Clientes con más de 1 pedido completado
        ).order_by('-total_pedidos', 'usuario__first_name') # Ordenar por más pedidos, luego por nombre
        
        return queryset

class UsuarioUpdateViewSet(viewsets.GenericViewSet, 
                           mixins.RetrieveModelMixin, # <--- AÑADE ESTA LÍNEA
                           mixins.UpdateModelMixin,
                           mixins.DestroyModelMixin): # Añadir DestroyModelMixin
    """
    ViewSet para recuperar, actualizar y eliminar instancias de Usuario.
    Principalmente para que un administrador pueda ver detalles, activar/desactivar y eliminar cuentas.
    """
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer # Usará el UsuarioSerializer modificado
    permission_classes = [IsAdminUser] # Solo administradores
    # El lookup_field por defecto es 'pk', que es el ID del usuario, lo cual está bien.
    http_method_names = ['get', 'patch', 'delete', 'head', 'options'] # <--- AÑADE 'get'