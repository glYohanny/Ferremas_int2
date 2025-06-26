// src/pages/Personal/Administrador/GestionProveedores/PedidoProveedorListPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../../../../services/api';

interface PedidoProveedor {
    id: number;
    proveedor_detalle: {
        id: number;
        razon_social: string;
    };
    fecha_creacion: string;
    fecha_estimada_entrega?: string;
    estado: string;
    total_pedido: number;
}

const PedidoProveedorListPage: React.FC = () => {
    const [pedidos, setPedidos] = useState<PedidoProveedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filtroEstado, setFiltroEstado] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const fetchPedidos = useCallback(async () => {
        setLoading(true);
        try {
            // Asume que este es tu endpoint para listar pedidos a proveedor
            const response = await apiClient.get('/pedidos/pedidos-proveedor/');
            const data = response.data.results || response.data;
            // Ordenar por fecha de creación, los más nuevos primero
            if (Array.isArray(data)) {
                data.sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime());
            }
            setPedidos(data);
            setError(null);
        } catch (err: any) {
            console.error("Error al cargar los pedidos a proveedor:", err);
            setError(err.response?.data?.detail || "No se pudieron cargar los pedidos.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPedidos();
    }, [fetchPedidos]);

    const pedidosFiltrados = useMemo(() => {
        return pedidos
            .filter(p => {
                // Filtrar por estado
                if (filtroEstado && p.estado !== filtroEstado) {
                    return false;
                }
                return true;
            })
            .filter(p => {
                // Filtrar por término de búsqueda
                if (!searchTerm) {
                    return true;
                }
                const lowerSearchTerm = searchTerm.toLowerCase();
                return (
                    p.id.toString().includes(lowerSearchTerm) ||
                    p.proveedor_detalle.razon_social.toLowerCase().includes(lowerSearchTerm)
                );
            });
    }, [pedidos, filtroEstado, searchTerm]);

    const getEstadoColor = (estado: string) => {
        switch (estado) {
            case 'PENDIENTE':
                return 'bg-yellow-100 text-yellow-800';
            case 'EN_PROCESO':
                return 'bg-blue-100 text-blue-800';
            case 'ENTREGADO':
                return 'bg-green-100 text-green-800';
            case 'CANCELADO':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) return <div className="text-center p-8">Cargando pedidos...</div>;
    if (error) return <div className="text-center p-8 text-red-500">Error: {error}</div>;

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Pedidos a Proveedores</h1>
                <div className="flex items-center space-x-4">
                    <Link to="/personal/admin/proveedores" className="text-blue-600 hover:underline">
                        &larr; Volver a Proveedores
                    </Link>
                    <Link to="/personal/admin/crear-pedido-proveedor" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                        + Nuevo Pedido
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg border">
                <div>
                    <label htmlFor="search-term" className="block text-sm font-medium text-gray-700">Buscar por ID o Proveedor:</label>
                    <input
                        id="search-term"
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Ej: 123 o 'Proveedor S.A.'"
                        className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                    />
                </div>
                <div>
                    <label htmlFor="filtro-estado" className="block text-sm font-medium text-gray-700">Filtrar por estado:</label>
                    <select
                        id="filtro-estado"
                        value={filtroEstado}
                        onChange={e => setFiltroEstado(e.target.value)}
                        className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                    >
                        <option value="">Todos</option>
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="EN_PROCESO">En Proceso</option>
                        <option value="ENTREGADO">Entregado</option>
                        <option value="CANCELADO">Cancelado</option>
                    </select>
                </div>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full leading-normal">
                    <thead>
                        <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                            <th className="py-3 px-6 text-left">ID Pedido</th>
                            <th className="py-3 px-6 text-left">Proveedor</th>
                            <th className="py-3 px-6 text-left">Fecha Creación</th>
                            <th className="py-3 px-6 text-left">Fecha Estimada Entrega</th>
                            <th className="py-3 px-6 text-right">Total</th>
                            <th className="py-3 px-6 text-center">Estado</th>
                            <th className="py-3 px-6 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700 text-sm">
                        {pedidosFiltrados.length > 0 ? (
                            pedidosFiltrados.map(pedido => (
                                <tr key={pedido.id} className="border-b border-gray-200 hover:bg-gray-100">
                                    <td className="py-3 px-6 text-left whitespace-nowrap">#{pedido.id}</td>
                                    <td className="py-3 px-6 text-left">
                                        <Link to={`/personal/admin/proveedores/detalle/${pedido.proveedor_detalle.id}`} className="text-blue-600 hover:underline font-semibold">
                                            {pedido.proveedor_detalle.razon_social}
                                        </Link>
                                    </td>
                                    <td className="py-3 px-6 text-left">{new Date(pedido.fecha_creacion).toLocaleDateString()}</td>
                                    <td className="py-3 px-6 text-left">{pedido.fecha_estimada_entrega ? new Date(pedido.fecha_estimada_entrega).toLocaleDateString() : 'No especificada'}</td>
                                    <td className="py-3 px-6 text-right font-mono">${new Intl.NumberFormat('es-CL').format(pedido.total_pedido)}</td>
                                    <td className="py-3 px-6 text-center">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoColor(pedido.estado)}`}>
                                            {pedido.estado.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="py-3 px-6 text-center">
                                        <button
                                            onClick={() => navigate(`/personal/admin/pedidos-proveedor/${pedido.id}`)} // Ruta al detalle del pedido
                                            className="text-blue-600 hover:text-blue-900 font-medium"
                                        >
                                            Ver Detalles
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="text-center py-6 text-gray-500">
                                    No se encontraron pedidos que coincidan con los filtros.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PedidoProveedorListPage;