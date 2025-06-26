import React, { useState, useEffect } from 'react';
import apiClient from '../../../services/api'; // Importamos el cliente de API

// Definimos la interfaz para un pago
interface Pago {
  id: number;
  cliente_nombre: string;
  monto: number; // Cambiado de monto_total a monto
  fecha_pago: string; // Cambiado de fecha_pedido a fecha_pago
  pedido_id: number; // ID del pedido asociado a la cuenta por cobrar
  comprobante_adjunto: string | null; // URL del comprobante
}

const PagosPorConfirmar: React.FC = () => {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // useEffect para cargar los datos cuando el componente se monta
  useEffect(() => {
    const fetchPagos = async () => {
      try {
        setLoading(true);
        setError(null);
        // Ruta de la API para obtener pagos por confirmar en finanzas
        const response = await apiClient.get<{ results: Pago[] }>('/finanzas/pagos-recibidos/por-confirmar/');
        setPagos(response.data.results || []);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Error al cargar los pagos pendientes.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPagos();
  }, []);

  const handleAction = async (pagoId: number, action: 'confirmar' | 'rechazar') => {
    try {
      // Rutas para confirmar/rechazar pagos en finanzas
      await apiClient.post(`/finanzas/pagos-recibidos/${pagoId}/${action}_pago/`);
      // Si la acción es exitosa, removemos el pago de la lista local
      setPagos(pagos.filter(p => p.id !== pagoId));
    } catch (err: any) {
      alert(`Error al ${action} el pago: ${err.response?.data?.detail || 'Error desconocido'}`);
      console.error(err);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-700">🧾 Pagos por Confirmar</h2>
      
      {loading && <p className="text-center text-gray-500">Cargando pagos...</p>}
      {error && <p className="text-center text-red-500">{error}</p>}

      {!loading && !error && (!pagos || pagos.length === 0) && (
        <p className="text-center text-gray-500">No hay pagos pendientes de confirmación.</p>
      )}

      {!loading && !error && pagos && pagos.length > 0 && (
        <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left py-2 px-4">N° Pedido</th>
              <th className="text-left py-2 px-4">Cliente</th>
              <th className="text-left py-2 px-4">Monto</th>
              <th className="text-left py-2 px-4">Fecha</th>
              <th className="text-center py-2 px-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((pago) => (
              <tr key={pago.id} className="border-b">
                <td className="py-2 px-4">{pago.pedido_id}</td>
                <td className="py-2 px-4">{pago.cliente_nombre}</td>
                <td className="py-2 px-4">${pago.monto.toLocaleString('es-CL')}</td> {/* Usar monto */}
                <td className="py-2 px-4">{new Date(pago.fecha_pago).toLocaleDateString()}</td> {/* Usar fecha_pago */}
                <td className="py-2 px-4 text-center">
                  {pago.comprobante_adjunto && (
                    <a href={pago.comprobante_adjunto} target="_blank" rel="noopener noreferrer" className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm mr-2 hover:bg-blue-600">
                      Ver Comprobante
                    </a>
                  )}
                  <button onClick={() => handleAction(pago.id, 'confirmar')} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm mr-2 hover:bg-green-600">
                    Confirmar
                  </button>
                  <button onClick={() => handleAction(pago.id, 'rechazar')} className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600">
                    Rechazar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
};

export default PagosPorConfirmar;