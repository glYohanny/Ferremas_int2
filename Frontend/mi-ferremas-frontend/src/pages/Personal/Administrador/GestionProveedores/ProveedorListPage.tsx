// src/pages/Personal/Administrador/GestionProveedores/ProveedorListPage.tsx
// (Crea las carpetas si no existen)
import React, { useState, useEffect, useCallback} from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Importar useNavigate
import apiClient from '../../../../services/api'; // Ajusta la ruta a tu apiClient

interface Proveedor {
    id: number;
    razon_social: string;
    rut: string;
    email: string;
    telefono: string;
    nombre_fantasia?: string; // Puede ser opcional
    activo: boolean;
    // Agrega otros campos que quieras mostrar, como comuna_detalle.nombre si lo necesitas
}

const ProveedorListPage: React.FC = () => {
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate(); // Importar y usar useNavigate

    // Mover fetchProveedores fuera para poder llamarla después de actualizar
    const fetchProveedores = useCallback(async () => {
        try {
            setLoading(true);
            // Asumiendo que tu endpoint de proveedores está en /proveedores/
            // y que tu apiClient está configurado para la URL base de la API
            const response = await apiClient.get('/proveedores/');
            // Asegurarse de que siempre se asigne un array
            if (Array.isArray(response.data.results)) {
                setProveedores(response.data.results);
            } else if (Array.isArray(response.data)) {
                setProveedores(response.data);
            } else {
                setProveedores([]); // Si no es un array, asignar un array vacío para evitar el error
                console.warn("La respuesta de la API de proveedores no es un array:", response.data);
            }
            setError(null);
        } catch (err: any) {
            console.error("Error al obtener proveedores:", err);
            setError(err.response?.data?.detail || "No se pudo cargar la lista de proveedores.");
        } finally {
            setLoading(false);
        }
    }, []); // useCallback para evitar re-creaciones innecesarias si se pasa como dependencia

    useEffect(() => {
        fetchProveedores();
    }, [fetchProveedores]);

    const handleToggleActivo = async (proveedor: Proveedor) => {
        try {
            // Llama a tu API para actualizar el estado 'activo' del proveedor
            // Asume que tienes un endpoint PATCH /proveedores/{id}/
            await apiClient.patch(`/proveedores/${proveedor.id}/`, { activo: !proveedor.activo });
            // Vuelve a cargar los proveedores para reflejar el cambio
            fetchProveedores();
        } catch (err: any) {
            console.error("Error al cambiar estado del proveedor:", err);
            setError(err.response?.data?.detail || "No se pudo cambiar el estado del proveedor.");
            // Opcional: podrías revertir el cambio visualmente si la API falla,
            // pero recargar la lista es más simple para empezar.
        }
    };

    const handleDelete = async (proveedorId: number, proveedorNombre: string) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar al proveedor "${proveedorNombre}"? Esta acción no se puede deshacer.`)) {
            try {
                await apiClient.delete(`/proveedores/${proveedorId}/`);
                // Vuelve a cargar los proveedores para reflejar el cambio
                fetchProveedores();
            } catch (err: any) {
                console.error("Error al eliminar proveedor:", err);
                setError(err.response?.data?.detail || "No se pudo eliminar el proveedor.");
            }
        }
    };

    // Placeholder para la función de editar, necesitarás una página/modal para esto
    const handleEditarProveedor = (id: number) => {
        // Navegar a la página de edición
        navigate(`/personal/admin/proveedores/editar/${id}`);
    };

    const filteredProveedores = proveedores.filter(p =>
        p.razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.rut.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.nombre_fantasia && p.nombre_fantasia.toLowerCase().includes(searchTerm.toLowerCase())) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="text-center p-4">Cargando proveedores...</div>;
    }

    if (error) {
        return <div className="text-center p-4 text-red-500">Error: {error}</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Proveedores</h1>
                <div className="space-x-2">
                    <Link
                        to="/personal/admin/crear-proveedor" // Ruta a la página de creación de proveedores
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
                    >
                        + Nuevo Proveedor
                    </Link>
                    <Link
                        to="/personal/admin/pedidos-proveedor" // Cambiado para ir a la lista de pedidos
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
                    >
                        Gestionar Pedidos
                    </Link>
                </div>
            </div>

            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Buscar por Razón Social, RUT, Nombre Fantasía o Email..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                />
            </div>

            {filteredProveedores.length === 0 ? (
                <p className="text-gray-600">No hay proveedores registrados.</p>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-x-auto_">
                    <table className="min-w-full leading-normal">
                        <thead>
                            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                                <th className="py-3 px-6 text-left">ID</th>
                                <th className="py-3 px-6 text-left">Razón Social</th>
                                <th className="py-3 px-6 text-left">RUT</th>
                                <th className="py-3 px-6 text-left">Email</th>
                                <th className="py-3 px-6 text-left">Nombre Fantasía</th>
                                <th className="py-3 px-6 text-left">Teléfono</th>
                                <th className="py-3 px-6 text-center">Estado</th>
                                <th className="py-3 px-6 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 text-sm">
                            {filteredProveedores.map((proveedor) => (
                                <tr key={proveedor.id} className="border-b border-gray-200 hover:bg-gray-100">
                                    <td className="py-3 px-6 text-left whitespace-nowrap">{proveedor.id}</td>
                                    <td className="py-3 px-6 text-left">{proveedor.razon_social}</td>
                                    <td className="py-3 px-6 text-left">{proveedor.rut}</td>
                                    <td className="py-3 px-6 text-left">{proveedor.email || 'N/A'}</td>
                                    <td className="py-3 px-6 text-left">{proveedor.nombre_fantasia || 'N/A'}</td>
                                    <td className="py-3 px-6 text-left">{proveedor.telefono || 'N/A'}</td>
                                    <td className="py-3 px-6 text-center">
                                        <button
                                            onClick={() => handleToggleActivo(proveedor)}
                                            className={`py-1 px-3 rounded-full text-xs font-semibold
                                                ${proveedor.activo ? 'bg-green-200 text-green-800 hover:bg-green-300' : 'bg-red-200 text-red-800 hover:bg-red-300'}`}
                                        >
                                            {proveedor.activo ? 'Activo' : 'Inactivo'}
                                        </button>
                                    </td>
                                    <td className="py-3 px-6 text-center whitespace-nowrap">
                                        <button
                                            onClick={() => navigate(`/personal/admin/proveedores/detalle/${proveedor.id}`)}
                                            className="text-blue-600 hover:text-blue-900 font-medium mr-3"
                                        >
                                            Ver
                                        </button>
                                        <button
                                            onClick={() => handleEditarProveedor(proveedor.id)}
                                            className="text-indigo-600 hover:text-indigo-900 font-medium mr-3"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(proveedor.id, proveedor.razon_social)}
                                            className="text-red-600 hover:text-red-900 font-medium"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ProveedorListPage;
