from django.db.models.signals import post_save
from django.dispatch import receiver
from inventario_app.models import TraspasoInternoStock # Importar solo TraspasoInternoStock
from .models import PedidoCliente, EstadoPedidoCliente
from bitacora_app.utils import crear_registro_actividad # Importar el helper de bitácora

@receiver(post_save, sender=TraspasoInternoStock)
def manejar_completitud_traspaso_para_pedido_cliente(sender, instance, created, **kwargs):
    """
    Cuando un traspaso para completar un pedido de cliente se marca como COMPLETADO,
    intenta cambiar el estado del pedido de cliente para que se reprocese el stock.
    """
    if instance.motivo == TraspasoInternoStock.MotivoTraspaso.PARA_COMPLETAR_PEDIDO and \
       instance.estado == TraspasoInternoStock.EstadoTraspaso.COMPLETADO and \
       instance.pedido_cliente_origen:

        pedido_cliente = instance.pedido_cliente_origen
        
        # Solo actuar si el pedido estaba esperando reabastecimiento
        if pedido_cliente.estado == EstadoPedidoCliente.PENDIENTE_REABASTECIMIENTO:
            # Aquí decidimos a qué estado debe pasar el pedido.
            # Si el flujo normal es PENDIENTE -> PAGADO -> PROCESANDO,
            # y el pago ya ocurrió antes de PENDIENTE_REABASTECIMIENTO,
            # podría pasar directamente a PROCESANDO o PAGADO (si el pago es el siguiente paso).
            # Asumamos que debe volver a un estado donde se intente la deducción de stock.
            # Si el pedido ya estaba pagado, podría pasar a PROCESANDO.
            # Si el pago es posterior, podría volver a PENDIENTE o PAGADO (si el pago es el siguiente paso).
            # Por simplicidad, lo pasaremos a PROCESANDO, asumiendo que el pago ya se gestionó
            # o que PROCESANDO es el estado donde se vuelve a verificar stock.
            
            # Importante: Este save() NO disparará el perform_update del ViewSet directamente.
            # La lógica de _modificar_stock_pedido se invoca desde el ViewSet.
            # Este cambio de estado es para que el sistema (o un usuario) sepa que puede reintentar.
            pedido_cliente.estado = EstadoPedidoCliente.PROCESANDO # O el estado apropiado
            pedido_cliente.notas_cliente = (pedido_cliente.notas_cliente or "") + \
                                           f"\nStock reabastecido por traspaso ID {instance.id}. Listo para reprocesar."
            pedido_cliente.save(update_fields=['estado', 'notas_cliente'])
            print(f"Pedido Cliente {pedido_cliente.id} actualizado a {pedido_cliente.estado} tras completarse traspaso {instance.id}")


@receiver(post_save, sender=PedidoCliente)
def registrar_cambio_pedido_cliente(sender, instance: PedidoCliente, created, **kwargs):
    """
    Registra en la bitácora la creación o actualización de un PedidoCliente.
    """
    usuario_actor = None
    request_obj = None # No disponible directamente en post_save, a menos que se pase de otra forma

    # Intentar deducir el usuario actor
    if hasattr(instance, '_request_user') and instance._request_user: # Si se adjuntó al guardar desde la vista
        usuario_actor = instance._request_user
    elif instance.creado_por_personal:
        usuario_actor = instance.creado_por_personal
    elif instance.cliente and instance.cliente.usuario:
        usuario_actor = instance.cliente.usuario

    if created:
        accion = "CREAR_PEDIDO_CLIENTE"
        descripcion = f"Se creó el pedido de cliente #{instance.id} para {instance.cliente}."
    else:
        accion = "ACTUALIZAR_PEDIDO_CLIENTE"
        descripcion = f"Se actualizó el pedido de cliente #{instance.id}. Nuevo estado: {instance.get_estado_display()}."

    crear_registro_actividad(
        usuario=usuario_actor,
        accion=accion,
        descripcion=descripcion,
        objeto_relacionado=instance,
        request=request_obj # Será None aquí
    )