// src/pages/PagoFallidoPage.tsx
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const PagoFallidoPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pedidoId, setPedidoId] = useState<string | null>(null);

  useEffect(() => {
    const errorMsg = searchParams.get('error_message');
    const pId = searchParams.get('pedido_id');
    const errorCode = searchParams.get('error_code'); // Para errores más específicos

    if (errorCode === 'StockPostPagoFail') {
      setErrorMessage(
        'Tu pago fue procesado, pero hubo un problema al confirmar el stock de tu pedido. ' +
        'Por favor, contacta a soporte con tu número de pedido para asistencia.'
      );
    } else if (errorMsg === 'TransaccionCanceladaPorUsuario') {
      setErrorMessage('La transacción fue cancelada por el usuario.');
    } else if (errorMsg === 'TransaccionRechazada') {
      setErrorMessage('La transacción fue rechazada por el procesador de pagos.');
    } else if (errorMsg === 'ErrorInternoConfirmacion') {
      setErrorMessage(
        'Ocurrió un error interno al intentar confirmar tu pago. ' +
        'Si el problema persiste, por favor contacta a soporte.'
      );
    } else {
      setErrorMessage(errorMsg || 'Ocurrió un error desconocido durante el proceso de pago.');
    }

    if (pId) {
      setPedidoId(pId);
    }
  }, [searchParams]);

  return (
    <div className="container mx-auto p-4 text-center min-h-screen flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <svg
          className="w-16 h-16 text-red-500 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <h1 className="text-3xl font-bold text-red-600 mb-4">¡Pago Fallido!</h1>
        <p className="text-gray-700 mb-2">
          {errorMessage || 'Lo sentimos, no pudimos procesar tu pago en este momento.'}
        </p>
        {pedidoId && (
          <p className="text-gray-600 mb-6">
            Número de Pedido de Referencia: <strong>#{pedidoId}</strong>
          </p>
        )}
        <p className="text-gray-600 mb-6">
          Por favor, intenta nuevamente o contacta a nuestro equipo de soporte si el problema persiste.
        </p>
        <div className="space-y-4">
          <Link
            to="/checkout" // O a la página del carrito
            className="w-full block px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Intentar Pagar de Nuevo
          </Link>
          <Link
            to="/"
            className="w-full block px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
          >
            Volver a la Página Principal
          </Link>
          {/* Podrías añadir un enlace a una página de contacto/soporte */}
        </div>
      </div>
    </div>
  );
};

export default PagoFallidoPage;
