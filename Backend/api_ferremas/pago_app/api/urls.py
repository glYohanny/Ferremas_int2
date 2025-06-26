from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PagoViewSet, ListarMetodosPagoAPIView, CrearTransaccionConPedidoAPIView
from .webpay_views import IniciarPagoWebpayView, WebpayRetornoView

app_name = 'pago_app'

router = DefaultRouter()
router.register(r'pagos', PagoViewSet, basename='pago')

urlpatterns = [
    path('metodos-pago/', ListarMetodosPagoAPIView.as_view(), name='listar_metodos_pago'),
    path('crear-transaccion-pedido/', CrearTransaccionConPedidoAPIView.as_view(), name='crear_transaccion_pedido'),
    path('', include(router.urls)),
    path('pedidos/<int:pedido_id>/iniciar-pago-webpay/', IniciarPagoWebpayView.as_view(), name='webpay_iniciar_pago'),
    path('webpay/retorno/', WebpayRetornoView.as_view(), name='webpay_retorno'),
]