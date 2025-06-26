from rest_framework import permissions
from ..models import EstadoPedidoCliente, PedidoCliente, DetallePedidoCliente # Importar modelos necesarios
from usuario_app.models import Personal # Importar Personal para acceder a los roles

class IsClienteOwnerOrStaff(permissions.BasePermission):
    """
    Permiso personalizado para Pedidos de Cliente.
    - Clientes pueden listar/ver/crear/cancelar sus propios pedidos.
    - Staff (admin, bodeguero, vendedor) pueden tener más acceso.
    """

    def has_permission(self, request, view):
        # Todos los autenticados pueden intentar listar o crear.
        # El filtrado de la lista se hace en get_queryset.
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Permisos a nivel de objeto (retrieve, update, delete)
        if not request.user or not request.user.is_authenticated:
            return False

        # Personal autorizado (Admin, Vendedor, Bodeguero) puede modificar/ver cualquier pedido.
        if hasattr(request.user, 'perfil_personal') and \
           request.user.perfil_personal and \
           request.user.perfil_personal.rol in [Personal.Roles.ADMINISTRADOR,
                                                Personal.Roles.VENDEDOR,
                                                Personal.Roles.BODEGUERO]:
            return True

        # Determinar el cliente del objeto (ya sea PedidoCliente o DetallePedidoCliente)
        cliente_del_objeto = None
        estado_del_objeto_pedido_cliente = None

        if isinstance(obj, PedidoCliente):
            cliente_del_objeto = obj.cliente
            estado_del_objeto_pedido_cliente = obj.estado
        elif isinstance(obj, DetallePedidoCliente):
            if obj.pedido_cliente:
                cliente_del_objeto = obj.pedido_cliente.cliente
                estado_del_objeto_pedido_cliente = obj.pedido_cliente.estado
        
        if cliente_del_objeto and hasattr(request.user, 'perfil_cliente'): # Asumiendo que tu modelo Cliente se llama perfil_cliente en el User
            is_owner = (cliente_del_objeto == request.user.perfil_cliente)
            if not is_owner:
                return False

            # Clientes pueden ver sus pedidos.
            if request.method in permissions.SAFE_METHODS: # GET, HEAD, OPTIONS
                return True

            # Clientes pueden intentar cancelar sus pedidos si están en un estado cancelable.
            # Esta lógica aplica principalmente al objeto PedidoCliente, no al DetallePedidoCliente directamente para cancelación.
            if isinstance(obj, PedidoCliente) and request.method in ['PATCH', 'PUT']:
                return estado_del_objeto_pedido_cliente in [EstadoPedidoCliente.PENDIENTE, EstadoPedidoCliente.PAGADO, EstadoPedidoCliente.PROCESANDO] # Estados desde los que se puede cancelar
            return False
        return False