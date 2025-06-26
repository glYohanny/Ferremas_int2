// src/pages/Personal/Administrador/GestionProveedores/CrearPedidoProveedorPage.tsx
import React, { useState, useEffect } from 'react';
import apiClient from '../../../../services/api'; // Ajusta la ruta
import { useNavigate } from 'react-router-dom';

interface Proveedor {
    id: number;
    razon_social: string;
}

interface Producto {
    id: number;
    nombre: string;
    // podrías añadir sku o precio_compra_referencial si lo tienes
}

interface Sucursal {
    id: number;
    nombre: string;
}

interface DetallePedido {
    producto: number;
    cantidad_solicitada: number;
    precio_unitario_compra: number; // Precio al que se compra al proveedor
}

const CrearPedidoProveedorPage: React.FC = () => {
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [detallesPedido, setDetallesPedido] = useState<DetallePedido[]>([{ producto: 0, cantidad_solicitada: 1, precio_unitario_compra: 0 }]);
    const [proveedorSeleccionado, setProveedorSeleccionado] = useState<number | string>(''); // Puede ser string inicialmente por el <option value="">
    const [fechaEstimadaEntrega, setFechaEstimadaEntrega] = useState<string>('');
    const [sucursalSeleccionada, setSucursalSeleccionada] = useState<number | string>('');
    const [notas, setNotas] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [proveedoresRes, productosRes, sucursalesRes] = await Promise.all([
                    apiClient.get('/proveedores/'),
                    apiClient.get('/gestion-productos/productos/'),
                    apiClient.get('/sucursales/sucursales/')
                ]);
                setProveedores(proveedoresRes.data.results || proveedoresRes.data);
                setProductos(productosRes.data.results || productosRes.data);

                // Asegurarnos de que siempre asignamos un array
                const sucursalesData = sucursalesRes.data.results || sucursalesRes.data;
                setSucursales(Array.isArray(sucursalesData) ? sucursalesData : []);

            } catch (err: any) {
                console.error("Error al cargar datos iniciales:", err);
                setError("No se pudieron cargar los proveedores o productos.");
                setSucursales([]); // En caso de error, asegurar que sea un array vacío
            }
        };
        fetchData();
    }, []);

    const handleAgregarDetalle = () => {
        setDetallesPedido([...detallesPedido, { producto: 0, cantidad_solicitada: 1, precio_unitario_compra: 0 }]);
    };

    const handleCambioDetalle = (index: number, campo: keyof DetallePedido, valor: string | number) => {
        const nuevosDetalles = [...detallesPedido];
        // Asegurarse de que el valor sea numérico para los campos numéricos
        if (campo === 'producto' || campo === 'cantidad_solicitada' || campo === 'precio_unitario_compra') {
            nuevosDetalles[index][campo] = Number(valor);
        } else {
            // @ts-ignore // Para otros campos si los hubiera
            nuevosDetalles[index][campo] = valor;
        }
        setDetallesPedido(nuevosDetalles);
    };

    const handleEliminarDetalle = (index: number) => {
        const nuevosDetalles = detallesPedido.filter((_, i) => i !== index);
        setDetallesPedido(nuevosDetalles);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setLoading(true);

        if (!proveedorSeleccionado || proveedorSeleccionado === "") {
            setError("Debe seleccionar un proveedor.");
            setLoading(false);
            return;
        }
        if (!sucursalSeleccionada || sucursalSeleccionada === "") {
            setError("Debe seleccionar una sucursal de recepción.");
            setLoading(false);
            return;
        }
        if (detallesPedido.some(d => d.producto === 0 || d.cantidad_solicitada <= 0 || d.precio_unitario_compra < 0)) {
            setError("Todos los detalles del pedido deben tener un producto seleccionado, cantidad mayor a cero y precio válido.");
            setLoading(false);
            return;
        }

        const datosPedido = {
            proveedor: Number(proveedorSeleccionado),
            sucursal_recepcion: Number(sucursalSeleccionada),
            detalles_pedido: detallesPedido, // El backend espera 'detalles_pedido'
            fecha_estimada_entrega: fechaEstimadaEntrega || null,
            notas: notas || null,
            // El backend asignará 'creado_por' y 'estado' por defecto
        };

        try {
            // La URL debe coincidir con la que definiste en pedido_app/api/urls.py
            const response = await apiClient.post('/pedidos/pedidos-proveedor/', datosPedido);
            setSuccessMessage(`Pedido a proveedor creado con éxito. ID: ${response.data.id}`);
            // Redirigir a la lista de pedidos a proveedor o al detalle del pedido creado
            // Ajusta la ruta según tu configuración de rutas para ver los pedidos a proveedor
            navigate(`/personal/admin/pedidos-proveedor`); // Ejemplo: redirige a la lista
            // O si tienes una página de detalle:
            // navigate(`/personal/admin/pedidos-proveedor/${response.data.id}`);
            
        } catch (err: any) {
            console.error("Error al crear pedido a proveedor:", err);
            setError(err.response?.data?.error || err.response?.data?.detail || JSON.stringify(err.response?.data) || "Error al crear el pedido.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 bg-white shadow-lg rounded-lg">
            <h1 className="text-3xl font-semibold text-gray-800 mb-6">Crear Pedido a Proveedor</h1>

            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded">{error}</div>}
            {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 border border-green-300 rounded">{successMessage}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="proveedor" className="block text-sm font-medium text-gray-700 mb-1">Proveedor:</label>
                    <select
                        id="proveedor"
                        value={proveedorSeleccionado}
                        onChange={(e) => setProveedorSeleccionado(e.target.value)}
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                        <option value="">-- Seleccione un proveedor --</option>
                        {proveedores.map((p) => (
                            <option key={p.id} value={p.id}>{p.razon_social}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="sucursal" className="block text-sm font-medium text-gray-700 mb-1">Sucursal de Recepción:</label>
                    <select
                        id="sucursal"
                        value={sucursalSeleccionada}
                        onChange={(e) => setSucursalSeleccionada(e.target.value)}
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                        <option value="">-- Seleccione una sucursal --</option>
                        {sucursales.map((s) => (
                            <option key={s.id} value={s.id}>{s.nombre}</option>
                        ))}
                    </select>
                </div>

                <fieldset className="border border-gray-300 p-4 rounded-md">
                    <legend className="text-lg font-medium text-gray-700 px-2">Detalles del Pedido</legend>
                    {detallesPedido.map((detalle, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4 p-3 border-b border-gray-200">
                            <div className="md:col-span-2">
                                <label htmlFor={`producto-${index}`} className="block text-sm font-medium text-gray-700">Producto:</label>
                                <select
                                    id={`producto-${index}`}
                                    value={detalle.producto}
                                    onChange={(e) => handleCambioDetalle(index, 'producto', e.target.value)}
                                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                                    <option value={0}>-- Seleccione un producto --</option>
                                    {productos.map((prod) => (
                                        <option key={prod.id} value={prod.id}>{prod.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor={`cantidad-${index}`} className="block text-sm font-medium text-gray-700">Cantidad:</label>
                                <input
                                    type="number"
                                    id={`cantidad-${index}`}
                                    min="1"
                                    value={detalle.cantidad_solicitada}
                                    onChange={(e) => handleCambioDetalle(index, 'cantidad_solicitada', e.target.value)}
                                    className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor={`precio-${index}`} className="block text-sm font-medium text-gray-700">Precio Compra (€):</label>
                                <input
                                    type="number"
                                    id={`precio-${index}`}
                                    min="0"
                                    step="0.01"
                                    value={detalle.precio_unitario_compra}
                                    onChange={(e) => handleCambioDetalle(index, 'precio_unitario_compra', e.target.value)}
                                    className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                            {detallesPedido.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => handleEliminarDetalle(index)}
                                    className="mt-1 md:mt-0 bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-md text-sm self-end"
                                >
                                    Eliminar
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={handleAgregarDetalle}
                        className="mt-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md text-sm"
                    >
                        + Agregar Producto
                    </button>
                </fieldset>

                <div>
                    <label htmlFor="fechaEstimadaEntrega" className="block text-sm font-medium text-gray-700">Fecha Estimada de Entrega:</label>
                    <input
                        type="date"
                        id="fechaEstimadaEntrega"
                        value={fechaEstimadaEntrega}
                        onChange={(e) => setFechaEstimadaEntrega(e.target.value)}
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>

                <div>
                    <label htmlFor="notas" className="block text-sm font-medium text-gray-700">Notas Adicionales:</label>
                    <textarea
                        id="notas"
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        rows={3}
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                        {loading ? 'Creando Pedido...' : 'Crear Pedido'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CrearPedidoProveedorPage;
