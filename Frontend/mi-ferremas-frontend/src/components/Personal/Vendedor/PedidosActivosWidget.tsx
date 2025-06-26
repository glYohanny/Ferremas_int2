import React, { useState, useEffect } from 'react';
import api from '../../../services/api'; // Asumimos que tienes un servicio api configurado

// Definimos una interfaz para el tipo de dato de un pedido
interface Pedido {
  id: number;
  cliente_nombre: string;
  estado: string;
  total_pedido: number;
  fecha_pedido: string;
}

const getStatusColor = (estado: string) => {
  switch (estado) {
    case 'POR_CONFIRMAR':
      return 'bg-yellow-200 text-yellow-800';
    case 'PREPARADO':
      return 'bg-blue-200 text-blue-800';
    case 'EN_ESPERA_DE_PAGO':
      return 'bg-orange-200 text-orange-800';
    default:
      return 'bg-gray-200 text-gray-800';
  }
};

const PedidosActivosWidget: React.FC = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const response = await api.get('/pedidos/vendedor/pedidos-activos/'); // Asume que la respuesta es paginada
        setPedidos(response.data.results); // Accede a la propiedad 'results'
      } catch (err) {
        setError('No se pudieron cargar los pedidos.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">📦 Pedidos Activos</h2>
      {loading && <p>Cargando pedidos...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="py-2 px-3">N° Pedido</th>
                <th className="py-2 px-3">Cliente</th>
                <th className="py-2 px-3">Estado</th>
                <th className="py-2 px-3 text-right">Total</th>
                <th className="py-2 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-500">No hay pedidos activos.</td>
                </tr>
              ) : (
                pedidos.map((pedido) => (
                  <tr key={pedido.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium text-blue-600">PED-{pedido.id.toString().padStart(3, '0')}</td>
                    <td className="py-3 px-3">{pedido.cliente_nombre}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(pedido.estado)}`}>
                        {pedido.estado.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono">${pedido.total_pedido.toLocaleString('es-CL')}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-2">
                        <button className="text-blue-500 hover:text-blue-700" title="Ver Detalles">👁️</button>
                        <button className="text-green-500 hover:text-green-700" title="Contactar Cliente">💬</button>
                        <button className="text-gray-500 hover:text-gray-700" title="Imprimir Orden">🖨️</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PedidosActivosWidget;