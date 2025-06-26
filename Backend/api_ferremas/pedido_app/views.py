from rest_framework import generics, permissions
from .models import PedidoCliente
from .serializers import PedidoClienteListSerializer
from usuario_app.api.permissions import EsVendedor


class VendedorPedidosActivosAPIView(generics.ListAPIView):
    """
    Endpoint para que los Vendedores vean los pedidos activos que necesitan gestionar.
    Filtra por estados relevantes para el flujo de ventas.
    """
    serializer_class = PedidoClienteListSerializer
    permission_classes = [permissions.IsAuthenticated, EsVendedor]

    def get_queryset(self):
        """
        Devuelve pedidos en estados 'POR_CONFIRMAR', 'PREPARADO', o 'EN_ESPERA_DE_PAGO'.
        Estos son los estados que un vendedor típicamente gestiona.
        """
        # Asegúrate que estos strings coincidan con los CHOICES en tu modelo PedidoCliente
        estados_activos = ['POR_CONFIRMAR', 'PREPARADO', 'EN_ESPERA_DE_PAGO']
        return PedidoCliente.objects.filter(estado__in=estados_activos).order_by('-fecha_pedido')
