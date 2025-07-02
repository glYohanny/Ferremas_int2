import React, { useState } from 'react';
import api from '../../../services/api'; // Importamos el servicio API
import { useNavigate } from 'react-router-dom'; // Importamos useNavigate
import { Pedido } from '../../../types/pedido';
import { getStatusColor } from '../../../utils/pedidoUtils';
import ContactModal, { Contactable } from '../../contacto/ContactModal';

const BuscadorPedidos: React.FC = () => {
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [pedidosResultados, setPedidosResultados] = useState<Pedido[]>([]);
  const [loadingResultados, setLoadingResultados] = useState(false);
  const [errorResultados, setErrorResultados] = useState<string | null>(null);
  const [currentSearchTerm, setCurrentSearchTerm] = useState(''); // Para mostrar el término de la última búsqueda
  const [busquedaRealizada, setBusquedaRealizada] = useState(false); // Para saber si ya se buscó algo
  const [showContactModal, setShowContactModal] = useState(false); // Estado para controlar la visibilidad del modal
  const [contactTarget, setContactTarget] = useState<Contactable | null>(null); // Cliente seleccionado para contactar
  const navigate = useNavigate(); // Inicializamos el hook de navegación

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingResultados(true);
    setErrorResultados(null);
    setBusquedaRealizada(true); // Marcamos que se ha realizado una búsqueda
    setCurrentSearchTerm(terminoBusqueda); // Guardamos el término de búsqueda actual

    try {
      // Realizamos la llamada a la API con el término de búsqueda
      const response = await api.get('/pedidos/pedidos-cliente/', {
        params: { search: terminoBusqueda }
      });
      setPedidosResultados(response.data.results); // Accedemos a 'results' por la paginación
    } catch (err) {
      setErrorResultados('No se pudieron cargar los pedidos. Intente de nuevo.');
      console.error('Error al buscar pedidos:', err);
    } finally {
      setLoadingResultados(false);
    }
  };

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

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-3 text-gray-700">🔍 Buscar Pedido</h2>
      <form onSubmit={handleSearch} className="flex items-center gap-4">
        <input
          type="text"
          value={terminoBusqueda}
          onChange={(e) => setTerminoBusqueda(e.target.value)}
          placeholder="Buscar por cliente, N° de pedido, estado..."
          className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
        >
          Buscar
        </button>
      </form>

      {/* Sección de resultados de búsqueda */}
      {busquedaRealizada && (
        <div className="mt-6 p-4 border rounded-md bg-gray-50">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Resultados de la Búsqueda</h3>
          {loadingResultados && <p>Cargando resultados...</p>}
          {errorResultados && <p className="text-red-500">{errorResultados}</p>}
          {!loadingResultados && !errorResultados && (
            <>
            {pedidosResultados.length === 0 ? (
                <>
                  <p className="text-center text-gray-500">No se encontraron pedidos que coincidan con la búsqueda.</p>
                  <p className="text-center text-gray-400 text-sm">Término buscado: "{currentSearchTerm}"</p>
                </>
              ) : (
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
                      <tbody>                      {pedidosResultados.map((pedido) => (
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
                              >🖨️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal de Contacto del Cliente */}
      <ContactModal contactInfo={contactTarget} onClose={() => setShowContactModal(false)} />
    </div>
  );
};

export default BuscadorPedidos;