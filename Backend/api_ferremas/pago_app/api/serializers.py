from rest_framework import serializers
from ..models import Pago
from pedido_app.models import PedidoCliente, EstadoPedidoCliente # Para validación y estados
from pedido_app.api.serializers import PedidoClienteSerializer # Para mostrar detalles del pedido

class PagoSerializer(serializers.ModelSerializer):
    # Para mostrar detalles del pedido en lugar de solo el ID
    pedido_cliente_detalle = PedidoClienteSerializer(source='pedido_cliente', read_only=True)
    
    # Para mostrar el valor legible de los campos 'choices'
    metodo_pago_display = serializers.CharField(source='get_metodo_pago_display', read_only=True)
    estado_pago_display = serializers.CharField(source='get_estado_pago_display', read_only=True)
    tipo_cuotas_display = serializers.CharField(source='get_tipo_cuotas_display', read_only=True, allow_null=True)

    class Meta:
        model = Pago
        fields = [
            'id',
            'pedido_cliente', # Se usa para enviar el ID al crear/actualizar
            'pedido_cliente_detalle', # Se muestra en la lectura
            'fecha_pago',
            'monto_pagado',
            'metodo_pago', # Se usa para enviar el valor al crear/actualizar
            'metodo_pago_display', # Se muestra en la lectura
            'estado_pago', # Se usa para enviar el valor al crear/actualizar
            'estado_pago_display', # Se muestra en la lectura
            'tipo_cuotas', # Para enviar y leer el valor
            'tipo_cuotas_display', # Para leer el display
            'numero_cuotas', # Para enviar y leer el valor
            'id_transaccion_pasarela',
            'token_webpay_transaccion', # Nuevo campo
            'datos_adicionales_pasarela',
        ]
        read_only_fields = (
            'fecha_pago',
            'pedido_cliente_detalle',
            'metodo_pago_display',
            'estado_pago_display',
            'tipo_cuotas_display',
        )

    def validate(self, data):
        """
        Validaciones a nivel de objeto.
        - Asegurar que el monto_pagado coincida con el total del pedido si el pago es COMPLETADO.
        """
        # Obtener pedido_cliente: si es una actualización, puede no estar en 'data'
        pedido_cliente_id = data.get('pedido_cliente') 
        if not pedido_cliente_id and self.instance: # Para actualizaciones
            pedido_cliente_id = self.instance.pedido_cliente_id
        
        monto_pagado = data.get('monto_pagado', self.instance.monto_pagado if self.instance else None)
        estado_pago = data.get('estado_pago', self.instance.estado_pago if self.instance else None)

        if pedido_cliente_id and monto_pagado is not None and estado_pago == Pago.EstadoPago.COMPLETADO:
            try:
                pedido = PedidoCliente.objects.get(id=pedido_cliente_id.id if hasattr(pedido_cliente_id, 'id') else pedido_cliente_id)
                if monto_pagado != pedido.total_pedido:
                    raise serializers.ValidationError(
                        {"monto_pagado": f"El monto pagado ({monto_pagado}) no coincide con el total del pedido ({pedido.total_pedido})."}
                    )
            except PedidoCliente.DoesNotExist:
                raise serializers.ValidationError({"pedido_cliente": "El pedido asociado no existe."})
        return data