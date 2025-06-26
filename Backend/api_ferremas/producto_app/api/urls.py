from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoriaViewSet, MarcaViewSet, ProductoViewSet, ProductoCatalogoAPIView

app_name = 'producto_app'

router = DefaultRouter()
router.register(r'categorias', CategoriaViewSet, basename='categoriaproducto')
router.register(r'marcas', MarcaViewSet, basename='marcaproducto') # basename diferente si 'marca' ya se usa
# Se registra en la raíz ('') para que las URLs sean /api/productos/ y /api/productos/<pk>/
router.register(r'', ProductoViewSet, basename='producto')

urlpatterns = [
    path('catalogo/', ProductoCatalogoAPIView.as_view(), name='producto-catalogo'),
    path('', include(router.urls)),
]