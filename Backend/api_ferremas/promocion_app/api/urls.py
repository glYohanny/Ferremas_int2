from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PromocionViewSet, TipoPromocionChoicesView, PromocionContentTypeListView # Añadir la nueva vista

app_name = 'promocion_app'

router = DefaultRouter()
router.register(r'promociones', PromocionViewSet, basename='promocion')
urlpatterns = [
    path('', include(router.urls)),
    path('tipos-promocion/', TipoPromocionChoicesView.as_view(), name='tipos-promocion-list'), # Nueva URL
    path('contenttypes/', PromocionContentTypeListView.as_view(), name='promocion-contenttypes-list'), # URL para ContentTypes
]