from rest_framework import serializers
from ..models import Region, Comuna

class RegionSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Region.
    """
    class Meta:
        model = Region
        fields = ['id', 'nombre']

class ComunaSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Comuna.
    Incluye los detalles de la región anidada para facilitar su uso en el frontend.
    """
    region_detalle = RegionSerializer(source='region', read_only=True)

    class Meta:
        model = Comuna
        fields = ['id', 'nombre', 'region', 'region_detalle']