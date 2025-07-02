import React, { useState, useEffect } from 'react';
import api from '../../../services/api'; // Asumimos que tienes un servicio api configurado
import { useNavigate } from 'react-router-dom'; // Importamos useNavigate
import { Pedido } from '../../../types/pedido';
import { getStatusColor } from '../../../utils/pedidoUtils';
import ContactModal, { Contactable } from '../../contacto/ContactModal';

const PedidosActivosWidget: React.FC = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState(''); // Estado para el filtro local
  const [showContactModal, setShowContactModal] = useState(false); // Estado para controlar la visibilidad del modal
  const [contactTarget, setContactTarget] = useState<Contactable | null>(null); // Cliente seleccionado para contactar
  const navigate = useNavigate(); // Inicializamos el hook de navegación

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        // Asegúrate de que el backend devuelva cliente_email y cliente_telefono
        const response = await api.get<any>('/pedidos/vendedor/pedidos-activos/'); // Asume que la respuesta es paginada
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

  const handleContactClient = (pedido: Pedido) => {
    setContactTarget({
      nombre: pedido.cliente_nombre,
      email: pedido.cliente_email,
      telefono: pedido.cliente_telefono,
    });
    setShowContactModal(true);
  };

  const handlePrintOrder = (pedido: Pedido) => {
    // Navega a la página de detalles del pedido, y pasa un parámetro para indicar que se debe imprimir
    navigate(`/pedido/${pedido.id}?print=true`);
  };

  // Filtramos los pedidos localmente basándonos en el texto del filtro
  const pedidosFiltrados = pedidos.filter(pedido =>
    `PED-${pedido.id.toString().padStart(3, '0')}`.toLowerCase().includes(filtro.toLowerCase()) ||
    pedido.cliente_nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    pedido.estado.replace(/_/g, ' ').toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">📦 Pedidos Activos</h2>
      {loading && <p>Cargando pedidos...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && (
        <>
          <div className="mb-4">
            <input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Filtrar por N° Pedido, cliente o estado..."
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
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
              {pedidos.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-500">No hay pedidos activos.</td>
                </tr>
              )}
              {pedidos.length > 0 && pedidosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-500">No se encontraron pedidos que coincidan con el filtro.</td>
                </tr>
              )}
              {pedidosFiltrados.map((pedido) => (
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
                        <button
                          className="text-blue-500 hover:text-blue-700"
                          title="Ver Detalles"
                          onClick={() => navigate(`/pedido/${pedido.id}`)} // Navega a la página de detalles del pedido
                        >
                          👁️</button>
                        <button
                          className="text-green-500 hover:text-green-700"
                          title="Contactar Cliente"
                          onClick={() => handleContactClient(pedido)}
                        >
                          💬</button>
                        <button
                          className="text-gray-500 hover:text-gray-700"
                          title="Imprimir Orden"
                          onClick={() => handlePrintOrder(pedido)}
                        >
                          🖨️</button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
          </div>
        </>
      )}

      {/* Modal de Contacto del Cliente (replicado de BuscadorPedidos.tsx) */}
      <ContactModal contactInfo={contactTarget} onClose={() => setShowContactModal(false)} />
    </div>
  );
};

export default PedidosActivosWidget;