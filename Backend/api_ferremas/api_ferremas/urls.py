
from django.contrib import admin
from django.urls import path, include # Asegúrate de importar include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from django.conf import settings # Importar settings
from django.conf.urls.static import static # Importar static

from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['GET'])
def api_root(request):
    """
    Raíz de la API. Muestra enlaces a las diferentes secciones.
    """
    from rest_framework.reverse import reverse
    return Response({
        'usuarios': reverse('usuario_app:usuario-list', request=request),
        'personal': reverse('usuario_app:personal-list', request=request),
        'clientes': reverse('usuario_app:cliente-registro', request=request), # Assuming you want to list clients through registration endpoint
        'sucursales': reverse('sucursal_app:sucursal-list', request=request),
        'bodegas': reverse('sucursal_app:bodega-list', request=request),
        'tipos_bodega': reverse('sucursal_app:tipobodega-list', request=request),
        'regiones': reverse('ubicacion_app:region-list', request=request),
        'comunas': reverse('ubicacion_app:comuna-list', request=request),
        'producto_categorias': reverse('producto_app:categoriaproducto-list', request=request),
        'producto_marcas': reverse('producto_app:marcaproducto-list', request=request),
        'productos': reverse('producto_app:producto-list', request=request),
        'inventarios_sucursal': reverse('inventario_app:inventariosucursal-list', request=request),
        'detalles_inventario_bodega': reverse('inventario_app:detalleinventariobodega-list', request=request),
        'traspasos_internos': reverse('inventario_app:traspasointernostock-list', request=request),
        'proveedores': reverse('proveedor_app:proveedor-list', request=request),
        'pedidos_cliente': reverse('pedido_app:pedidocliente-list', request=request),
        'pedidos_proveedor': reverse('pedido_app:pedidoproveedor-list', request=request),
        'promociones': reverse('promocion_app:promocion-list', request=request),
        'pagos': reverse('pago_app:pago-list', request=request), # Ya lo tenías para pago_app
        'cuentas_por_cobrar': reverse('finanza_app:cuentaporcobrar-list', request=request),
        'cuentas_por_pagar': reverse('finanza_app:cuentaporpagar-list', request=request),
        'pagos_recibidos_finanza': reverse('finanza_app:pagorecibido-list', request=request), # Distinguir de pago_app.Pago
        'pagos_realizados_finanza': reverse('finanza_app:pagorealizado-list', request=request),
        'cuentas_bancarias': reverse('finanza_app:cuentabancaria-list', request=request),
        'movimientos_caja': reverse('finanza_app:movimientocaja-list', request=request),
        'documentos_financieros': reverse('finanza_app:documentofinanciero-list', request=request),
        'reportes_configurados': reverse('reporte_app:reporteconfigurado-list', request=request),
        'configuracion_global': reverse('configuracion_app:configuracionglobal-actual', request=request), # Enlace a la acción 'actual'
        'configuraciones_api_externa': reverse('integracion_app:configuracionapi-list', request=request),
        'mensajes_contacto': reverse('contacto_app:mensajecontacto-list', request=request),
        # 'detalles_traspaso': reverse('inventario_app:detalletraspasostock-list', request=request), # Opcional si se accede directamente
    })  

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', api_root),  #  Raíz de la API
    # URLs de la app de ubicaciones
    path('api/ubicaciones/', include('ubicacion_app.api.urls')),
    # URLs de la app de usuarios
    path('api/usuarios/', include('usuario_app.api.urls')),
    # URLs de la app de sucursales (asegúrate que el prefijo no colisione)
    path('api/sucursales/', include('sucursal_app.api.urls')),
    # URLs de la app de productos
    path('api/gestion-productos/', include('producto_app.api.urls')), # Ejemplo de prefijo
    # URLs de la app de inventario
    path('api/inventario/', include('inventario_app.api.urls')),
    # URLs de la app de proveedores (Corregido para que el router de la app maneje 'proveedores/')
    path('api/', include('proveedor_app.api.urls')),
    # URLs de la app de pedidos
    path('api/pedidos/', include('pedido_app.api.urls')),
    # URLs de la app de promociones
    path('api/promociones/', include('promocion_app.api.urls')),
    # URLs de la app de configuracion
    path('api/configuracion/', include('configuracion_app.api.urls')),
    # URLs de la app de contacto
    path('api/contacto/', include('contacto_app.api.urls')),
    # URLs de la app de pagos
    path('api/pagos/', include('pago_app.api.urls')), # namespace='pago_app' es redundante si pago_app.api.urls define app_name
    # URLs de la app de finanzas
    path('api/finanzas/', include('finanza_app.api.urls')), # Asumiendo que finanza_app.api.urls define app_name
    # URLs de la app de reportes
    path('api/reportes/', include('reporte_app.api.urls')), # Asumiendo que reporte_app.api.urls define app_name
    # URLs de la app de integracion
    path('api/integraciones/', include('integracion_app.api.urls')), # Asumiendo que integracion_app.api.urls define app_name
]

# Servir archivos multimedia durante el desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
