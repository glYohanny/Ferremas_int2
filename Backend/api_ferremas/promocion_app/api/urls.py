from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PromocionViewSet,
    TipoPromocionChoicesView,
    PromocionContentTypeListView,
    PromocionObjetivoListView
)

app_name = 'promocion_app'

router = DefaultRouter()
router.register(r'promociones', PromocionViewSet, basename='promocion')
urlpatterns = [
    path('', include(router.urls)),
    path('tipos-promocion/', TipoPromocionChoicesView.as_view(), name='tipos-promocion-list'),
    path('contenttypes/', PromocionContentTypeListView.as_view(), name='promocion-contenttypes-list'),
    path('objetivos/<int:content_type_id>/', PromocionObjetivoListView.as_view(), name='promocion-objetivos-list'),
]