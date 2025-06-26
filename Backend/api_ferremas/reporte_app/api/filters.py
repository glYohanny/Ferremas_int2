import django_filters
from ..models import ReporteConfigurado

class ReporteConfiguradoFilter(django_filters.FilterSet):
    nombre = django_filters.CharFilter(lookup_expr='icontains', label="Nombre del reporte contiene")
    categoria = django_filters.ChoiceFilter(choices=ReporteConfigurado.CategoriaReporte.choices, label="Categoría del Reporte")
    tipo_especifico = django_filters.CharFilter(lookup_expr='icontains', label="Tipo específico contiene")
    formato_salida_preferido = django_filters.ChoiceFilter(
        choices=ReporteConfigurado.FormatoSalida.choices,
        label="Formato de Salida Preferido"
    )
    # No se puede filtrar directamente por un JSONField de forma simple con django-filter.
    # Se podrían añadir métodos personalizados si se necesita filtrar por claves específicas dentro de 'parametros'.

    class Meta:
        model = ReporteConfigurado
        fields = ['nombre', 'categoria', 'tipo_especifico', 'formato_salida_preferido', 'creado_por']