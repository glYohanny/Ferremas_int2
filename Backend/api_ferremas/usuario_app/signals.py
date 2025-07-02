from django.db.models.signals import pre_save
from django.dispatch import receiver
from .models import DireccionCliente

@receiver(pre_save, sender=DireccionCliente)
def asegurar_unica_direccion_principal(sender, instance, **kwargs):
    """
    Asegura que si esta dirección se marca como principal,
    cualquier otra dirección del mismo cliente deje de serlo.
    """
    if instance.pk is None and instance.es_principal:
        # Si es una nueva dirección principal, desmarcar las demás.
        sender.objects.filter(cliente=instance.cliente, es_principal=True).update(es_principal=False)
    elif instance.es_principal:
        # Si se está actualizando una dirección a principal, desmarcar las demás.
        sender.objects.filter(cliente=instance.cliente, es_principal=True).exclude(pk=instance.pk).update(es_principal=False)