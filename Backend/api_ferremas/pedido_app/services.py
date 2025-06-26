from django.db import transaction
from rest_framework.exceptions import ValidationError
from django.db.models import F

from .models import PedidoCliente, EstadoPedidoCliente
from inventario_app.models import DetalleInventarioBodega, InventarioSucursal, TraspasoInternoStock, DetalleTraspasoStock
from sucursal_app.models import Bodega

def intentar_crear_traspaso_automatico(pedido_cliente, producto, cantidad_faltante, bodega_destino_traspaso, usuario_solicitante=None):
    """
    Intenta crear un traspaso automático para cubrir el stock faltante.
    Retorna True si el traspaso se crea o se identifica uno existente, False si no.
    'usuario_solicitante' es el usuario que se asignará como 'creado_por' en el traspaso.
    """
    sucursal_despacho_actual = pedido_cliente.sucursal_despacho
    bodega_origen_traspaso = None
    sucursal_origen_traspaso = None

    detalles_stock_disponibles = DetalleInventarioBodega.objects.filter(
        producto=producto,
        cantidad__gte=cantidad_faltante
    ).exclude(bodega=bodega_destino_traspaso).order_by('-cantidad')

    for stock_disponible in detalles_stock_disponibles:
        bodega_origen_traspaso = stock_disponible.bodega
        sucursal_origen_traspaso = stock_disponible.bodega.sucursal
        break

    if not bodega_origen_traspaso:
        return False

    traspaso_existente = TraspasoInternoStock.objects.filter(
        pedido_cliente_origen=pedido_cliente,
        sucursal_destino=sucursal_despacho_actual,
        estado=TraspasoInternoStock.EstadoTraspaso.PENDIENTE,
        detalles_traspaso__producto=producto,
        detalles_traspaso__bodega_destino=bodega_destino_traspaso
    ).first()

    if traspaso_existente:
        return True

    traspaso = TraspasoInternoStock.objects.create(
        sucursal_origen=sucursal_origen_traspaso,
        sucursal_destino=sucursal_despacho_actual,
        estado=TraspasoInternoStock.EstadoTraspaso.PENDIENTE,
        motivo=TraspasoInternoStock.MotivoTraspaso.PARA_COMPLETAR_PEDIDO,
        creado_por=usuario_solicitante,
        pedido_cliente_origen=pedido_cliente
    )
    DetalleTraspasoStock.objects.create(
        traspaso=traspaso,
        producto=producto,
        cantidad_solicitada=cantidad_faltante,
        bodega_origen=bodega_origen_traspaso,
        bodega_destino=bodega_destino_traspaso
    )
    return True

def modificar_stock_para_pedido(pedido_cliente, anular_reduccion=False, usuario_solicitante_traspaso=None):
    """
    Modifica el stock para los productos de un pedido.
    Si anular_reduccion es True, devuelve el stock (suma).
    Si anular_reduccion es False, reduce el stock (resta).
    Retorna True si el stock se modificó completamente, False si se requiere reabastecimiento.
    """
    stock_modificado_completamente = True
    with transaction.atomic():
        for detalle_pedido in pedido_cliente.detalles_pedido_cliente.all():
            producto = detalle_pedido.producto
            cantidad_a_modificar = detalle_pedido.cantidad
            bodega_operativa = None

            if not pedido_cliente.sucursal_despacho:
                raise ValueError(f"Pedido {pedido_cliente.id} no tiene sucursal de despacho asignada.")
            
            inventario_sucursal_despacho = InventarioSucursal.objects.get(sucursal=pedido_cliente.sucursal_despacho)
            
            bodega_operativa = Bodega.objects.filter(sucursal=pedido_cliente.sucursal_despacho, is_active=True, tipo_bodega__tipo='Sala de Ventas').first()
            if not bodega_operativa:
                bodega_operativa = Bodega.objects.filter(sucursal=pedido_cliente.sucursal_despacho, is_active=True).first()
            if not bodega_operativa:
                raise ValidationError(f"No se encontró bodega operativa para la sucursal de despacho {pedido_cliente.sucursal_despacho.nombre}.")

            stock_bodega, _ = DetalleInventarioBodega.objects.get_or_create(
                inventario_sucursal=inventario_sucursal_despacho,
                producto=producto,
                bodega=bodega_operativa,
                defaults={'cantidad': 0}
            )

            if anular_reduccion:
                stock_bodega.cantidad = F('cantidad') + cantidad_a_modificar
                stock_bodega.save(update_fields=['cantidad'])
            else: # Reducir stock
                if stock_bodega.cantidad < cantidad_a_modificar:
                    cantidad_faltante = cantidad_a_modificar - stock_bodega.cantidad
                    if stock_bodega.cantidad > 0:
                        stock_bodega.cantidad = 0
                        stock_bodega.save(update_fields=['cantidad'])
                    
                    if intentar_crear_traspaso_automatico(pedido_cliente, producto, cantidad_faltante, bodega_operativa, usuario_solicitante_traspaso):
                        stock_modificado_completamente = False
                    else:
                        raise ValidationError(f"Stock insuficiente para '{producto.nombre}' en la bodega '{bodega_operativa}' y no se pudo generar traspaso.")
                else:
                    stock_bodega.cantidad = F('cantidad') - cantidad_a_modificar
                    stock_bodega.save(update_fields=['cantidad'])
    return stock_modificado_completamente