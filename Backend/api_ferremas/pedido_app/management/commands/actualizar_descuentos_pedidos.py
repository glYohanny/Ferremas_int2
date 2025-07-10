from django.core.management.base import BaseCommand
from pedido_app.models import PedidoCliente, DetallePedidoCliente
from decimal import Decimal


class Command(BaseCommand):
    help = 'Actualiza los campos de descuento en pedidos existentes'

    def handle(self, *args, **options):
        self.stdout.write('Iniciando actualización de descuentos en pedidos...')
        
        pedidos_actualizados = 0
        detalles_actualizados = 0
        
        # Obtener todos los pedidos de cliente
        pedidos = PedidoCliente.objects.all()
        
        for pedido in pedidos:
            detalles_actualizados_pedido = 0
            
            # Actualizar cada detalle del pedido
            for detalle in pedido.detalles_pedido_cliente.all():
                # Usar el nuevo método para calcular descuentos
                detalle.calcular_descuentos_linea()
                detalles_actualizados_pedido += 1
            
            # Recalcular totales del pedido
            pedido.calcular_totales_cliente()
            pedidos_actualizados += 1
            
            self.stdout.write(
                f'Pedido #{pedido.id}: {detalles_actualizados_pedido} detalles actualizados'
            )
            
            detalles_actualizados += detalles_actualizados_pedido
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Actualización completada. {pedidos_actualizados} pedidos y {detalles_actualizados} detalles actualizados.'
            )
        ) 