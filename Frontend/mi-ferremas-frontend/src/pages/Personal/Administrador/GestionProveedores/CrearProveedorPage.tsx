import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../../../services/api';

// Tipos de datos locales para el componente
interface Comuna {
    id: number;
    nombre: string;
    region_detalle: {
        id: number;
        nombre: string;
    };
}

interface Region {
    id: number;
    nombre: string;
};


interface ProveedorFormData {
    razon_social: string;
    rut: string;
    nombre_fantasia: string;
    direccion: string;
    comuna: number | '';
    telefono: string;
    email: string;
    nombre_contacto: string;
    banco: string;
    tipo_cuenta: string;
    numero_cuenta: string;
    moneda: string;
    activo: boolean;
    condiciones_pago: string;
    fecha_inicio_relacion: string;
}

const ProveedorFormPage: React.FC = () => {
    const { proveedorId } = useParams<{ proveedorId: string }>();
    const navigate = useNavigate();
    const isEditMode = Boolean(proveedorId);

    const [formData, setFormData] = useState<ProveedorFormData>({
        razon_social: '',
        rut: '',
        nombre_fantasia: '',
        direccion: '',
        comuna: '',
        telefono: '',
        email: '',
        nombre_contacto: '',
        banco: '',
        tipo_cuenta: '',
        numero_cuenta: '',
        moneda: 'CLP',
        activo: true,
        condiciones_pago: '',
        fecha_inicio_relacion: '',
    });
    const [contratoFile, setContratoFile] = useState<File | null>(null);
    const [existingContratoUrl, setExistingContratoUrl] = useState<string | null>(null);
    const [comunas, setComunas] = useState<Comuna[]>([]);
    const [regiones, setRegiones] = useState<Region[]>([]);
    const [selectedRegion, setSelectedRegion] = useState<number | ''>('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadBaseData = async () => {
            try {
                const regionesRes = await apiClient.get('/ubicaciones/regiones/');
                setRegiones(regionesRes.data.results || regionesRes.data);

                if (isEditMode) {
                    setLoading(true);
                    const providerRes = await apiClient.get(`/proveedores/${proveedorId}/`);
                    const providerData = providerRes.data;
                    
                    setFormData({
                        razon_social: providerData.razon_social || '',
                        rut: providerData.rut || '',
                        nombre_fantasia: providerData.nombre_fantasia || '',
                        direccion: providerData.direccion || '',
                        comuna: providerData.comuna || '',
                        telefono: providerData.telefono || '',
                        email: providerData.email || '',
                        nombre_contacto: providerData.nombre_contacto || '',
                        banco: providerData.banco || '',
                        tipo_cuenta: providerData.tipo_cuenta || '',
                        numero_cuenta: providerData.numero_cuenta || '',
                        moneda: providerData.moneda || 'CLP',
                        activo: providerData.activo,
                        condiciones_pago: providerData.condiciones_pago || '',
                        fecha_inicio_relacion: providerData.fecha_inicio_relacion || '',
                    });
                    setExistingContratoUrl(providerData.contrato);

                    if (providerData.comuna) {
                        const allComunasRes = await apiClient.get('/ubicaciones/comunas/');
                        const allComunas: Comuna[] = allComunasRes.data.results || allComunasRes.data;
                        const providerComunaDetails = allComunas.find(c => c.id === providerData.comuna);
                        // Añadir una comprobación para asegurarse de que region_detalle existe
                        if (providerComunaDetails?.region_detalle) {
                            setSelectedRegion(providerComunaDetails.region_detalle.id); 
                        }
                    }
                    setLoading(false);
                }
            } catch (err) {
                console.error("Error loading base data:", err);
                setError("No se pudieron cargar los datos iniciales.");
                setLoading(false);
            }
        };
        loadBaseData();
    }, [proveedorId, isEditMode]);

    useEffect(() => {
        if (selectedRegion) {
            const fetchComunas = async () => {
                try {
                    const response = await apiClient.get(`/ubicaciones/comunas/?region=${selectedRegion}`);
                    setComunas(response.data.results || response.data);
                } catch (err) {
                    console.error("Error al cargar comunas:", err);
                    setComunas([]);
                }
            };
            fetchComunas();
        } else {
            setComunas([]);
        }
    }, [selectedRegion]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        setFormData(prev => ({ ...prev, [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value }));
    };

    const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const regionId = e.target.value ? Number(e.target.value) : '';
        setSelectedRegion(regionId);
        setFormData(prev => ({ ...prev, comuna: '' }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setContratoFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const data = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            if (value !== null && value !== '') {
                data.append(key, String(value));
            }
        });

        if (contratoFile) {
            data.append('contrato', contratoFile);
        }

        try {
            const requestConfig = { headers: { 'Content-Type': 'multipart/form-data' } };
            if (isEditMode) {
                await apiClient.patch(`/proveedores/${proveedorId}/`, data, requestConfig);
            } else {
                await apiClient.post('/proveedores/', data, requestConfig);
            }
            navigate('/personal/admin/proveedores');
        } catch (err: any) {
            console.error("Error submitting form:", err.response?.data);
            const errorData = err.response?.data;
            if (typeof errorData === 'object' && errorData !== null) {
                const messages = Object.entries(errorData).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
                setError(messages.join(' | '));
            } else {
                setError(errorData || "Ocurrió un error al guardar el proveedor.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditMode) {
        return <div className="text-center p-8">Cargando formulario...</div>;
    }

    return (
        <div className="container mx-auto p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">
                {isEditMode ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}
            </h1>
            <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* --- Datos Generales --- */}
                <section className="p-6 border border-gray-200 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">Datos Generales</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <input name="razon_social" value={formData.razon_social} onChange={handleChange} placeholder="Razón Social" required className="p-2 border rounded" />
                        <input name="rut" value={formData.rut} onChange={handleChange} placeholder="RUT (ej: 12.345.678-K)" required className="p-2 border rounded" />
                        <input name="nombre_fantasia" value={formData.nombre_fantasia} onChange={handleChange} placeholder="Nombre de Fantasía" className="p-2 border rounded" />
                        <input name="direccion" value={formData.direccion} onChange={handleChange} placeholder="Dirección Completa" required className="p-2 border rounded" />
                        
                        <select
                            name="region"
                            value={selectedRegion}
                            onChange={handleRegionChange}
                            required
                            className="p-2 border rounded"
                        >
                            <option value="">Seleccione una Región</option>
                            {regiones.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                        </select>

                        <select name="comuna" value={formData.comuna} onChange={handleChange} required disabled={!selectedRegion || comunas.length === 0} className="p-2 border rounded disabled:bg-gray-100">
                            <option value="">Seleccione una Comuna</option>
                            {comunas.map(c => 
                                <option key={c.id} value={c.id}>
                                    {c.nombre}
                                </option>
                            )}
                        </select>

                        <input name="telefono" value={formData.telefono} onChange={handleChange} placeholder="Teléfono" className="p-2 border rounded" />
                        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="p-2 border rounded" />
                        <input name="nombre_contacto" value={formData.nombre_contacto} onChange={handleChange} placeholder="Nombre del Contacto" className="p-2 border rounded" />
                        <label className="flex items-center space-x-2">
                            <input type="checkbox" name="activo" checked={formData.activo} onChange={handleChange} className="h-5 w-5" />
                            <span>Activo</span>
                        </label>
                    </div>
                </section>

                {/* --- Información Bancaria --- */}
                <section className="p-6 border border-gray-200 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">Información Bancaria</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <input name="banco" value={formData.banco} onChange={handleChange} placeholder="Banco" className="p-2 border rounded" />
                        <select name="tipo_cuenta" value={formData.tipo_cuenta} onChange={handleChange} className="p-2 border rounded">
                            <option value="">Tipo de Cuenta</option>
                            <option value="Corriente">Cuenta Corriente</option>
                            <option value="Ahorro">Cuenta de Ahorro</option>
                            <option value="Vista">Cuenta Vista</option>
                            <option value="Otra">Otra</option>
                        </select>
                        <input name="numero_cuenta" value={formData.numero_cuenta} onChange={handleChange} placeholder="Número de Cuenta" className="p-2 border rounded" />
                        <select name="moneda" value={formData.moneda} onChange={handleChange} className="p-2 border rounded">
                            <option value="CLP">Peso Chileno (CLP)</option>
                            <option value="USD">Dólar Americano (USD)</option>
                            <option value="EUR">Euro (EUR)</option>
                            <option value="UF">Unidad de Fomento (UF)</option>
                        </select>
                    </div>
                </section>

                {/* --- Condiciones y Contratos --- */}
                <section className="p-6 border border-gray-200 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">Condiciones y Contratos</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <textarea name="condiciones_pago" value={formData.condiciones_pago} onChange={handleChange} placeholder="Condiciones de pago (ej: 30 días neto)" rows={4} className="p-2 border rounded md:col-span-2"></textarea>
                        <div>
                            <label htmlFor="fecha_inicio_relacion" className="block text-sm font-medium text-gray-700">Fecha Inicio Relación</label>
                            <input type="date" id="fecha_inicio_relacion" name="fecha_inicio_relacion" value={formData.fecha_inicio_relacion} onChange={handleChange} className="mt-1 p-2 border rounded w-full" />
                        </div>
                        <div>
                            <label htmlFor="contrato" className="block text-sm font-medium text-gray-700">Contrato (PDF, DOC)</label>
                            <input type="file" id="contrato" name="contrato" onChange={handleFileChange} accept=".pdf,.doc,.docx" className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                            {isEditMode && existingContratoUrl && (
                                <div className="mt-2 text-sm">
                                    <a href={existingContratoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                        Ver contrato actual
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
                
                {error && <div className="text-red-500 bg-red-100 p-3 rounded-md text-sm">{error}</div>}

                <div className="flex justify-end space-x-4 mt-8">
                    <button type="button" onClick={() => navigate(-1)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition duration-150">
                        Cancelar
                    </button>
                    <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-150 disabled:bg-indigo-300">
                        {loading ? 'Guardando...' : 'Guardar Proveedor'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProveedorFormPage;