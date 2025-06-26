import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../../services/api'; // Tu cliente API
import { useCart } from '../../contexts/CartContext'; // Importa el hook del carrito

// Define una interfaz para los detalles del pedido que esperas del backend
interface PedidoDetalle {
  id: number;
  estado_display: string;
  total_pedido: string;
  metodo_envio_display: string;
  // Añade más campos si los necesitas, ej. items, dirección, etc.
  // Por ejemplo, si el backend envía el método de pago:
  // metodo_pago_display?: string; 
}

const OrderConfirmationPage: React.FC = () => {
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const [pedido, setPedido] = useState<PedidoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { clearCart } = useCart(); // Obtén la función para vaciar el carrito

  useEffect(() => {
    let isMounted = true; // Flag para verificar si el componente está montado

    if (pedidoId) {
      // Vaciar el carrito tan pronto como tengamos un pedidoId y el componente esté montado.
      // Esto se ejecutará solo si pedidoId cambia o clearCart cambia (que ahora es estable).
      console.log('OrderConfirmationPage: Vaciando carrito para pedido ID:', pedidoId);
      clearCart();

      const fetchPedido = async () => {
        try {
          if (isMounted) setLoading(true);
          // Asume que tienes un endpoint para obtener detalles de un pedido por ID
          // Ajusta la URL según tu API de pedidos
          const response = await apiClient.get<PedidoDetalle>(`/pedidos/pedidos-cliente/${pedidoId}/`);
          if (isMounted) {
            setPedido(response.data);
            setError(null);
          }
        } catch (err) {
          console.error("Error fetching order details:", err);
          if (isMounted) {
            setError("No se pudieron cargar los detalles del pedido.");
            setPedido(null);
          }
        } finally {
          if (isMounted) setLoading(false);
        }
      };
      fetchPedido();
    }
    return () => {
      isMounted = false; // Limpieza al desmontar para evitar actualizaciones de estado
    };
  }, [pedidoId, clearCart]); // Añade clearCart a las dependencias

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Cargando confirmación del pedido...</div>;
  }

  return (
    <div className="container mx-auto p-4 text-center min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-green-600 mb-4">¡Pedido Confirmado!</h1>
      <p className="text-xl text-gray-800 mb-6">Tu pedido ha sido recibido y está siendo procesado.</p>
      
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {pedido && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6 w-full max-w-md">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Resumen del Pedido</h2>
          <p className="text-lg text-gray-700">Número de Pedido: <strong>#{pedido.id}</strong></p>
          <p className="text-lg text-gray-700">Estado: <strong>{pedido.estado_display}</strong></p>
          <p className="text-lg text-gray-700">Total: <strong>${parseFloat(pedido.total_pedido).toLocaleString('es-CL')}</strong></p>
          <p className="text-lg text-gray-700">Método de Envío: <strong>{pedido.metodo_envio_display}</strong></p>
          {/* Aquí podrías añadir instrucciones de pago si el método es Transferencia */}
        </div>
      )}
      <Link to="/mis-pedidos" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 mb-2">Ver Mis Pedidos</Link>
      <Link to="/" className="text-blue-600 hover:underline">Volver al Inicio</Link>
    </div>
  );
};

export default OrderConfirmationPage;