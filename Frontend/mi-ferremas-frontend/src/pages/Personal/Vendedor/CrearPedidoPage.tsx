import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart, CartItem } from '../../../contexts/CartContext'; // Importamos useCart y CartItem
import { useAuth } from '../../../contexts/AuthContext'; // Para obtener datos del vendedor
import apiClient from '../../../services/api'; // Para hacer la llamada al backend
import CatalogoProductosWidget from '../../../components/Personal/Vendedor/CatalogoProductosWidget'; // Importamos el catálogo

const CrearPedidoPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { items, totalPrice, totalItems, clearCart, removeItem, updateQuantity } = useCart(); // Obtenemos todo lo necesario del carrito
  const { user } = useAuth(); // Obtenemos el usuario actual (vendedor)

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Función para manejar la actualización de cantidad desde el carrito en esta página
  const handleUpdateQuantity = (item: CartItem, quantity: number) => {
    updateQuantity(item.id, quantity);
  };

  // Función para manejar la eliminación de un ítem desde el carrito en esta página
  const handleRemoveItem = (item: CartItem) => {
    removeItem(item.id);
  };

  useEffect(() => {
    // Al iniciar un nuevo pedido para un cliente, es buena práctica limpiar el carrito actual
    // para evitar que se mezclen productos de pedidos anteriores.
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Se ejecuta solo una vez al montar el componente para limpiar el carrito.

  const handleCreateOrder = async () => {
    if (!clientId) {
      alert('Error: No se ha seleccionado un cliente para el pedido.');
      return;
    }
    if (items.length === 0) {
      alert('El carrito está vacío. Añade productos antes de crear el pedido.');
      return;
    }

    // El vendedor debe tener una sucursal asignada para determinar de dónde se despacha el pedido.
    const sucursalDespachoId = user?.perfil_personal?.sucursal?.id;
    if (!sucursalDespachoId) {
      alert('Error: No tienes una sucursal asignada. No se puede crear el pedido.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const pedidoData = {
      cliente: parseInt(clientId),
      sucursal_despacho: sucursalDespachoId,
      metodo_envio: 'RETIRO_TIENDA', // Por defecto para pedidos creados por vendedor. Se puede cambiar más adelante.
      estado: 'POR_CONFIRMAR', // Estado inicial, el cliente deberá confirmar y pagar.
      // 'creado_por_personal' será asignado automáticamente por el backend a partir del usuario autenticado.
      detalles_pedido_cliente: items.map(item => ({
        producto: item.id,
        cantidad: item.quantity,
      })),
    };

    try {
      const response = await apiClient.post('/pedidos/pedidos-cliente/', pedidoData);
      alert('¡Pedido creado con éxito!');
      clearCart();
      // Navegar a la página de detalles del nuevo pedido
      navigate(`/pedido/${response.data.id}`);
    } catch (err: any) {
      console.error('Error al crear el pedido:', err);
      // Formatear el mensaje de error para que sea más legible
      const errorMessage = err.response?.data ? JSON.stringify(err.response.data, null, 2) : 'Ocurrió un error inesperado.';
      setError(`No se pudo crear el pedido: ${errorMessage}`);
      alert(`Error al crear el pedido:\n${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Crear Nuevo Pedido</h1>
      <p className="text-lg text-gray-700 mb-6">Iniciando pedido para el Cliente ID: <span className="font-semibold">{clientId}</span></p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna del Catálogo de Productos */}
        <div className="md:col-span-2">
          <CatalogoProductosWidget />
        </div>

        {/* Columna del Carrito del Pedido */}
        <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">🛒 Carrito del Pedido</h2>
          {items.length === 0 ? (
            <p className="text-center text-gray-500">El carrito está vacío. Añade productos desde el catálogo.</p>
          ) : (
            <>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {items.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex-grow">
                      <p className="font-semibold text-gray-800">{item.name}</p>
                      <p className="text-sm text-gray-600">${item.price.toLocaleString('es-CL')}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleUpdateQuantity(item, parseInt(e.target.value, 10) || 0)}
                        min="0"
                        className="w-16 px-2 py-1 border border-gray-300 rounded-md text-center text-sm"
                      />
                      <p className="text-gray-800 font-medium w-20 text-right">
                        ${(item.price * item.quantity).toLocaleString('es-CL')}
                      </p>
                      <button
                        onClick={() => handleRemoveItem(item)}
                        className="text-red-500 hover:text-red-700"
                        title="Eliminar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200 text-xl font-bold text-gray-900">
                <span>Total ({totalItems} items):</span>
                <span>${totalPrice.toLocaleString('es-CL')}</span>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={clearCart}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Vaciar Carrito
                </button>
                <button
                  onClick={handleCreateOrder}
                  disabled={items.length === 0 || isLoading}
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creando Pedido...' : 'Crear Pedido'}
                </button>
              </div>
            </>
          )}
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              <p className="font-bold">Error:</p>
              <pre className="text-xs whitespace-pre-wrap">{error}</pre>
            </div>
          )}
        </div>
      </div>
      <button onClick={() => navigate(-1)} className="mt-6 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors">Volver al Dashboard</button>
    </div>
  );
};

export default CrearPedidoPage;