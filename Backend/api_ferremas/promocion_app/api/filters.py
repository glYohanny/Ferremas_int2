import django_filters
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from ..models import Promocion

class PromocionFilter(django_filters.FilterSet):
    titulo = django_filters.CharFilter(lookup_expr='icontains', label="Título contiene")
    tipo_promocion = django_filters.ChoiceFilter(choices=Promocion.TipoPromocion.choices, label="Tipo de Promoción")
    activo = django_filters.BooleanFilter(label="¿Está activa?")
    
    # Filtro para promociones vigentes
    vigente_ahora = django_filters.BooleanFilter(method='filter_vigente_ahora', label="¿Está vigente ahora?")

    # Filtros para el objetivo de la promoción (GenericForeignKey)
    # Para filtrar por un producto específico: ?content_type_model=producto&object_id=ID_DEL_PRODUCTO
    # Para filtrar por una categoría específica: ?content_type_model=categoria&object_id=ID_DE_LA_CATEGORIA
    # Para filtrar por una marca específica: ?content_type_model=marca&object_id=ID_DE_LA_MARCA
    content_type_model = django_filters.CharFilter(method='filter_by_content_type_model', label="Modelo del Objetivo (producto, categoria, marca)")
    # object_id se puede usar en combinación con content_type_model

    class Meta:
        model = Promocion
        fields = ['titulo', 'tipo_promocion', 'activo', 'content_type', 'object_id', 'codigo_promocional']

    def filter_vigente_ahora(self, queryset, name, value):
        now = timezone.now()
        if value is True: # Si ?vigente_ahora=true
            return queryset.filter(activo=True, fecha_inicio__lte=now, fecha_fin__gte=now)
        elif value is False: # Si ?vigente_ahora=false
            return queryset.filter(activo=False) | queryset.filter(fecha_inicio__gt=now) | queryset.filter(fecha_fin__lt=now)
        return queryset # Si no se especifica el valor booleano, no filtrar

    def filter_by_content_type_model(self, queryset, name, value):
        # value sería 'producto', 'categoria', o 'marca'
        try:
            content_type = ContentType.objects.get(app_label='producto_app', model=value.lower())
            return queryset.filter(content_type=content_type)
        except ContentType.DoesNotExist:
            return queryset.none() # Si el modelo no es válido, no devolver nada