from rest_framework import viewsets, permissions
from rest_framework import filters as drf_filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status # Renombrar para evitar conflicto
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.contenttypes.models import ContentType
from django.http import Http404

from ..models import Promocion
from .serializers import PromocionSerializer
from .filters import PromocionFilter
# Asegúrate de que la ruta de importación sea correcta para tus modelos de producto_app
from producto_app.models import Producto as ProductoModel, Categoria as CategoriaModel, Marca as MarcaModel

class PromocionViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar Promociones.
    Permite CRUD completo y listado con filtros.
    La activación/desactivación se maneja actualizando el campo 'activo'.
    La asignación a Producto/Marca/Categoría se maneja con 'content_type' y 'object_id'.
    """
    # Se optimiza la consulta para evitar problemas de N+1 con GenericForeignKey.
    # `select_related` para la FK a ContentType y `prefetch_related` para el GFK.
    queryset = Promocion.objects.select_related('content_type').prefetch_related('objetivo_promocion')
    serializer_class = PromocionSerializer
    permission_classes = [permissions.IsAdminUser] # Solo administradores pueden gestionar promociones

    filter_backends = [
        DjangoFilterBackend,
        drf_filters.SearchFilter,
        drf_filters.OrderingFilter
    ]
    filterset_class = PromocionFilter
    search_fields = ['titulo', 'descripcion', 'codigo_promocional']
    ordering_fields = ['titulo', 'tipo_promocion', 'fecha_inicio', 'fecha_fin', 'activo']

class TipoPromocionChoicesView(APIView):
    """
    Devuelve las opciones disponibles para el campo 'tipo_promocion' del modelo Promocion.
    """
    permission_classes = [permissions.IsAuthenticated] # O IsAdminUser si solo admins pueden ver esto

    def get(self, request, *args, **kwargs):
        tipos = [{'value': choice[0], 'label': choice[1]} for choice in Promocion.TipoPromocion.choices]
        return Response(tipos)

class PromocionContentTypeListView(APIView):
    """
    Devuelve una lista de los ContentTypes a los que se pueden aplicar promociones.
    """
    permission_classes = [permissions.IsAuthenticated] # O IsAdminUser si solo admins pueden ver esto

    def get(self, request, *args, **kwargs):
        # Se obtienen los modelos permitidos dinámicamente desde la definición del modelo Promocion.
        # Esto evita tener una lista hardcodeada y mantiene el código DRY.
        limit_choices = Promocion._meta.get_field('content_type').get_limit_choices_to()
        app_labels = limit_choices.get('app_label__in', [])
        model_names = limit_choices.get('model__in', [])

        content_types = ContentType.objects.filter(
            app_label__in=app_labels,
            model__in=model_names
        ).order_by('model') # Ordenar para una respuesta consistente

        content_types_data = []
        for ct in content_types:
            model_class = ct.model_class()
            if model_class: # Asegurarse de que el modelo existe
                content_types_data.append({
                    'id': ct.id,
                    'name': model_class._meta.model_name,
                    'verbose_name': model_class._meta.verbose_name_plural.capitalize()
                })

        return Response(content_types_data, status=http_status.HTTP_200_OK)


class PromocionObjetivoListView(APIView):
    """
    Devuelve una lista de objetos (Productos, Categorías, Marcas)
    para un ContentType específico, para ser usados en un selector en el frontend.
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, content_type_id, *args, **kwargs):
        try:
            content_type = ContentType.objects.get_for_id(content_type_id)
            model_class = content_type.model_class()
        except ContentType.DoesNotExist:
            raise Http404("ContentType no encontrado.")

        # Validar que el modelo sea uno de los permitidos para promociones
        allowed_models = (ProductoModel, CategoriaModel, MarcaModel)
        if model_class not in allowed_models:
            return Response(
                {"error": "Este tipo de objeto no es promocionable."},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        queryset = model_class.objects.all().order_by('nombre')
        # Serializador simple para devolver solo id y nombre, ideal para un <select>
        data = [{"id": obj.id, "nombre": str(obj)} for obj in queryset]

        return Response(data, status=http_status.HTTP_200_OK)
