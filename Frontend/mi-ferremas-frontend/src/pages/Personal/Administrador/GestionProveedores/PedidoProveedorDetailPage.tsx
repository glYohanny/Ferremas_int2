import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../../../../services/api';

interface Detalle {
    id: number;
    producto_detalle: {
        id: number;
        nombre: string;
    };
    cantidad_solicitada: number;
    precio_unitario_compra: number;
    cantidad_recibida: number; // Cantidad que realmente se ha recibido
}

interface PedidoDetalle {
    id: number;
    proveedor_detalle: {
        id: number;
        razon_social: string;
    };
    sucursal_recepcion_detalle?: { // Añadido como opcional por si algún pedido antiguo no lo tiene
        id: number;
        nombre: string;
    };
    fecha_creacion: string;
    fecha_estimada_entrega?: string;
    fecha_entrega_real?: string;
    estado: string;
    total_pedido: number;
    notas?: string;
    detalles_pedido: Detalle[];
}

const PedidoProveedorDetailPage: React.FC = () => {
    const { pedidoId } = useParams<{ pedidoId: string }>();
    const [pedido, setPedido] = useState<PedidoDetalle | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nuevoEstado, setNuevoEstado] = useState('');
    const [editableDetalles, setEditableDetalles] = useState<Detalle[]>([]);
    const navigate = useNavigate();

    const fetchPedido = useCallback(async () => {
        if (!pedidoId) return;
        setLoading(true);
        try {
            const response = await apiClient.get(`/pedidos/pedidos-proveedor/${pedidoId}/`);
            setPedido(response.data);
            // Inicializar detalles editables con las cantidades recibidas de la API
            // o 0 si no vienen (aunque el modelo tiene default 0)
            const detallesConCantidadRecibida = response.data.detalles_pedido.map((d: Detalle) => ({ ...d, cantidad_recibida: d.cantidad_recibida || 0 }));
            setEditableDetalles(detallesConCantidadRecibida);
            setNuevoEstado(response.data.estado);
            setError(null);
        } catch (err: any) {
            console.error("Error al cargar el detalle del pedido:", err);
            setError(err.response?.data?.detail || "No se pudo cargar el pedido.");
        } finally {
            setLoading(false);
        }
    }, [pedidoId]);

    useEffect(() => {
        fetchPedido();
    }, [fetchPedido]);

    const handleCantidadRecibidaChange = (detalleId: number, nuevaCantidadStr: string) => {
        const nuevaCantidad = parseInt(nuevaCantidadStr, 10);
        if (isNaN(nuevaCantidad) || nuevaCantidad < 0) return; // o manejar el error

        setEditableDetalles(prevDetalles =>
            prevDetalles.map(detalle =>
                detalle.id === detalleId ? { ...detalle, cantidad_recibida: nuevaCantidad } : detalle
            )
        );
    };

    const handleUpdateStatus = async () => {
        if (!pedidoId || !nuevoEstado || nuevoEstado === pedido?.estado) return;
        try {
            const payload = {
                estado: nuevoEstado,
                detalles_pedido: editableDetalles.map(d => ({
                    id: d.id, // El backend actual lo ignora al recrear, pero es bueno tenerlo
                    producto: d.producto_detalle.id, // El serializer espera el ID del producto
                    cantidad_solicitada: d.cantidad_solicitada,
                    precio_unitario_compra: d.precio_unitario_compra,
                    cantidad_recibida: d.cantidad_recibida,
                }))
            };
            await apiClient.patch(`/pedidos/pedidos-proveedor/${pedidoId}/`, payload);
            fetchPedido();
        } catch (err: any) {
            console.error("Error al actualizar el estado:", err);
            setError(err.response?.data?.detail || "No se pudo actualizar el estado.");
        }
    };

    const getEstadoColor = (estado: string) => {
        switch (estado) {
            case 'SOLICITADO': return 'bg-yellow-100 text-yellow-800';
            case 'EN_TRANSITO': return 'bg-blue-100 text-blue-800';
            case 'RECIBIDO_PARCIAL': return 'bg-orange-100 text-orange-800'; // Color para Parcial
            case 'RECIBIDO_COMPLETO': return 'bg-green-100 text-green-800';
            case 'CANCELADO': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const isPedidoFinalizado = pedido?.estado === 'RECIBIDO_COMPLETO' || pedido?.estado === 'CANCELADO';


    if (loading) return <div className="text-center p-8">Cargando detalle del pedido...</div>;
    if (error) return <div className="text-center p-8 text-red-500">Error: {error}</div>;
    if (!pedido) return <div className="text-center p-8">No se encontró el pedido.</div>;

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Detalle del Pedido #{pedido.id}</h1>
                <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">
                    &larr; Volver
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna de Detalles del Pedido */}
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
                    <h2 className="text-2xl font-semibold text-gray-700 border-b pb-2 mb-4">Productos Solicitados</h2>
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left py-2">Producto</th>
                                <th className="text-center py-2">Cant. Solicitada</th>
                                <th className="text-center py-2">Cant. Recibida</th>
                                <th className="text-right py-2">Precio Unit.</th>
                                <th className="text-right py-2">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {editableDetalles.map(detalle => (
                                <tr key={detalle.id} className="border-b">
                                    <td className="py-2">{detalle.producto_detalle.nombre}</td>
                                    <td className="text-center py-2">{detalle.cantidad_solicitada}</td>
                                    <td className="py-2 text-center">
                                        <input
                                            type="number"
                                            value={detalle.cantidad_recibida}
                                            onChange={(e) => handleCantidadRecibidaChange(detalle.id, e.target.value)}
                                            className="w-20 p-1 border rounded text-center"
                                            disabled={isPedidoFinalizado}
                                            min="0"
                                            // max={detalle.cantidad_solicitada} // Opcional: restringir a no más de lo solicitado
                                        />
                                    </td>
                                    <td className="text-right py-2 font-mono">${new Intl.NumberFormat('es-CL').format(detalle.precio_unitario_compra)}</td>
                                    <td className="text-right py-2 font-mono">${new Intl.NumberFormat('es-CL').format(detalle.cantidad_solicitada * detalle.precio_unitario_compra)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="font-bold">
                                <td colSpan={4} className="text-right py-3">Total Pedido:</td>
                                <td className="text-right py-3 font-mono text-lg">${new Intl.NumberFormat('es-CL').format(pedido.total_pedido)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Columna de Información y Acciones */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-xl font-semibold text-gray-700 mb-4">Información General</h3>
                        <p><strong>Proveedor:</strong> <Link to={`/personal/admin/proveedores/detalle/${pedido.proveedor_detalle.id}`} className="text-blue-600 hover:underline">{pedido.proveedor_detalle.razon_social}</Link></p>
                        <p><strong>Fecha de Creación:</strong> {new Date(pedido.fecha_creacion).toLocaleDateString()}</p>
                        {pedido.sucursal_recepcion_detalle && <p><strong>Sucursal de Recepción:</strong> {pedido.sucursal_recepcion_detalle.nombre}</p>}
                        <p><strong>Fecha Estimada:</strong> {pedido.fecha_estimada_entrega ? new Date(pedido.fecha_estimada_entrega).toLocaleDateString() : 'No especificada'}</p>
                        <p><strong>Estado Actual:</strong> <span className={`px-2 py-1 text-sm font-semibold rounded-full ${getEstadoColor(pedido.estado)}`}>{pedido.estado.replace(/_/g, ' ')}</span></p>
                        {pedido.notas && <p className="mt-2"><strong>Notas:</strong> <span className="italic text-gray-600">{pedido.notas}</span></p>}
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-xl font-semibold text-gray-700 mb-4">Actualizar Estado</h3>
                        <div className="space-y-2">
                            <select
                                value={nuevoEstado}
                                onChange={(e) => setNuevoEstado(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                disabled={isPedidoFinalizado}
                            >
                                <option value="SOLICITADO">Solicitado</option>
                                <option value="EN_TRANSITO">En Tránsito</option>
                                <option value="RECIBIDO_PARCIAL">Recibido Parcialmente</option>
                                <option value="RECIBIDO_COMPLETO">Recibido Completamente</option>
                                <option value="CANCELADO">Cancelado</option>
                            </select>
                            <button
                                onClick={handleUpdateStatus}
                                disabled={isPedidoFinalizado || nuevoEstado === pedido.estado}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded disabled:bg-indigo-300"
                            >
                                Guardar Cambio
                            </button>
                            {isPedidoFinalizado && (
                                <p className="text-xs text-orange-600 mt-2">
                                    Este pedido ya ha sido {pedido.estado === 'RECIBIDO_COMPLETO' ? 'completado' : 'cancelado'} y no se puede modificar.
                                </p>
                            )}
                            {(nuevoEstado === 'RECIBIDO_COMPLETO' || nuevoEstado === 'RECIBIDO_PARCIAL') && (
                                <p className="text-xs text-gray-500 mt-2">
                                    Asegúrate de ingresar las cantidades recibidas correctamente. Al guardar, el stock se actualizará si el estado es 'Recibido Completo'.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PedidoProveedorDetailPage;