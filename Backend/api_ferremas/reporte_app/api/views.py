from rest_framework import viewsets, permissions
from rest_framework import filters as drf_filters
from django_filters.rest_framework import DjangoFilterBackend

from ..models import ReporteConfigurado
from .serializers import ReporteConfiguradoSerializer
from .filters import ReporteConfiguradoFilter
# Asumiendo que tienes permisos como EsAdministrador o EsContable
from usuario_app.api.permissions import EsAdministrador, EsContable 

class ReporteConfiguradoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar las configuraciones de Reportes.
    Permite CRUD completo y listado con filtros.
    La generación real del reporte es una lógica separada.
    """
    queryset = ReporteConfigurado.objects.select_related('creado_por').all()
    serializer_class = ReporteConfiguradoSerializer
    # Solo personal autorizado (ej. Admin, Contable) puede gestionar configuraciones de reportes
    permission_classes = [permissions.IsAuthenticated, (EsAdministrador | EsContable)] 

    filter_backends = [
        DjangoFilterBackend,
        drf_filters.SearchFilter,
        drf_filters.OrderingFilter
    ]
    filterset_class = ReporteConfiguradoFilter
    search_fields = ['nombre', 'descripcion', 'tipo_especifico']
    ordering_fields = ['nombre', 'categoria', 'fecha_creacion', 'ultima_ejecucion']

    def perform_create(self, serializer):
        # Asignar el usuario que crea la configuración del reporte automáticamente
        if self.request.user.is_authenticated:
            serializer.save(creado_por=self.request.user)
        else:
            serializer.save() # O levantar error si se requiere autenticación