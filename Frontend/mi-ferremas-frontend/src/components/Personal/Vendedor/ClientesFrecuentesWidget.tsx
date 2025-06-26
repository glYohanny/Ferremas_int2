import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

// Interfaz para los datos del cliente que recibimos de la API
interface ClienteFrecuente {
  id: number;
  nombre_completo: string;
  email: string;
  rut: string;
  num_telefono: string;
  total_pedidos: number;
}

const ClientesFrecuentesWidget: React.FC = () => {
  const [clientes, setClientes] = useState<ClienteFrecuente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientesFrecuentes = async () => {
      try {
        const response = await api.get('/usuarios/vendedor/clientes-frecuentes/');
        setClientes(response.data);
      } catch (err) {
        setError('No se pudieron cargar los clientes frecuentes.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchClientesFrecuentes();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">🧍‍♂️ Clientes Frecuentes</h2>
      {loading && <p>Cargando clientes...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && (
        <ul className="space-y-3">
          {clientes.length === 0 ? (
            <p className="text-center text-gray-500">No hay clientes frecuentes por el momento.</p>
          ) : (
            clientes.map((cliente) => (
              <li key={cliente.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                <div>
                  <p className="font-semibold text-gray-800">{cliente.nombre_completo}</p>
                  <p className="text-sm text-gray-500">{cliente.total_pedidos} pedidos completados</p>
                </div>
                <button className="bg-green-500 text-white text-sm font-bold py-1 px-3 rounded-md hover:bg-green-600 transition-colors">
                  + Nuevo Pedido
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default ClientesFrecuentesWidget;