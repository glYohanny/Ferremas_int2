from rest_framework import serializers
from ..models import Sucursal, Bodega, TipoBodega

class TipoBodegaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoBodega
        fields = ['id', 'tipo']

class SucursalSerializer(serializers.ModelSerializer):
    region_nombre = serializers.CharField(source='region.nombre', read_only=True)
    comuna_nombre = serializers.CharField(source='comuna.nombre', read_only=True)

    class Meta:
        model = Sucursal
        fields = ['id', 'nombre', 'region', 'region_nombre', 'comuna', 'comuna_nombre', 'direccion', 'is_active', 'fecha_registro']
        read_only_fields = ['id', 'fecha_registro', 'region_nombre', 'comuna_nombre']

class SucursalCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sucursal
        fields = ['nombre', 'region', 'comuna', 'direccion', 'is_active']

class BodegaSerializer(serializers.ModelSerializer):
    sucursal_nombre = serializers.CharField(source='sucursal.nombre', read_only=True)
    tipo_bodega_tipo = serializers.CharField(source='tipo_bodega.tipo', read_only=True)

    class Meta:
        model = Bodega
        fields = ['id', 'sucursal', 'sucursal_nombre', 'tipo_bodega', 'tipo_bodega_tipo', 'direccion']
        read_only_fields = ['sucursal_nombre', 'tipo_bodega_tipo']

class BodegaCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bodega
        fields = ['sucursal', 'tipo_bodega', 'direccion']



# Recomendaciones adicionales para los serializers:
# 1.  Validación:  Considera añadir validaciones personalizadas si hay reglas de negocio específicas (ej.,
#     formatos de dirección, restricciones en tipos de bodega por sucursal, etc.).
# 2.  Campos Adicionales:  Si necesitas mostrar información relacionada (ej., cantidad de productos en
#     bodega), puedes usar SerializerMethodField para incluir datos calculados.
# 3.  Serializadores Anidados:  Si la relación entre Sucursal y Bodega se usa frecuentemente, puedes
#     anidar el serializer de Bodega dentro del de Sucursal para obtener toda la información en una sola
#     petición.