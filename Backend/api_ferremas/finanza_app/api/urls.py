from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CuentaPorCobrarViewSet, CuentaPorPagarViewSet,
    PagoRecibidoViewSet, PagoRealizadoViewSet,
    CuentaBancariaViewSet, MovimientoCajaViewSet, DocumentoFinancieroViewSet,
    ResumenIngresosView
)

app_name = 'finanza_app'

router = DefaultRouter()
router.register(r'cuentas-por-cobrar', CuentaPorCobrarViewSet, basename='cuentaporcobrar')
router.register(r'cuentas-por-pagar', CuentaPorPagarViewSet, basename='cuentaporpagar')
router.register(r'pagos-recibidos', PagoRecibidoViewSet, basename='pagorecibido')
router.register(r'pagos-realizados', PagoRealizadoViewSet, basename='pagorealizado')
router.register(r'cuentas-bancarias', CuentaBancariaViewSet, basename='cuentabancaria')
router.register(r'movimientos-caja', MovimientoCajaViewSet, basename='movimientocaja')
router.register(r'documentos-financieros', DocumentoFinancieroViewSet, basename='documentofinanciero')
# router.register(r'metodos-pago', MetodoPagoViewSet, basename='metodopago') # Si aplica

urlpatterns = [
    path('', include(router.urls)),
    path('resumen-ingresos/', ResumenIngresosView.as_view(), name='resumen-ingresos'),
]