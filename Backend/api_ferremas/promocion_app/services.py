from decimal import Decimal, ROUND_HALF_UP
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from .models import Promocion # Asumiendo que Promocion está en la misma app (promocion_app)
# Para type hinting y acceso a modelos de producto si es necesario:
from producto_app.models import Producto as ProductoModel, Categoria as CategoriaModel, Marca as MarcaModel


def obtener_promociones_aplicables_para_producto(producto: ProductoModel, cliente=None):
    """
    Obtiene todas las promociones vigentes y activas que podrían aplicar a un producto,
    considerando el producto mismo, su categoría y su marca.
    Filtra también por si la promoción es solo para clientes registrados.

    Args:
        producto (ProductoModel): La instancia del producto.
        cliente (ClienteModel, optional): La instancia del cliente. Defaults to None.

    Returns:
        list: Una lista de instancias de Promocion aplicables.
    """
    now = timezone.now()
    promociones_candidatas = []

    # ContentTypes para filtrar por GenericForeignKey
    ct_producto = ContentType.objects.get_for_model(ProductoModel)
    ct_categoria = ContentType.objects.get_for_model(CategoriaModel)
    ct_marca = ContentType.objects.get_for_model(MarcaModel)

    # IDs de los objetos relacionados
    producto_id = producto.id
    categoria_id = producto.categoria.id if producto.categoria else None
    marca_id = producto.marca.id if producto.marca else None

    # Query base para promociones activas y vigentes
    qs_base = Promocion.objects.filter(
        activo=True,
        fecha_inicio__lte=now,
        fecha_fin__gte=now
    )

    # 1. Promociones específicas para el producto
    promociones_candidatas.extend(
        qs_base.filter(content_type=ct_producto, object_id=producto_id)
    )

    # 2. Promociones para la categoría del producto
    if categoria_id:
        promociones_candidatas.extend(
            qs_base.filter(content_type=ct_categoria, object_id=categoria_id)
        )

    # 3. Promociones para la marca del producto
    if marca_id:
        promociones_candidatas.extend(
            qs_base.filter(content_type=ct_marca, object_id=marca_id)
        )
    
    # 4. Promociones generales (sin content_type ni object_id específico, si las permites)
    # promociones_candidatas.extend(
    #     qs_base.filter(content_type__isnull=True, object_id__isnull=True)
    # )

    # Filtrar por cliente registrado y límite de uso
    promociones_finales = []
    for promo in list(set(promociones_candidatas)): # set para eliminar duplicados si un producto cae en múltiples categorías/marcas con la misma promo
        if promo.solo_para_clientes_registrados and (not cliente or not cliente.usuario.is_authenticated):
            continue
        if promo.limite_uso_total is not None and promo.usos_actuales >= promo.limite_uso_total:
            continue
        promociones_finales.append(promo)
        
    return promociones_finales


