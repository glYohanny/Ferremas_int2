from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Pago
from bitacora_app.utils import crear_registro_actividad

@receiver(post_save, sender=Pago)
def registrar_cambio_pago(sender, instance: Pago, created, **kwargs):
    """
    Registra en la bitácora la creación o actualización de un Pago.
    """
    usuario_actor = None
    request_obj = None # No disponible directamente en post_save

    # Intentar deducir el usuario actor si el pago está ligado a un pedido de cliente
    if instance.pedido_cliente and instance.pedido_cliente.cliente and instance.pedido_cliente.cliente.usuario:
        usuario_actor = instance.pedido_cliente.cliente.usuario
    elif instance.pedido_cliente and instance.pedido_cliente.creado_por_personal:
         usuario_actor = instance.pedido_cliente.creado_por_personal

    if created:
        accion = "CREAR_PAGO"
        descripcion = f"Se creó el registro de pago #{instance.id} para el pedido #{instance.pedido_cliente.id}. Estado: {instance.get_estado_pago_display()}, Método: {instance.get_metodo_pago_display()}."
    else:
        accion = "ACTUALIZAR_PAGO"
        descripcion = f"Se actualizó el registro de pago #{instance.id} para el pedido #{instance.pedido_cliente.id}. Nuevo estado: {instance.get_estado_pago_display()}, Método: {instance.get_metodo_pago_display()}."

    crear_registro_actividad(
        usuario=usuario_actor, # Puede ser None si no se puede determinar
        accion=accion,
        descripcion=descripcion,
        objeto_relacionado=instance,
        request=request_obj # Será None aquí
    )