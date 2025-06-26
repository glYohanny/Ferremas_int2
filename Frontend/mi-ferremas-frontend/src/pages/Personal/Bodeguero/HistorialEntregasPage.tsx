import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../../services/api';

// Re-using a simplified interface. You might want a more detailed one.
interface EntregaHistorialItem {
  id: number;
  cliente_detalle?: { usuario?: { email?: string, first_name?: string, last_name?: string }};
  estado_display: string;
  fecha_entregado?: string;
  total_pedido: string;
}

const HistorialEntregasPage: React.FC = () => {
  const [entregas, setEntregas] = useState<EntregaHistorialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEntregas = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<{results: EntregaHistorialItem[]}>('/pedidos/historial-entregas/');
        setEntregas(response.data.results || response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Error al cargar el historial de entregas.');
      } finally {
        setLoading(false);
      }
    };
    fetchEntregas();
  }, []);

  const getClienteNombre = (entrega: EntregaHistorialItem) => {
    if (entrega.cliente_detalle?.usuario) {
      const { first_name, last_name, email } = entrega.cliente_detalle.usuario;
      if (first_name && last_name) return `${first_name} ${last_name}`;
      if (email) return email;
    }
    return 'Cliente Desconocido';
  }

  return (
    <>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">📦 Historial de Entregas</h1>
        
        {loading && <p>Cargando historial...</p>}
        {error && <p className="text-red-500">{error}</p>}
        
        {!loading && !error && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de Entrega</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entregas.map((entrega) => (
                  <tr key={entrega.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <Link to={`/pedido/${entrega.id}`} className="text-blue-600 hover:underline">
                        #{entrega.id}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getClienteNombre(entrega)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entrega.fecha_entregado ? new Date(entrega.fecha_entregado).toLocaleString() : 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${Number(entrega.total_pedido).toLocaleString('es-CL')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">{entrega.estado_display}</td>
                  </tr>
                ))}
                {entregas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No hay entregas registradas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default HistorialEntregasPage;