def aplicar_promociones_a_item_carrito(
    producto_id: int, # Usamos ID para evitar pasar el objeto completo si no es necesario aquí
    cantidad: int,
    precio_unitario_original: Decimal,
    cliente=None # Instancia del modelo Cliente de usuario_app
):
    """
    Calcula el precio total de una línea de pedido después de aplicar las promociones.
    Prioridades:
    1. 2x1
    2. Descuento en Porcentaje (%)
    3. Descuento de Valor Fijo (asumiendo que Promocion.TipoPromocion.PRECIO_FIJO se usa para esto)

    Retorna:
        tuple: (precio_total_linea_con_descuento, lista_promociones_aplicadas_info)
    """
    # Obtener el objeto producto
    try:
        producto_obj = ProductoModel.objects.get(id=producto_id)
    except ProductoModel.DoesNotExist:
        return precio_unitario_original * cantidad, ["Error: Producto no encontrado"]

    promociones_aplicables = obtener_promociones_aplicables_para_producto(producto_obj, cliente)
    
    precio_unitario_actual = precio_unitario_original
    precio_total_linea = precio_unitario_original * cantidad
    promociones_aplicadas_info = [] # Lista de strings describiendo las promociones aplicadas

    # --- 1. Aplicar Promoción 2x1 (Máxima Prioridad) ---
    promo_2x1 = next((p for p in promociones_aplicables if p.tipo_promocion == Promocion.TipoPromocion.DOS_POR_UNO), None)
    if promo_2x1 and cantidad >= 2:
        unidades_gratis = cantidad // 2
        unidades_pagadas = cantidad - unidades_gratis
        precio_total_linea = precio_unitario_original * unidades_pagadas
        promociones_aplicadas_info.append(
            f"{promo_2x1.titulo} (2x1): {unidades_gratis} unidad(es) gratis."
        )
        # Si se aplica 2x1, asumimos que no se aplican otros descuentos de % o valor fijo a esta línea.
        # La lógica de "usos_actuales" de la promoción 2x1 debería incrementarse fuera de esta función.
        return precio_total_linea, promociones_aplicadas_info

    # Si no hay 2x1, o la cantidad es < 2, continuamos con otros descuentos.

    # --- 2. Aplicar Descuento en Porcentaje (%) ---
    # Si hay múltiples promociones de %, aplicar la de mayor descuento.
    promos_porcentaje = [p for p in promociones_aplicables if p.tipo_promocion == Promocion.TipoPromocion.DESCUENTO_PORCENTAJE and p.valor > 0]
    if promos_porcentaje:
        mejor_promo_porcentaje = max(promos_porcentaje, key=lambda p: p.valor) # Mayor valor de %
        descuento_porc = (mejor_promo_porcentaje.valor / Decimal('100'))
        monto_descuento_porc_unitario = precio_unitario_actual * descuento_porc
        precio_unitario_actual -= monto_descuento_porc_unitario
        promociones_aplicadas_info.append(
            f"{mejor_promo_porcentaje.titulo} ({mejor_promo_porcentaje.valor}%): -{monto_descuento_porc_unitario:.2f} por unidad."
        )

    # --- 3. Aplicar Descuento de Valor Fijo (interpretado desde PRECIO_FIJO) ---
    # Se aplica DESPUÉS del porcentaje.
    # Si hay múltiples, aplicar el de mayor descuento.
    # Asumimos que Promocion.valor para PRECIO_FIJO es el monto a descontar.
    promos_valor_fijo = [p for p in promociones_aplicables if p.tipo_promocion == Promocion.TipoPromocion.PRECIO_FIJO and p.valor > 0]
    if promos_valor_fijo:
        mejor_promo_valor_fijo = max(promos_valor_fijo, key=lambda p: p.valor) # Mayor valor de descuento
        monto_descuento_fijo_unitario = mejor_promo_valor_fijo.valor
        
        if precio_unitario_actual > monto_descuento_fijo_unitario:
            precio_unitario_actual -= monto_descuento_fijo_unitario
        else: # El descuento es mayor o igual al precio, el precio es 0 (o un mínimo)
            monto_descuento_fijo_unitario = precio_unitario_actual # No descontar más que el precio actual
            precio_unitario_actual = Decimal('0.00')
            
        promociones_aplicadas_info.append(
            f"{mejor_promo_valor_fijo.titulo} (Valor Fijo): -{monto_descuento_fijo_unitario:.2f} por unidad."
        )

    # Asegurar que el precio unitario no sea negativo
    precio_unitario_actual = max(Decimal('0.00'), precio_unitario_actual)

    # Calcular precio total de la línea con los descuentos aplicados (si no hubo 2x1)
    precio_total_linea = precio_unitario_actual * cantidad

    # Redondear al final
    precio_total_linea = precio_total_linea.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    # La lógica de "usos_actuales" de las promociones de % y valor fijo
    # debería incrementarse fuera de esta función, por cada promoción efectivamente aplicada.

    return precio_total_linea, promociones_aplicadas_info