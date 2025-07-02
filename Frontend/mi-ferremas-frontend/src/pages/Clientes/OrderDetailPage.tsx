import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api'; // Assuming you have an api service

// Define interfaces for Pedido and DetallePedido based on your backend serializers
interface DetallePedido {
  producto_detalle: {
    nombre: string;
  };
  cantidad: number;
  precio_unitario_venta_original: number; // Corrected name for original price
  precio_unitario_con_descuento: number; // Price after discount
  subtotal_linea_display: string; // Formatted subtotal
}

interface Pedido {
  id: number;
  cliente_nombre: string;
  estado: string;
  total_pedido: number;
  fecha_pedido: string;
  cliente_email?: string;
  cliente_telefono?: string;
  detalles_pedido_cliente: DetallePedido[];
  // Add other fields from PedidoClienteSerializer as needed
  metodo_envio_display: string;
  direccion_entrega_texto: string;
  fecha_entrega_estimada: string;
  notas_cliente: string;
  fecha_entregado?: string | null;
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
    default:
      return 'bg-gray-200 text-gray-800';
  }
};

const OrderDetailPage: React.FC = () => {
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPedidoDetails = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/pedidos/pedidos-cliente/${pedidoId}/`);
        setPedido(response.data);
      } catch (err) {
        setError('No se pudieron cargar los detalles del pedido.');
        console.error('Error al cargar detalles del pedido:', err);
      } finally {
        setLoading(false);
      }
    };

    if (pedidoId) {
      fetchPedidoDetails();
    }
  }, [pedidoId]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const shouldPrint = queryParams.get('print');

    if (shouldPrint === 'true' && pedido) {
      // Asegurarse de que el DOM esté renderizado antes de imprimir
      const timer = setTimeout(() => {
        window.print();
        // Eliminar el parámetro 'print' de la URL después de imprimir
        // para evitar que se imprima de nuevo si el usuario recarga la página
        navigate(location.pathname, { replace: true });
      }, 500); // Pequeño retraso para asegurar el renderizado

      return () => clearTimeout(timer); // Limpiar el temporizador
    }
  }, [location.search, pedido, navigate, location.pathname]);

  if (loading) {
    return <div className="text-center p-10">Cargando detalles del pedido...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center p-10">{error}</div>;
  }

  if (!pedido) {
    return <div className="text-center p-10">Pedido no encontrado.</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Detalles del Pedido #{pedido.id.toString().padStart(3, '0')}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-gray-600"><span className="font-semibold">Cliente:</span> {pedido.cliente_nombre}</p>
          <p className="text-gray-600"><span className="font-semibold">Estado:</span> <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(pedido.estado)}`}>{pedido.estado.replace(/_/g, ' ')}</span></p>
          <p className="text-gray-600"><span className="font-semibold">Fecha Pedido:</span> {new Date(pedido.fecha_pedido).toLocaleDateString()}</p>
          {pedido.fecha_entrega_estimada && <p className="text-gray-600"><span className="font-semibold">Fecha Entrega Estimada:</span> {new Date(pedido.fecha_entrega_estimada).toLocaleDateString()}</p>}
          {pedido.fecha_entregado && <p className="text-gray-600"><span className="font-semibold">Fecha Entregado:</span> {new Date(pedido.fecha_entregado).toLocaleDateString()}</p>}
        </div>
        <div>
          <p className="text-gray-600"><span className="font-semibold">Método de Envío:</span> {pedido.metodo_envio_display}</p>
          {pedido.direccion_entrega_texto && <p className="text-gray-600"><span className="font-semibold">Dirección de Entrega:</span> {pedido.direccion_entrega_texto}</p>}
          {pedido.notas_cliente && <p className="text-gray-600"><span className="font-semibold">Notas del Cliente:</span> {pedido.notas_cliente}</p>}
          <p className="text-gray-600 text-xl font-bold mt-2"><span className="font-semibold">Total Pedido:</span> ${pedido.total_pedido.toLocaleString('es-CL')}</p>
        </div>
      </div>

      <h3 className="text-xl font-semibold mb-3 text-gray-700">Productos</h3>
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border-b text-left">Producto</th>
              <th className="py-2 px-4 border-b text-center">Cantidad</th>
              <th className="py-2 px-4 border-b text-right">Precio Unitario</th>
              <th className="py-2 px-4 border-b text-right">Descuento Línea</th>
              <th className="py-2 px-4 border-b text-right">Subtotal Línea</th>
            </tr>
          </thead>
          <tbody>
            {pedido.detalles_pedido_cliente.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="py-2 px-4 border-b">{item.producto_detalle.nombre}</td>
                <td className="py-2 px-4 border-b text-center">{item.cantidad}</td>
                <td className="py-2 px-4 border-b text-right">${item.precio_unitario_venta_original.toLocaleString('es-CL')}</td>
                <td className="py-2 px-4 border-b text-right">
                  {item.precio_unitario_venta_original !== item.precio_unitario_con_descuento ?
                    `$${(item.precio_unitario_venta_original - item.precio_unitario_con_descuento).toLocaleString('es-CL')}` : 'N/A'}
                </td>
                <td className="py-2 px-4 border-b text-right">${parseFloat(item.subtotal_linea_display).toLocaleString('es-CL')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-4">
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-500 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600 transition-colors print:hidden"
        >
          Volver
        </button>
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition-colors print:hidden"
        >
          Imprimir Orden
        </button>
      </div>
    </div>
  );
};

export default OrderDetailPage;