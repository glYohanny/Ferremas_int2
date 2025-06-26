from django.conf import settings
from django.urls import reverse
from django.shortcuts import get_object_or_404, redirect # Importar redirect
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from transbank.webpay.webpay_plus.transaction import Transaction as WebpayPlusTransaction
from transbank.common.options import WebpayOptions
from transbank.common.integration_type import IntegrationType

from pedido_app.models import PedidoCliente, EstadoPedidoCliente
from ..models import Pago, MetodoPago, EstadoPago, TipoCuota # Importar TipoCuota
from bitacora_app.utils import crear_registro_actividad # Importar el helper
from pedido_app.services import modificar_stock_para_pedido # Importar el servicio de stock
from rest_framework.exceptions import ValidationError as DRFValidationError # Para capturar errores de validación del servicio

class IniciarPagoWebpayView(APIView):
    """
    Vista para iniciar una transacción de pago con Webpay Plus.
    Recibe el ID de un PedidoCliente.
    Devuelve un token y una URL para redirigir al cliente a Webpay.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pedido_id, *args, **kwargs):
        pedido_cliente = get_object_or_404(PedidoCliente, id=pedido_id, cliente=request.user.perfil_cliente)

        if pedido_cliente.estado not in [EstadoPedidoCliente.PENDIENTE, EstadoPedidoCliente.FALLIDO, EstadoPedidoCliente.PENDIENTE_REABASTECIMIENTO]:
            return Response(
                {"error": f"El pedido #{pedido_cliente.id} no está en un estado válido para iniciar un pago (actual: {pedido_cliente.get_estado_display()})."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if pedido_cliente.total_pedido <= 0:
            return Response(
                {"error": "El monto del pedido debe ser mayor a cero."},
                status=status.HTTP_400_BAD_REQUEST
            )

        buy_order = str(pedido_cliente.id) # Debe ser único para cada intento de transacción
        session_id = request.session.session_key # O genera un ID de sesión único para la transacción
        if not session_id:
            # Forzar la creación de una sesión si no existe (importante para session_id)
            request.session.save()
            session_id = request.session.session_key
        
        # Asegurar que session_id y buy_order sean únicos para cada intento si es necesario
        # Podrías añadir un timestamp o un contador al buy_order si un mismo pedido puede tener múltiples intentos
        # buy_order = f"{pedido_cliente.id}-{int(timezone.now().timestamp())}"

        amount = int(pedido_cliente.total_pedido) # Webpay espera el monto como entero
        
        # Construir la URL de retorno absoluta
        # Asegúrate de que el nombre 'webpay_retorno' esté definido en tus URLs
        return_url = request.build_absolute_uri(reverse('pago_app:webpay_retorno'))

        try:
            # Configurar Transbank SDK
            # El SDK v3+ usa WebpayOptions.
            # El SDK determina el entorno (integración/producción) basado en el commerce_code
            # o se puede forzar con IntegrationType.
            # El SDK maneja la URL base (settings.WEBPAY_API_URL) internamente si se configura bien.
            
            current_integration_type = IntegrationType.TEST if settings.DEBUG else IntegrationType.LIVE
            options = WebpayOptions(settings.WEBPAY_COMMERCE_CODE, settings.WEBPAY_API_KEY_SECRET, current_integration_type)

            # Log detallado antes de la llamada a Transbank
            print(f"DEBUG Webpay Create Params: buy_order='{buy_order}', session_id='{session_id}', amount={amount}, return_url='{return_url}'")
            print(f"DEBUG Webpay Options Used: commerce_code='{options.commerce_code}', integration_type='{options.integration_type}'") # No imprimimos la API Key por seguridad, pero asegúrate que es la correcta.

            tx = WebpayPlusTransaction(options)
            response_transbank = tx.create(buy_order, session_id, amount, return_url)

            print(f"DEBUG Webpay: Tipo de response_transbank: {type(response_transbank)}")
            print(f"DEBUG Webpay: Contenido de response_transbank: {response_transbank}")

            token_val = None
            url_val = None

            # Intentar acceder a los atributos como objeto y luego como diccionario
            if hasattr(response_transbank, 'token') and hasattr(response_transbank, 'url'):
                token_val = response_transbank.token
                url_val = response_transbank.url
                print(f"DEBUG Webpay: Acceso como objeto: token='{token_val}', url='{url_val}'")
            elif isinstance(response_transbank, dict):
                token_val = response_transbank.get('token')
                url_val = response_transbank.get('url')
                print(f"DEBUG Webpay: Acceso como dict: token='{token_val}', url='{url_val}'")
            
            if not token_val or not url_val:
                print(f"ERROR Webpay: No se pudo extraer 'token' o 'url' de la respuesta. Respuesta original: {response_transbank}")
                # Levantar una excepción más específica podría ser útil si tienes un manejador de errores global
                raise ValueError(f"Respuesta inesperada de Transbank o atributos no encontrados. Respuesta: {response_transbank}")

            # Registrar actividad
            crear_registro_actividad(
                usuario=request.user,
                accion="INICIAR_PAGO_WEBPAY",
                descripcion=f"Usuario {request.user.email} inició pago Webpay para pedido #{pedido_cliente.id}. Token Webpay: {token_val}",
                objeto_relacionado=pedido_cliente,
                request=request
            )            
            # Crear o actualizar un registro de Pago para este intento de transacción Webpay.
            # Esto permite que un pedido pueda tener varios intentos de pago.
            # Se busca un pago PENDIENTE para este pedido con método WEBPAY, si no existe, se crea.
            # Si existen múltiples pagos PENDIENTES para el mismo pedido con Webpay,
            # esta lógica podría necesitar ser más específica para seleccionar cuál actualizar.
            # Una opción es siempre crear uno nuevo y que el retorno lo busque por token.
            pago_obj, created = Pago.objects.update_or_create(
                pedido_cliente=pedido_cliente,
                estado_pago=EstadoPago.PENDIENTE, # Solo actualiza/crea si está pendiente
                metodo_pago=MetodoPago.WEBPAY,    # y es Webpay
                defaults={
                    'monto_pagado': amount, # Guardar el monto del intento
                    'token_webpay_transaccion': token_val,
                    'datos_adicionales_pasarela': {'buy_order': buy_order, 'session_id': session_id, 'return_url': return_url, 'token_ws_inicial': token_val}
                }
            )

            return Response({
                "token": token_val,
                "url_redirect": url_val
            }, status=status.HTTP_200_OK)

        except (ValueError, Exception) as e: # Capturar ValueError también
            # Loggear el error
            crear_registro_actividad(
                usuario=request.user,
                accion="ERROR_INICIAR_PAGO_WEBPAY",
                descripcion=f"Error al iniciar pago Webpay para pedido #{pedido_cliente.id if 'pedido_cliente' in locals() else pedido_id}. Error: {str(e)}",
                objeto_relacionado=pedido_cliente if 'pedido_cliente' in locals() else None,
                request=request
            )
            return Response(
                {"error": "Hubo un problema al intentar iniciar el pago. Por favor, inténtalo de nuevo más tarde.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class WebpayRetornoView(APIView):
    """
    Vista para manejar el retorno (callback) de Webpay Plus.
    Webpay redirige aquí al usuario después del intento de pago.
    Esta vista confirma la transacción con Webpay y actualiza el estado del pedido y del pago.
    """
    permission_classes = [permissions.AllowAny] # Webpay redirige aquí, el usuario puede no estar logueado en esta sesión exacta.
                                                # La validación se hace con el token.

    def get(self, request, *args, **kwargs):
        # Webpay puede enviar el token como POST (TBK_TOKEN) o GET (token_ws)
        # Para Webpay Plus REST, usualmente es 'token_ws' en la query string si el flujo es estándar
        # o 'TBK_TOKEN' si el usuario cancela y vuelve desde el formulario de Webpay.
        token_ws = request.GET.get("token_ws")
        tbk_token_from_get = request.GET.get("TBK_TOKEN") # Para cancelaciones/timeouts vía GET

        # --- Manejar cancelación directa desde el formulario Webpay ---
        if tbk_token_from_get and not token_ws:
            # Si recibimos TBK_TOKEN en GET y no token_ws, el usuario canceló o hubo timeout.
            # No intentamos hacer commit. Redirigimos directamente a la página de fallo/cancelación.
            print(f"DEBUG WebpayRetorno (GET): Recepción de TBK_TOKEN ({tbk_token_from_get}). Asumiendo cancelación/timeout por usuario.")
            frontend_cancel_url = f"{settings.FRONTEND_URL}/pago-fallido?error_message=TransaccionCanceladaPorUsuario"
            
            tbk_orden_compra = request.GET.get("TBK_ORDEN_COMPRA")
            if tbk_orden_compra:
                frontend_cancel_url += f"&pedido_id={tbk_orden_compra}"
                try:
                    pedido_cliente_cancelado = PedidoCliente.objects.get(id=tbk_orden_compra)
                    # Solo cambiar estado si estaba PENDIENTE, para no afectar pedidos ya procesados o fallidos por otras razones.
                    if pedido_cliente_cancelado.estado == EstadoPedidoCliente.PENDIENTE:
                        pedido_cliente_cancelado.estado = EstadoPedidoCliente.CANCELADO # O FALLIDO
                        pedido_cliente_cancelado.save(update_fields=['estado'])
                        crear_registro_actividad(
                            usuario=pedido_cliente_cancelado.cliente.usuario if pedido_cliente_cancelado.cliente and hasattr(pedido_cliente_cancelado.cliente, 'usuario') else None,
                            accion="PAGO_WEBPAY_CANCELADO_USUARIO",
                            descripcion=f"Usuario canceló/timeout pago Webpay en formulario para pedido #{tbk_orden_compra}. TBK_TOKEN: {tbk_token_from_get}",
                            objeto_relacionado=pedido_cliente_cancelado,
                            request=request
                        )
                except PedidoCliente.DoesNotExist:
                    print(f"DEBUG WebpayRetorno (GET): Pedido con ID (TBK_ORDEN_COMPRA) {tbk_orden_compra} no encontrado al procesar cancelación/timeout.")
                except Exception as e_cancel_save:
                    print(f"DEBUG WebpayRetorno (GET): Error al actualizar estado del pedido {tbk_orden_compra} a cancelado/fallido: {str(e_cancel_save)}")
            
            return redirect(frontend_cancel_url)

        # Para el flujo normal de commit, el token es token_ws
        token_to_commit = token_ws

        if not token_to_commit:
            # Idealmente, redirigir a una página de error en el frontend
            # Esto se alcanza si no hay token_ws y tampoco se manejó un tbk_token_from_get (es decir, una URL mal formada)
            print("DEBUG WebpayRetorno (GET): No se recibió token_ws para commit ni TBK_TOKEN para cancelación.")
            return Response({"error": "Token de Webpay no válido o ausente para la operación."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Corregir inicialización de WebpayOptions
            current_integration_type = IntegrationType.TEST if settings.DEBUG else IntegrationType.LIVE
            options = WebpayOptions(settings.WEBPAY_COMMERCE_CODE, settings.WEBPAY_API_KEY_SECRET, current_integration_type)
            
            tx = WebpayPlusTransaction(options)
            response_transbank = tx.commit(token_to_commit) # Usar el token_ws para el commit
            print(f"DEBUG WebpayRetorno: Respuesta de tx.commit(): {response_transbank}")
            buy_order = response_transbank.get('buy_order') # Acceso como dict
            pedido_cliente = get_object_or_404(PedidoCliente, id=buy_order)

            payment_type_code = response_transbank.get('payment_type_code') # Acceso como dict
            tipo_cuotas_pago = TipoCuota.SIN_CUOTAS # Default
            if payment_type_code:
                if payment_type_code in ['VC', 'VN', 'VD']: # Venta en cuotas, Venta Normal (Débito), Venta Débito
                    # VN y VD no son cuotas estrictamente, pero payment_type_code lo indica.
                    # Si es VN o VD, installments_number será 0.
                    if response_transbank.get('installments_number', 0) > 0 : # Acceso como dict con default
                         tipo_cuotas_pago = TipoCuota.CUOTAS_NORMALES # O CUOTAS_CON_INTERES si puedes diferenciarlo
                    else: # Para VN, VD
                        tipo_cuotas_pago = TipoCuota.SIN_CUOTAS
                elif payment_type_code in ['SI', 'S2', 'SC']: # Cuotas sin interés
                    tipo_cuotas_pago = TipoCuota.CUOTAS_SIN_INTERES
                # Añadir más mapeos según la documentación de Transbank para otros payment_type_code
                # como CI (Cuotas con Interés), CF (Cuotas con Interés Fijo), etc.

            # Determinar si la transacción fue aprobada
            is_approved = response_transbank.get('status') == 'AUTHORIZED' and response_transbank.get('response_code') == 0

            with transaction.atomic():
                # Crear o actualizar el registro de Pago
                pago, created = Pago.objects.update_or_create(
                    # Buscar el pago por el token de transacción que se usó para el commit
                    # O si el buy_order es suficiente y único para el intento de pago.
                    # Aquí asumimos que el token es la clave para encontrar el intento de pago correcto.
                    token_webpay_transaccion=token_to_commit, # El token que Webpay nos devolvió y con el que hicimos commit
                    defaults={
                        'pedido_cliente': pedido_cliente, # Asegurar que esté asociado
                        'monto_pagado': response_transbank.get('amount'), # Acceso como dict
                        'metodo_pago': MetodoPago.WEBPAY,
                        'estado_pago': EstadoPago.COMPLETADO if is_approved else EstadoPago.FALLIDO,
                        'id_transaccion_pasarela': response_transbank.get('authorization_code') if is_approved else None, # Acceso como dict
                        'tipo_cuotas': tipo_cuotas_pago if is_approved else None,
                        'numero_cuotas': response_transbank.get('installments_number') if is_approved else None, # Acceso como dict
                        'datos_adicionales_pasarela': response_transbank, # Ya es un dict
                    }
                )

                # Registrar actividad de pago
                accion_bitacora = "PAGO_WEBPAY_COMPLETADO" if is_approved else "PAGO_WEBPAY_FALLIDO"
                descripcion_bitacora = (
                    f"Pago Webpay completado para pedido #{buy_order}. AuthCode: {response_transbank.get('authorization_code')}. Monto: {response_transbank.get('amount')}."
                    if is_approved
                    else f"Pago Webpay fallido/rechazado para pedido #{buy_order}. ResponseCode: {response_transbank.get('response_code')}. Token: {token_to_commit}."
                )
                crear_registro_actividad(
                    usuario=pedido_cliente.cliente.usuario if pedido_cliente and pedido_cliente.cliente else None, # Usuario asociado al pedido
                    accion=accion_bitacora,
                    descripcion=descripcion_bitacora,
                    objeto_relacionado=pago, # Registrar sobre el objeto Pago
                    request=request
                )

                if is_approved:
                    pedido_cliente.estado = EstadoPedidoCliente.PAGADO
                    # Guardar el estado PAGADO primero
                    pedido_cliente.save(update_fields=['estado']) 
                    
                    # Intentar modificar el stock
                    try:
                        # El usuario para el traspaso podría ser el cliente o None si es un proceso de sistema
                        usuario_para_traspaso = pedido_cliente.cliente.usuario if pedido_cliente.cliente and hasattr(pedido_cliente.cliente, 'usuario') else None
                        stock_ok = modificar_stock_para_pedido(pedido_cliente, anular_reduccion=False, usuario_solicitante_traspaso=usuario_para_traspaso)
                        if not stock_ok:
                            # Si el stock no está OK (ej. requiere traspaso), el pedido cambia de estado
                            pedido_cliente.estado = EstadoPedidoCliente.PENDIENTE_REABASTECIMIENTO
                            pedido_cliente.save(update_fields=['estado'])
                            # Considerar notificar o cambiar la URL de redirección
                    except (DRFValidationError, ValueError) as e_stock: # Capturar ValueError también
                        # El pedido se marcó como PAGADO, pero falló la modificación de stock.
                        error_detail_msg = str(e_stock)
                        if isinstance(e_stock, DRFValidationError) and hasattr(e_stock, 'detail'):
                            error_detail_msg = str(e_stock.detail)
                        
                        print(f"ERROR CRÍTICO (WebpayRetornoView): Pedido {pedido_cliente.id} PAGADO pero falló la modificación de stock: {error_detail_msg}")
                        pedido_cliente.notas_internas = (pedido_cliente.notas_internas or "") + f"\nError al modificar stock tras pago Webpay: {error_detail_msg}"
                        pedido_cliente.estado = EstadoPedidoCliente.RECHAZADO_STOCK # O un estado de error específico
                        pedido_cliente.save(update_fields=['notas_internas', 'estado'])
                        
                        # Registrar actividad de error de stock post-pago
                        crear_registro_actividad(usuario=pedido_cliente.cliente.usuario if pedido_cliente.cliente and hasattr(pedido_cliente.cliente, 'usuario') else None, accion="ERROR_STOCK_POST_PAGO", descripcion=f"Pedido {pedido_cliente.id} pagado, pero error al modificar stock: {error_detail_msg}", objeto_relacionado=pedido_cliente, request=request)

                        # Considerar cómo manejar esto con el cliente. ¿Reembolso automático? ¿Notificación?
                        frontend_failure_url = f"{settings.FRONTEND_URL}/pago-fallido?pedido_id={pedido_cliente.id}&error_code=StockPostPagoFail"
                        return redirect(frontend_failure_url)
                    
                    frontend_success_url = f"{settings.FRONTEND_URL}/pedido-confirmado/{pedido_cliente.id}" # Cambiado a la ruta de confirmación de pedido
                    print(f"DEBUG WebpayRetorno: Pago aprobado. Redirigiendo a: {frontend_success_url}")
                    return redirect(frontend_success_url)
                else:
                    pedido_cliente.estado = EstadoPedidoCliente.FALLIDO # O PENDIENTE si se permite reintento
                    pedido_cliente.save(update_fields=['estado'])
                    # Redirigir a una página de fallo en el frontend
                    frontend_failure_url = f"{settings.FRONTEND_URL}/pago-fallido?pedido_id={pedido_cliente.id}&error_message=TransaccionRechazada"
                    print(f"DEBUG WebpayRetorno: Pago fallido/rechazado. Redirigiendo a: {frontend_failure_url}")
                    return redirect(frontend_failure_url)

        except Exception as e:
            import traceback
            tb_str = traceback.format_exc()
            # Intentar obtener el pedido si es posible, para el log
            print(f"DEBUG WebpayRetorno: Excepción durante el commit o procesamiento: {str(e)}\n{tb_str}")
            buy_order_val_error = response_transbank.get('buy_order') if 'response_transbank' in locals() and isinstance(response_transbank, dict) else "Desconocido"
            pedido_obj_error = None
            if buy_order_val_error != "Desconocido": # Verificar si buy_order_val_error fue definido
                try:
                    pedido_obj_error = PedidoCliente.objects.get(id=buy_order_val_error)
                except PedidoCliente.DoesNotExist:
                    pass # No hacer nada si el pedido no se encuentra
            crear_registro_actividad(
                usuario=None, # Difícil saber el usuario aquí si todo falla antes de obtener el pedido
                accion="ERROR_CONFIRMAR_PAGO_WEBPAY",
                descripcion=f"Error al confirmar pago Webpay. Token: {token_to_commit if token_to_commit else (tbk_token_from_get if tbk_token_from_get else 'No disponible')}. Error: {str(e)}",
                objeto_relacionado=pedido_obj_error,
                request=request
            )
            frontend_error_url = f"{settings.FRONTEND_URL}/pago-fallido?error_message=ErrorInternoConfirmacion"
            if pedido_obj_error:
                frontend_error_url += f"&pedido_id={pedido_obj_error.id}"
            print(f"DEBUG WebpayRetorno: Error general. Redirigiendo a: {frontend_error_url}")
            return redirect(frontend_error_url)