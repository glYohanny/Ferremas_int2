import React, { useState } from 'react';
import api from '../../../services/api'; // Importamos el servicio API
import { useNavigate } from 'react-router-dom'; // Importamos useNavigate

// Definimos una interfaz para el tipo de dato de un pedido
// Reutilizamos la misma interfaz que en PedidosActivosWidget.tsx
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
    case 'ENTREGADO':
      return 'bg-green-200 text-green-800';
    case 'CANCELADO':
      return 'bg-red-200 text-red-800';
    // Añadir otros estados si es necesario
    default:
      return 'bg-gray-200 text-gray-800';
  }
};

const BuscadorPedidos: React.FC = () => {
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [pedidosResultados, setPedidosResultados] = useState<Pedido[]>([]);
  const [loadingResultados, setLoadingResultados] = useState(false);
  const [errorResultados, setErrorResultados] = useState<string | null>(null);
  const [currentSearchTerm, setCurrentSearchTerm] = useState(''); // Para mostrar el término de la última búsqueda
  const [busquedaRealizada, setBusquedaRealizada] = useState(false); // Para saber si ya se buscó algo
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
                    <tbody>
                      {pedidosResultados.map((pedido) => (
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
                              <button className="text-green-500 hover:text-green-700" title="Contactar Cliente">💬</button>
                              <button className="text-gray-500 hover:text-gray-700" title="Imprimir Orden">🖨️</button>
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
    </div>
  );
};

export default BuscadorPedidos;