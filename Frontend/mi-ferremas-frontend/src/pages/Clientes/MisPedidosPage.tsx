import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/api'; // Tu cliente API
import { useAuth } from '../../contexts/AuthContext';

// Interfaz para un pedido en la lista (ajusta según tu PedidoClienteSerializer)
interface PedidoEnLista {
  id: number;
  fecha_pedido: string;
  estado: string;
  estado_display: string;
  total_pedido: number; // El serializer lo envía como número
  // Puedes añadir más campos si los necesitas para la vista de lista
}

// Interfaz para la respuesta paginada de la API
interface PaginatedPedidosResponse {
  results: PedidoEnLista[];
}

const MisPedidosPage: React.FC = () => {
  const [pedidos, setPedidos] = useState<PedidoEnLista[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      const fetchPedidos = async () => {
        try {
          setLoading(true);
          // Tu PedidoClienteViewSet ya debería filtrar por el cliente autenticado
          const response = await apiClient.get<PaginatedPedidosResponse>('/pedidos/pedidos-cliente/');
          setPedidos(response.data.results); // Corregido para acceder a la propiedad 'results'
          setError(null);
        } catch (err) {
          console.error("Error fetching orders:", err);
          setError("No se pudieron cargar tus pedidos.");
          setPedidos([]);
        } finally {
          setLoading(false);
        }
      };
      fetchPedidos();
    } else {
      // Opcional: redirigir al login si no está autenticado
      // O simplemente mostrar un mensaje
      setLoading(false);
      setError("Debes iniciar sesión para ver tus pedidos.");
    }
  }, [isAuthenticated]);

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Cargando tus pedidos...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Mis Pedidos</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      
      {!isAuthenticated && !loading && (
        <p>Por favor, <Link to="/login" className="text-blue-600 hover:underline">inicia sesión</Link> para ver tus pedidos.</p>
      )}

      {isAuthenticated && pedidos.length === 0 && !error && (
        <p>Aún no has realizado ningún pedido.</p>
      )}

      {isAuthenticated && pedidos.length > 0 && (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {pedidos.map((pedido) => (
              <li key={pedido.id} className="p-4 hover:bg-gray-50">
                <Link to={`/pedido/${pedido.id}`} className="block"> {/* Enlace a la nueva página de detalle */}
                  <div className="flex justify-between items-center">
                    <p className="text-lg font-semibold text-blue-600">Pedido #{pedido.id}</p>
                    <p className="text-sm text-gray-500">{new Date(pedido.fecha_pedido).toLocaleDateString('es-CL')}</p>
                  </div>
                  <p className="text-gray-700">Estado: <span className="font-medium">{pedido.estado_display}</span></p>
                  <p className="text-gray-700">Total: <span className="font-medium">${pedido.total_pedido.toLocaleString('es-CL')}</span></p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MisPedidosPage;