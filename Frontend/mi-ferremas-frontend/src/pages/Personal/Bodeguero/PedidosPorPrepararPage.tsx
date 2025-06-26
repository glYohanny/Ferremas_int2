import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../../services/api';

// Re-using the interface from the dashboard. Ideally, this would be in a shared types file.
interface PedidoAPreparar {
  id: number;
  cliente: string;
  cliente_detalle?: { usuario?: { email?: string, first_name?: string, last_name?: string }};
  estado_display: string;
  estado_preparacion: string;
  estado_preparacion_display: string;
  fecha_pedido: string;
  bodeguero_asignado_detalle?: { email?: string } | null;
}

const PedidosPorPrepararPage: React.FC = () => {
  const [pedidos, setPedidos] = useState<PedidoAPreparar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPedidos = async () => {
    setLoading(true);
    setError(null);
    try {
      // This endpoint should already be filtered by the backend for the logged-in bodeguero
      const response = await apiClient.get<PedidoAPreparar[]>('/pedidos/pedidos-cliente/');
      setPedidos(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar los pedidos por preparar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
  }, []);

  const handleTomarPedido = async (pedidoId: number) => {
    try {
      await apiClient.post(`/pedidos/pedidos-cliente/${pedidoId}/tomar_pedido_preparacion/`);
      fetchPedidos(); // Recargar la lista
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.detail || "Error al tomar el pedido.");
    }
  };

  const handleConfirmarPreparacion = async (pedidoId: number) => {
     try {
      await apiClient.post(`/pedidos/pedidos-cliente/${pedidoId}/confirmar_preparacion_pedido/`);
      fetchPedidos(); // Recargar la lista
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.detail || "Error al confirmar preparación.");
    }
  };

  // Helper functions copied from dashboard.
  const getClienteNombre = (pedido: PedidoAPreparar) => {
    if (pedido.cliente_detalle?.usuario) {
      const { first_name, last_name, email } = pedido.cliente_detalle.usuario;
      if (first_name && last_name) return `${first_name} ${last_name}`;
      if (email) return email;
    }
    return `Cliente ID: ${pedido.cliente}` || 'Cliente Desconocido';
  };

  const getEstadoPreparacionColor = (estadoPrep: string) => {
    if (estadoPrep === 'PENDIENTE_ASIGNACION') return 'text-gray-600';
    if (estadoPrep === 'ASIGNADO' || estadoPrep === 'EN_PREPARACION') return 'text-blue-600';
    if (estadoPrep === 'LISTO_PARA_ENTREGA') return 'text-green-600';
    return 'text-gray-500';
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">🚚 Pedidos por Preparar</h1>
        <Link to="/personal/bodeguero/dashboard" className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm">
          &larr; Volver al Dashboard
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        {loading && <p>Cargando pedidos...</p>}
        {error && <p className="text-red-500">{error}</p>}
        
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Pedido</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado Preparación</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignado a</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pedidos.map((pedido) => (
                  <tr key={pedido.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <Link to={`/pedido/${pedido.id}`} className="text-blue-600 hover:underline">
                        #{pedido.id}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getClienteNombre(pedido)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(pedido.fecha_pedido).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                      <span className={getEstadoPreparacionColor(pedido.estado_preparacion)}>
                        {pedido.estado_preparacion_display}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pedido.bodeguero_asignado_detalle?.email || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {pedido.estado_preparacion === 'PENDIENTE_ASIGNACION' && (
                        <button onClick={() => handleTomarPedido(pedido.id)} className="bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded text-xs">
                          Tomar
                        </button>
                      )}
                      {(pedido.estado_preparacion === 'ASIGNADO' || pedido.estado_preparacion === 'EN_PREPARACION') && pedido.bodeguero_asignado_detalle && (
                        <button onClick={() => handleConfirmarPreparacion(pedido.id)} className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-xs">
                          Confirmar Prep.
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {pedidos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No hay pedidos por preparar.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PedidosPorPrepararPage;