import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../../services/api';

// Interfaces para los detalles del pedido (puedes expandirlas según tu PedidoClienteSerializer)
interface ProductoDetalle {
  id: number;
  nombre: string;
  // imagen_url?: string; // Si tu serializer de producto lo incluye
}

interface DetallePedidoItem {
  id: number;
  producto_detalle: ProductoDetalle;
  cantidad: number;
  precio_unitario_venta: string; // O el precio con descuento si lo prefieres mostrar
  subtotal_linea_display: string;
}

interface PedidoCompleto {
  id: number;
  fecha_pedido: string;
  estado_display: string;
  total_pedido: string;
  metodo_envio_display: string;
  direccion_entrega_texto?: string;
  comuna_entrega_nombre?: string; // Asumiendo que el serializer puede anidar el nombre de la comuna
  region_entrega_nombre?: string; // Asumiendo que el serializer puede anidar el nombre de la región
  telefono_contacto_envio?: string;
  email_contacto_envio?: string;
  notas_cliente?: string;
  detalles_pedido_cliente: DetallePedidoItem[];
  // Podrías añadir cliente_detalle, sucursal_despacho_detalle, etc.
}

const OrderDetailPage: React.FC = () => {
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const [pedido, setPedido] = useState<PedidoCompleto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pedidoId) {
      const fetchPedidoDetalle = async () => {
        try {
          setLoading(true);
          // El endpoint ya debería estar funcionando
          const response = await apiClient.get<PedidoCompleto>(`/pedidos/pedidos-cliente/${pedidoId}/`);
          setPedido(response.data);
          setError(null);
        } catch (err) {
          console.error("Error fetching order details:", err);
          setError("No se pudieron cargar los detalles del pedido. Es posible que no tengas permiso para ver este pedido o que no exista.");
          setPedido(null);
        } finally {
          setLoading(false);
        }
      };
      fetchPedidoDetalle();
    }
  }, [pedidoId]);

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Cargando detalles del pedido...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-red-500">{error}</div>;
  }

  if (!pedido) {
    return <div className="container mx-auto p-4 text-center">Pedido no encontrado.</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Detalle del Pedido #{pedido.id}</h1>
      
      <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3 border-b pb-2">Información General</h2>
        <p><strong>Fecha del Pedido:</strong> {new Date(pedido.fecha_pedido).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        <p><strong>Estado:</strong> <span className="font-semibold text-blue-600">{pedido.estado_display}</span></p>
        <p><strong>Total del Pedido:</strong> <span className="font-bold text-lg">${parseFloat(pedido.total_pedido).toLocaleString('es-CL')}</span></p>
        <p><strong>Método de Envío:</strong> {pedido.metodo_envio_display}</p>
      </div>

      {pedido.metodo_envio_display === 'Despacho a Domicilio' && (
        <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3 border-b pb-2">Información de Despacho</h2>
          <p><strong>Dirección:</strong> {pedido.direccion_entrega_texto || 'No especificada'}</p>
          {/* <p><strong>Comuna:</strong> {pedido.comuna_entrega_nombre || 'No especificada'}</p> */}
          {/* <p><strong>Región:</strong> {pedido.region_entrega_nombre || 'No especificada'}</p> */}
          <p><strong>Teléfono de Contacto:</strong> {pedido.telefono_contacto_envio || 'No especificado'}</p>
          <p><strong>Email de Contacto:</strong> {pedido.email_contacto_envio || 'No especificado'}</p>
        </div>
      )}

      <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3 border-b pb-2">Artículos del Pedido</h2>
        <ul className="divide-y divide-gray-200">
          {pedido.detalles_pedido_cliente.map(item => (
            <li key={item.id} className="py-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{item.producto_detalle.nombre} <span className="text-sm text-gray-500">x {item.cantidad}</span></p>
                  <p className="text-sm text-gray-600">Precio Unitario: ${parseFloat(item.precio_unitario_venta).toLocaleString('es-CL')}</p>
                </div>
                <p className="font-semibold">${parseFloat(item.subtotal_linea_display).toLocaleString('es-CL')}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {pedido.notas_cliente && (
        <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3 border-b pb-2">Notas del Cliente</h2>
          <p className="text-gray-700 whitespace-pre-line">{pedido.notas_cliente}</p>
        </div>
      )}

      <div className="text-center mt-8">
        <Link to="/mis-pedidos" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200">Volver a Mis Pedidos</Link>
      </div>
    </div>
  );
};

export default OrderDetailPage;