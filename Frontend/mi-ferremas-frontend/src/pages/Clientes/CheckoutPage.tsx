import React, { useState, useEffect } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSucursal } from '../../contexts/SucursalContext'; // Importar para la lista de sucursales
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../../services/api'; // Para llamar al backend

// Interfaz para los métodos de pago que vendrán del backend
interface MetodoPago {
  id: number; // o string, según tu backend
  nombre: string;
  descripcion?: string;
}
// Interfaces para datos de ubicación
interface Region {
  id: number;
  nombre: string;
}
interface Comuna {
  id: number;
  nombre: string;
}

// Tipos para método de entrega (puedes ajustarlos según tu backend)
const DELIVERY_METHODS = [
  { id: 'DESPACHO_DOMICILIO', nombre: 'Despacho a Domicilio' },
  { id: 'RETIRO_TIENDA', nombre: 'Retiro en Tienda (No implementado completamente)' }, // Placeholder
] as const; // 'as const' para inferir tipos literales
type DeliveryMethodId = typeof DELIVERY_METHODS[number]['id'];


const CheckoutPage: React.FC = () => {
  const { items, totalPrice, totalItems, clearCart } = useCart();
  const { isAuthenticated, user } = useAuth(); // Asumimos que 'user' tiene datos del cliente si está logueado
  const navigate = useNavigate();
  const { sucursales, isLoadingSucursales, selectedSucursal } = useSucursal(); // Obtener sucursales del contexto

  // Estado para el formulario (simplificado por ahora)
  const [shippingInfo, setShippingInfo] = useState({
    nombreCompleto: '',
    direccion: '',
    // ciudad: '', // Campo eliminado
    telefono: '',
    email: '',
    regionId: '', // Nuevo
    comunaId: '', // Nuevo
  });
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<MetodoPago[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [regiones, setRegiones] = useState<Region[]>([]);
  const [comunas, setComunas] = useState<Comuna[]>([]);
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState<DeliveryMethodId>(DELIVERY_METHODS[0].id);
  const [selectedSucursalRetiro, setSelectedSucursalRetiro] = useState<string | null>(null);
 
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      // Opcional: redirigir al login si no está autenticado y el checkout lo requiere
      // navigate('/login?redirect=/checkout');
    }
    // Pre-llenar el formulario si el usuario está logueado y tenemos sus datos
    if (user) {
      setShippingInfo(prev => ({
        ...prev,
        nombreCompleto: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        email: user.email || '',
        // Aquí podrías pre-llenar más datos si los tienes en el perfil del usuario
        // direccion: user.profile?.direccion || '',
        // telefono: user.profile?.telefono || '',
      }));
    }

    // Cargar métodos de pago
    const fetchPaymentMethods = async () => {
      try {
        // Asume que tienes un endpoint para listar métodos de pago
        const response = await apiClient.get<MetodoPago[]>('/pagos/metodos-pago/');
        setPaymentMethods(response.data);
        if (response.data.length > 0) {
          setSelectedPaymentMethod(String(response.data[0].id)); // Selecciona el primero por defecto
        }
      } catch (err) {
        console.error("Error fetching payment methods:", err);
        setError("No se pudieron cargar los métodos de pago.");
      }
    };
    fetchPaymentMethods();
 // Cargar regiones
    const fetchRegiones = async () => {
      try {
        // Asume que tienes un endpoint para listar regiones
        const response = await apiClient.get<Region[]>('/ubicaciones/regiones/'); // Asegúrate que este endpoint exista
        setRegiones(response.data);
      } catch (err) {
        console.error("Error fetching regiones:", err);
        setError("No se pudieron cargar las regiones para el despacho.");
      }
    };
    fetchRegiones();

  }, [isAuthenticated, user]);

  // Efecto para cargar comunas cuando cambia la región seleccionada
  useEffect(() => {
    if (shippingInfo.regionId) {
      const fetchComunas = async () => {
        try {
          setIsLoading(true); // Podrías tener un loader específico para comunas
          setComunas([]); // Limpiar comunas anteriores
          setShippingInfo(prev => ({ ...prev, comunaId: '' })); // Resetear comuna seleccionada
          // Asume que tienes un endpoint para listar comunas por region_id
          const response = await apiClient.get<Comuna[]>(`/ubicaciones/comunas/?region_id=${shippingInfo.regionId}`); // Asegúrate que este endpoint exista
          setComunas(response.data);
        } catch (err) {
          console.error("Error fetching comunas:", err);
          setError("No se pudieron cargar las comunas para la región seleccionada.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchComunas();
    }
  }, [shippingInfo.regionId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {

    const { name, value } = e.target;
    setShippingInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleProceedToPayment = async () => {
    if (!selectedPaymentMethod) {
      setError("Por favor, selecciona un método de pago.");
      return;
    }
    if (totalItems === 0) {
      setError("Tu carrito está vacío.");
      return;
    }
    // Validaciones adicionales para despacho a domicilio
    if (selectedDeliveryMethod === 'DESPACHO_DOMICILIO') {
      if (!shippingInfo.nombreCompleto || !shippingInfo.email || !shippingInfo.direccion || !shippingInfo.regionId || !shippingInfo.comunaId) {
        setError("Para despacho a domicilio, por favor completa todos los campos de información de despacho (nombre, email, dirección, región y comuna).");
        return;
      }
    } else if (selectedDeliveryMethod === 'RETIRO_TIENDA') {
      if (!selectedSucursalRetiro) {
        setError("Por favor, selecciona una sucursal para el retiro en tienda.");
        return;
      }
    }
    // Aquí podrías añadir validación para 'RETIRO_TIENDA' si tuvieras selección de sucursal
    setIsLoading(true);
    setError(null);

    try {
      // 1. Crear el pedido en tu backend (esto es un paso previo a Transbank)
      //    Este endpoint debería devolver un ID de pedido o algo para iniciar el pago.
      //    Por ahora, simularemos este paso y directamente intentaremos iniciar el pago.

      // 2. Llamar al backend para iniciar la transacción de Transbank
      //    El backend se comunicará con Transbank y devolverá una URL y un token.
       const response = await apiClient.post('/pagos/crear-transaccion-pedido/', {
        id_metodo_pago: selectedPaymentMethod, // Enviar el método de pago seleccionado
        items_carrito: items.map(item => ({ // Enviar los ítems del carrito
          producto_id: item.id,
          cantidad: item.cantidad,
          precio_unitario: item.precio // El backend debería verificar este precio contra la BD
        })),
        info_envio: shippingInfo, // Contiene nombre, email, direccion, telefono, regionId, comunaId
        metodo_envio: selectedDeliveryMethod,
        sucursal_despacho_id: selectedDeliveryMethod === 'DESPACHO_DOMICILIO' ? selectedSucursal?.id : null, // NUEVO: Enviar ID de sucursal seleccionada
        // email_comprador: shippingInfo.email, // Eliminado, ya que info_envio.email contiene esta información y el backend no lo usa por separado.
        sucursal_retiro_id: selectedDeliveryMethod === 'RETIRO_TIENDA' ? selectedSucursalRetiro : null,
      });

      // El backend ahora podría devolver diferentes cosas según el método de pago.
      // Si es Transbank, devolverá token y url_redirect.
      // Si es otro método, podría devolver un mensaje de éxito o un ID de pedido.
      if (response.data.tipo_respuesta === 'TRANSBANK_REDIRECT') {
        const { token, url_redirect } = response.data;
        if (token && url_redirect) {
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = url_redirect;
          const tokenInput = document.createElement('input');
          tokenInput.type = 'hidden';
          tokenInput.name = 'token_ws';
          tokenInput.value = token;
          form.appendChild(tokenInput);
          document.body.appendChild(form);
          form.submit();
        } else {
          setError('No se pudo iniciar el proceso de pago con Transbank. Inténtalo de nuevo.');
        }
      } else if (response.data.tipo_respuesta === 'PEDIDO_CREADO') {
        // Para otros métodos de pago que no requieren redirección inmediata
        alert(response.data.mensaje || "Pedido realizado con éxito. Recibirás un correo con los detalles.");
        clearCart(); // Limpiar carrito
        // Considera crear una página de confirmación/resumen de pedido y navegar allí
        navigate(`/pedido-confirmado/${response.data.id_pedido}`); // Ejemplo de ruta, asegúrate de crearla en App.tsx
      } else {
        setError(response.data.mensaje || 'Respuesta inesperada del servidor al procesar el pago.');
      }
    } catch (err: any) {
      console.error("Error al proceder al pago:", err);
      setError(err.response?.data?.detail || 'Error al conectar con el servicio de pago. Por favor, inténtalo más tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  if (totalItems === 0 && !isLoading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Tu Carrito está Vacío</h2>
        <p className="text-gray-600">Añade productos a tu carrito antes de proceder al pago.</p>
        <Link to="/" className="mt-4 inline-block px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">
          Seguir Comprando
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Columna de Información de Envío/Facturación (Formulario) */}
        <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Información de Despacho</h2>
          {/* Aquí iría el formulario de envío/facturación */}
          <form onSubmit={(e) => e.preventDefault()}> {/* Prevenir submit por ahora */}
            <div className="space-y-4">
              <div>
                <label htmlFor="nombreCompleto" className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                <input type="text" name="nombreCompleto" id="nombreCompleto" value={shippingInfo.nombreCompleto} onChange={handleInputChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" name="email" id="email" value={shippingInfo.email} onChange={handleInputChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" />
              </div>
              <div>
                <label htmlFor="direccion" className="block text-sm font-medium text-gray-700">Dirección</label>
                <input type="text" name="direccion" id="direccion" value={shippingInfo.direccion} onChange={handleInputChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" />
              </div>
              <div>
                <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">Teléfono</label>
                <input type="tel" name="telefono" id="telefono" value={shippingInfo.telefono} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2" />
              </div>

              {/* Selección de Método de Entrega */}
              <div className="mt-6">
                <label htmlFor="deliveryMethod" className="block text-sm font-medium text-gray-700 mb-1">Método de Entrega</label>
                <select
                  name="deliveryMethod"
                  id="deliveryMethod"
                  value={selectedDeliveryMethod}
                  onChange={(e) => setSelectedDeliveryMethod(e.target.value as DeliveryMethodId)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
                >
                  {DELIVERY_METHODS.map(method => (
                    <option key={method.id} value={method.id}>{method.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Campos condicionales para Despacho a Domicilio */}
              {selectedDeliveryMethod === 'DESPACHO_DOMICILIO' && (
                <>
                  <div className="mt-4">
                    <label htmlFor="regionId" className="block text-sm font-medium text-gray-700">Región</label>
                    <select name="regionId" id="regionId" value={shippingInfo.regionId} onChange={handleInputChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2">
                      <option value="">Selecciona una región</option>
                      {regiones.map(region => (
                        <option key={region.id} value={region.id}>{region.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-4">
                    <label htmlFor="comunaId" className="block text-sm font-medium text-gray-700">Comuna</label>
                    <select name="comunaId" id="comunaId" value={shippingInfo.comunaId} onChange={handleInputChange} required disabled={!shippingInfo.regionId || comunas.length === 0} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 disabled:bg-gray-100">
                      <option value="">Selecciona una comuna</option>
                      {comunas.map(comuna => (
                        <option key={comuna.id} value={comuna.id}>{comuna.nombre}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {/* Placeholder para selección de sucursal si es Retiro en Tienda */}
              {selectedDeliveryMethod === 'RETIRO_TIENDA' && (
                <div className="mt-4">
                  <label htmlFor="sucursalId" className="block text-sm font-medium text-gray-700">Sucursal de Retiro</label>
                    <select
                    name="sucursalId"
                    id="sucursalId"
                    value={selectedSucursalRetiro || ''}
                    onChange={(e) => setSelectedSucursalRetiro(e.target.value)}
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
                    disabled={isLoadingSucursales || sucursales.length === 0}
                    >
                    <option value="">Selecciona una sucursal</option>
                    {sucursales.map(sucursal => (
                      <option key={sucursal.id} value={sucursal.id}>{sucursal.nombre}</option>
                    ))}
                  </select>
                  {isLoadingSucursales && <p className="text-xs text-gray-500 mt-1">Cargando sucursales...</p>}
                </div>
              )}
            {/* Selección de Método de Pago */}
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Método de Pago</h3>
              {paymentMethods.length > 0 ? (
                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <label key={method.id} className="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={String(method.id)}
                        checked={selectedPaymentMethod === String(method.id)}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">{method.nombre}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Cargando métodos de pago...</p>
              )}
            </div>
            </div> {/* Closes <div className="space-y-4"> from line 218 */}
          </form>
        </div>

        {/* Columna de Resumen del Pedido */}
        <div className="md:col-span-1 bg-gray-50 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Resumen del Pedido</h2>
          {items.map(item => (
            <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
              <div>
                <p className="font-medium">{item.nombre} <span className="text-sm text-gray-500">x {item.cantidad}</span></p>
              </div>
              <p>${(item.precio * item.cantidad).toLocaleString('es-CL')}</p>
            </div>
          ))}
          <div className="flex justify-between items-center mt-4 pt-4 border-t font-bold text-lg">
            <p>Total:</p>
            <p>${totalPrice.toLocaleString('es-CL')}</p>
          </div>

          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

          <button
            onClick={handleProceedToPayment}
            disabled={isLoading || totalItems === 0}
            className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-150 disabled:opacity-50"
          >
            {isLoading ? 'Procesando...' : `Pagar con ${paymentMethods.find(pm => String(pm.id) === selectedPaymentMethod)?.nombre || 'Método Seleccionado'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;