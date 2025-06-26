// src/pages/Personal/Administrador/GestionProveedores/ProveedorDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../../../../services/api';

// Interfaces para tipar los datos que esperamos de la API
interface ProveedorDetalle {
    id: number;
    razon_social: string;
    rut: string;
    direccion: string;
    comuna_detalle: { nombre: string; region_detalle: { nombre: string } };
    telefono: string;
    email: string;
    nombre_fantasia?: string;
    nombre_contacto: string;
    activo: boolean;
    // Campos nuevos del backend
    condiciones_pago?: string;
    contrato?: string; // URL al archivo
    fecha_inicio_relacion?: string;
}

interface PedidoProveedorHistorial {
    id: number;
    fecha_creacion: string;
    fecha_estimada_entrega?: string;
    estado: string;
    total_pedido: number;
}

const ProveedorDetailPage: React.FC = () => {
    const { proveedorId } = useParams<{ proveedorId: string }>();
    const [proveedor, setProveedor] = useState<ProveedorDetalle | null>(null);
    const [historial, setHistorial] = useState<PedidoProveedorHistorial[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDetalles = async () => {
            if (!proveedorId) return;
            setLoading(true);
            try {
                // Hacemos las llamadas a la API en paralelo
                const [proveedorRes, historialRes] = await Promise.all([
                    apiClient.get(`/proveedores/${proveedorId}/`),
                    apiClient.get(`/pedidos/pedidos-proveedor/?proveedor=${proveedorId}`)
                ]);
                setProveedor(proveedorRes.data);
                setHistorial(historialRes.data.results || historialRes.data);
                setError(null);
            } catch (err: any) {
                console.error("Error al cargar los detalles del proveedor:", err);
                setError(err.response?.data?.detail || "No se pudieron cargar los datos del proveedor.");
            } finally {
                setLoading(false);
            }
        };
        fetchDetalles();
    }, [proveedorId]);

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

    if (loading) return <div className="text-center p-8">Cargando detalles del proveedor...</div>;
    if (error) return <div className="text-center p-8 text-red-500">Error: {error}</div>;
    if (!proveedor) return <div className="text-center p-8">No se encontró el proveedor.</div>;

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-4xl font-bold text-gray-800">{proveedor.razon_social}</h1>
                    <p className="text-lg text-gray-600">{proveedor.nombre_fantasia || 'Sin nombre de fantasía'}</p>
                </div>
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">
                        &larr; Volver
                    </button>
                    <Link to={`/personal/admin/proveedores/editar/${proveedor.id}`} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">
                        Editar Proveedor
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Columna de Datos Principales */}
                <div className="md:col-span-2 space-y-6">
                    {/* Datos del Proveedor */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-2xl font-semibold text-gray-700 border-b pb-2 mb-4">Datos del Proveedor</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <p><strong>RUT:</strong> {proveedor.rut}</p>
                            <p><strong>Contacto Principal:</strong> {proveedor.nombre_contacto}</p>
                            <p><strong>Email:</strong> <a href={`mailto:${proveedor.email}`} className="text-blue-600">{proveedor.email}</a></p>
                            <p><strong>Teléfono:</strong> <a href={`tel:${proveedor.telefono}`} className="text-blue-600">{proveedor.telefono}</a></p>
                            <p className="sm:col-span-2">
                                <strong>Dirección:</strong> {proveedor.direccion}
                                {proveedor.comuna_detalle?.nombre && `, ${proveedor.comuna_detalle.nombre}`}
                                {proveedor.comuna_detalle?.region_detalle?.nombre && `, ${proveedor.comuna_detalle.region_detalle.nombre}`}
                            </p>
                            <p><strong>Relación desde:</strong> {proveedor.fecha_inicio_relacion ? new Date(proveedor.fecha_inicio_relacion).toLocaleDateString() : 'No especificado'}</p>
                        </div>
                    </div>

                    {/* Condiciones de Pago y Contratos */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-2xl font-semibold text-gray-700 border-b pb-2 mb-4">Condiciones y Contratos</h2>
                        <div>
                            <h3 className="font-semibold">Condiciones de Pago:</h3>
                            <p className="text-gray-600 whitespace-pre-wrap">{proveedor.condiciones_pago || 'No especificadas.'}</p>
                        </div>
                        <div className="mt-4">
                            <h3 className="font-semibold">Contrato Adjunto:</h3>
                            {proveedor.contrato ? (
                                <a href={proveedor.contrato} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    Ver Contrato
                                </a>
                            ) : (
                                <p className="text-gray-600">No hay contrato adjunto.</p>
                            )}
                        </div>
                    </div>

                    {/* Historial de Entregas */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-2xl font-semibold text-gray-700 border-b pb-2 mb-4">Historial de Entregas</h2>
                        {historial.length > 0 ? (
                            <ul className="divide-y divide-gray-200">
                                {historial.map(pedido => (
                                    <li key={pedido.id}
                                        className="py-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer px-2"
                                        onClick={() => navigate(`/personal/admin/pedidos-proveedor/${pedido.id}`)} // Asume esta ruta de detalle
                                    >
                                        <div>
                                            <p className="font-medium text-blue-600 hover:underline">Pedido #{pedido.id} - {new Date(pedido.fecha_creacion).toLocaleDateString()}</p>
                                            <p className="text-sm text-gray-500">Total: ${new Intl.NumberFormat('es-CL').format(pedido.total_pedido)}</p>
                                        </div>
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoColor(pedido.estado)}`}>
                                            {pedido.estado.replace(/_/g, ' ')}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-600">No hay historial de pedidos para este proveedor.</p>
                        )}
                    </div>
                </div>

                {/* Columna Lateral */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">Estado</h3>
                        <p className={`font-bold ${proveedor.activo ? 'text-green-600' : 'text-red-600'}`}>
                            {proveedor.activo ? 'Activo' : 'Inactivo'}
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">Evaluación de Desempeño</h3>
                        <p className="text-gray-600">Funcionalidad en desarrollo.</p>
                        {/* Aquí irían las métricas cuando el backend las provea */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProveedorDetailPage;