import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useNavigate } from 'react-router-dom'; // Importamos useNavigate
import ContactModal, { Contactable } from '../../contacto/ContactModal'; // Importamos el modal genérico
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
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactTarget, setContactTarget] = useState<Contactable | null>(null);
  const navigate = useNavigate(); // Inicializamos el hook de navegación

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

  const handleNewOrder = (clientId: number) => {
    navigate(`/personal/vendedor/crear-pedido/${clientId}`);
  };

  const handleContactClient = (cliente: ClienteFrecuente) => {
    setContactTarget({
      nombre: cliente.nombre_completo,
      email: cliente.email,
      telefono: cliente.num_telefono,
    });
    setShowContactModal(true);
  };

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
              <li key={cliente.id} className="flex justify-between items-start p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                <div>
                  <p className="font-semibold text-gray-800">{cliente.nombre_completo}</p>
                  <p className="text-sm text-gray-500">{cliente.rut}</p>
                  <div className="text-xs text-gray-600 mt-2 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                      <span>{cliente.email}</span>
                    </p>
                    {cliente.num_telefono && (
                      <p className="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.518.759a1.037 1.037 0 00-.841 1.836l3.874 3.874a1.037 1.037 0 001.836-.841l.759-1.518a1 1 0 011.06-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
                        <span>{cliente.num_telefono}</span>
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{cliente.total_pedidos} pedidos completados</p>
                </div>
                <div className="flex flex-col items-end space-y-2 flex-shrink-0 ml-4">
                  <button
                    onClick={() => handleNewOrder(cliente.id)}
                    className="bg-green-500 text-white text-sm font-bold py-1 px-3 rounded-md hover:bg-green-600 transition-colors w-full text-center"
                  >
                    + Pedido
                  </button>
                  <button
                    onClick={() => handleContactClient(cliente)}
                    className="bg-blue-500 text-white text-sm font-bold py-1 px-3 rounded-md hover:bg-blue-600 transition-colors w-full text-center"
                  >
                    Contactar
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
      <ContactModal contactInfo={contactTarget} onClose={() => setShowContactModal(false)} />
    </div>
  );
};

export default ClientesFrecuentesWidget;