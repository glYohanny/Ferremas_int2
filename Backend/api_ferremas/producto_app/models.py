from django.db import models
# Importaciones necesarias para la lógica de promociones
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone

# Create your models here.

class Categoria(models.Model):
    # id es automático
    nombre = models.CharField(max_length=100, unique=True, verbose_name="Nombre de Categoría")

    class Meta:
        verbose_name = "Categoría"
        verbose_name_plural = "Categorías"
        ordering = ['nombre']

    def __str__(self):
        return self.nombre

class Marca(models.Model):
    # id es automático
    nombre = models.CharField(max_length=100, unique=True, verbose_name="Nombre de Marca")

    class Meta:
        verbose_name = "Marca"
        verbose_name_plural = "Marcas"
        ordering = ['nombre']

    def __str__(self):
        return self.nombre

class Producto(models.Model):
    # id_producto es automático (id)
    sku = models.CharField(max_length=100, unique=True, verbose_name="SKU", help_text="Stock Keeping Unit, código único del producto.")
    nombre = models.CharField(max_length=200, verbose_name="Nombre del Producto")
    marca = models.ForeignKey(Marca, on_delete=models.PROTECT, related_name="productos_marca", verbose_name="Marca")
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name="productos_categoria", verbose_name="Categoría")
    precio = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Precio") # Ej: 99999999.99
    descripcion = models.TextField(blank=True, null=True, verbose_name="Descripción")
    # Para el campo imagen, necesitarás configurar MEDIA_ROOT y MEDIA_URL en settings.py
    # y también instalar Pillow: pip install Pillow
    imagen = models.ImageField(upload_to='productos_imagenes/', blank=True, null=True, verbose_name="Imagen del Producto")
    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación")
    fecha_actualizacion = models.DateTimeField(auto_now=True, verbose_name="Fecha de Actualización")
    # Podrías añadir un campo para indicar si el producto está activo/disponible
    # activo = models.BooleanField(default=True, verbose_name="Activo")

    class Meta:
        verbose_name = "Producto"
        verbose_name_plural = "Productos"
        ordering = ['nombre']
        # Podrías querer que el nombre del producto sea único dentro de una marca, por ejemplo:
        # unique_together = ('nombre', 'marca')

    def __str__(self):
        return f"{self.nombre} ({self.marca.nombre})"

    def _get_promociones_candidatas(self):
        """Helper para obtener promociones candidatas por tipo de objeto."""
        from promocion_app.models import Promocion # Importación local para evitar ciclos
        # Necesitamos la clase Promocion para acceder a sus TextChoices
        
        content_type_producto = ContentType.objects.get_for_model(self.__class__)
        
        # Usamos Q objects para construir la consulta de forma más flexible
        q_objetos = models.Q(content_type=content_type_producto, object_id=self.id)

        if self.categoria:
            content_type_categoria = ContentType.objects.get_for_model(self.categoria.__class__)
            q_objetos |= models.Q(content_type=content_type_categoria, object_id=self.categoria.id)

        if self.marca:
            content_type_marca = ContentType.objects.get_for_model(self.marca.__class__)
            q_objetos |= models.Q(content_type=content_type_marca, object_id=self.marca.id)
            
        return Promocion.objects.filter(q_objetos)

    def get_promociones_aplicables(self):
        """
        Devuelve una lista de instancias de Promocion que están activas,
        vigentes y aplican a este producto (directamente, por categoría o marca).
        """
        candidatas = self._get_promociones_candidatas()
        promociones_validas = [p for p in candidatas if p.esta_vigente] # Quitar paréntesis
        return promociones_validas

    @property
    def precio_final_con_info_promo(self):
        """
        Calcula el precio final aplicando la mejor promoción (la que resulte en el menor precio)
        y devuelve una tupla: (precio_final, instancia_promocion_aplicada | None).
        """
        from promocion_app.models import Promocion # Importación local para acceder a Promocion.TipoPromocion
        
        promociones_aplicables = self.get_promociones_aplicables()
        precio_original = self.precio # El precio base del producto
        precio_actual = precio_original
        promociones_efectivas_info = [] # Guardará info de las promos apiladas

        if not promociones_aplicables:
            return precio_original, None

        # 1. Aplicar el mejor descuento porcentual
        mejor_promo_porcentaje = None
        precio_despues_porcentaje = precio_actual
        
        promos_porcentaje = [p for p in promociones_aplicables if p.tipo_promocion == Promocion.TipoPromocion.DESCUENTO_PORCENTAJE and p.valor is not None]
        if promos_porcentaje:
            precio_temporal_mejor_porcentaje = precio_actual
            for promo_p in promos_porcentaje:
                # Aplicar sobre el precio_original para esta etapa de selección de la mejor promo de %
                precio_con_esta_promo_p = promo_p.aplicar_a_precio(precio_original) 
                if precio_con_esta_promo_p < precio_temporal_mejor_porcentaje:
                    precio_temporal_mejor_porcentaje = precio_con_esta_promo_p
                    mejor_promo_porcentaje = promo_p
            
            if mejor_promo_porcentaje:
                precio_actual = precio_temporal_mejor_porcentaje
                promociones_efectivas_info.append({
                    "titulo": mejor_promo_porcentaje.titulo, 
                    "tipo": "Porcentaje", 
                    "valor_aplicado": mejor_promo_porcentaje.valor,
                    "id": mejor_promo_porcentaje.id
                })

        # 2. Aplicar el mejor descuento de monto fijo sobre el precio ya ajustado (si hubo descuento porcentual)
        mejor_promo_monto_fijo = None
        # Asumiendo que tienes Promocion.TipoPromocion.DESCUENTO_MONTO_FIJO
        promos_monto_fijo = [p for p in promociones_aplicables if p.tipo_promocion == Promocion.TipoPromocion.DESCUENTO_MONTO_FIJO and p.valor is not None]
        if promos_monto_fijo:
            precio_temporal_mejor_monto = precio_actual
            for promo_mf in promos_monto_fijo:
                # Aplicar al precio actual (ya posiblemente rebajado por porcentaje)
                # para seleccionar el mejor descuento de monto fijo
                precio_con_esta_promo_mf = promo_mf.aplicar_a_precio(precio_actual)
                if precio_con_esta_promo_mf < precio_temporal_mejor_monto:
                    precio_temporal_mejor_monto = precio_con_esta_promo_mf
                    mejor_promo_monto_fijo = promo_mf
            
            if mejor_promo_monto_fijo:
                precio_actual = precio_temporal_mejor_monto
                promociones_efectivas_info.append({
                    "titulo": mejor_promo_monto_fijo.titulo, 
                    "tipo": "Monto Fijo", 
                    "valor_aplicado": mejor_promo_monto_fijo.valor,
                    "id": mejor_promo_monto_fijo.id
                })

        # 3. Considerar promociones de PRECIO_FIJO. Estas anulan los descuentos apilados si resultan en un precio menor.
        # Esta lógica se mantiene si PRECIO_FIJO es un precio final absoluto que compite.
        mejor_promo_precio_fijo_obj = None 
        precio_final_considerando_fijo = precio_actual

        promos_precio_fijo = [p for p in promociones_aplicables if p.tipo_promocion == Promocion.TipoPromocion.PRECIO_FIJO and p.valor is not None]
        if promos_precio_fijo:
            mejor_precio_fijo_val = precio_actual # Empezar con el precio ya apilado
            for promo_f in promos_precio_fijo:
                # aplicar_a_precio para PRECIO_FIJO devuelve el valor de la promo (el precio final)
                precio_con_esta_promo_f = promo_f.aplicar_a_precio(precio_original) # PRECIO_FIJO es absoluto
                if precio_con_esta_promo_f < mejor_precio_fijo_val:
                    mejor_precio_fijo_val = precio_con_esta_promo_f
                    mejor_promo_precio_fijo_obj = promo_f
            
            if mejor_promo_precio_fijo_obj and mejor_precio_fijo_val < precio_actual:
                # Si el precio fijo es mejor que el apilado, se usa el precio fijo.
                precio_actual = mejor_precio_fijo_val
                # La única promoción "efectiva" en este caso es la de precio fijo.
                promociones_efectivas_info = [{
                    "titulo": mejor_promo_precio_fijo_obj.titulo, 
                    "tipo": "Precio Fijo", 
                    "valor_aplicado": mejor_promo_precio_fijo_obj.valor, # El valor es el precio final
                    "id": mejor_promo_precio_fijo_obj.id
                }]

        # Si el precio final no cambió respecto al original, no se considera que se aplicó una promoción efectiva.
        if precio_actual >= precio_original: # Usar >= por si alguna promo resulta en precio mayor (aunque max(0,...) lo evita)
             return precio_original, None

        # Devolver el precio final y la información de la(s) promoción(es) aplicada(s).
        # Para simplificar, si hubo múltiples, podríamos crear un título combinado o devolver la info de la más impactante/última.
        # O, idealmente, el serializer y el frontend manejarían una lista de promociones aplicadas.
        # Por ahora, si hay múltiples, creamos un título genérico.
        # Y para 'info_promocion_aplicada' en el serializer, necesitarás decidir qué objeto Promocion enviar
        # o si cambias el serializer para enviar esta nueva estructura 'promociones_efectivas_info'.
        
        # Para este ejemplo, si se aplicaron promociones, intentaremos devolver la "más relevante"
        # o la que resultó en el precio_actual si fue una de PRECIO_FIJO.
        # Esta parte es la más compleja de mapear al 'info_promocion_aplicada' actual.
        
        promocion_principal_para_api = None
        if promociones_efectivas_info:
            # Si la última promo efectiva fue de tipo Precio Fijo (porque anuló las otras)
            # y ese precio fijo es el precio_actual
            if mejor_promo_precio_fijo_obj and precio_actual == mejor_promo_precio_fijo_obj.valor:
                promocion_principal_para_api = mejor_promo_precio_fijo_obj
            # Si no, y hubo un descuento de monto fijo aplicado
            elif mejor_promo_monto_fijo:
                 promocion_principal_para_api = mejor_promo_monto_fijo
            # Si no, y hubo un descuento porcentual aplicado
            elif mejor_promo_porcentaje:
                promocion_principal_para_api = mejor_promo_porcentaje

        return precio_actual, promocion_principal_para_api

# Podrías considerar un modelo para "Características del Producto" si necesitas
# atributos más dinámicos (ej. color, tamaño, material) que varían por categoría.
# O un modelo de "Variante de Producto" si un producto tiene múltiples versiones (ej. T-shirt en S, M, L y rojo, azul).
