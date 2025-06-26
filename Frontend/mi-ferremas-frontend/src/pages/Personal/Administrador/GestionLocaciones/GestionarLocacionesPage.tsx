import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../../../../services/api';
import { Link } from 'react-router-dom';

interface Sucursal {
  id: number;
  nombre: string;
  direccion: string;
      region: number | null; // ID de la región
      region_nombre?: string;
      comuna: number | null; // ID de la comuna
      comuna_nombre?: string;
  // otros campos que devuelva tu SucursalSerializer
}

interface Bodega {
  id: number;
  // nombre: string; // El nombre vendrá del tipo de bodega o será la dirección
  sucursal: number | null; // ID de la sucursal
  sucursal_nombre?: string; // Nombre de la sucursal (opcional, si el serializer lo incluye)
  tipo_bodega: number; // ID del TipoBodega
  tipo_bodega_tipo?: string; // Nombre del TipoBodega
  direccion: string;
}

interface Region {
  id: number;
  nombre: string;
}

interface Comuna {
  id: number;
  nombre: string;
  region: number; // ID de la región a la que pertenece
}

interface TipoBodega {
  id: number;
  tipo: string;
}

const GestionarLocacionesPage: React.FC = () => {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null); // Errores específicos del formulario

  // Estados para el formulario de Sucursal
  const [editingSucursal, setEditingSucursal] = useState<Sucursal | null>(null);
  const [sucursalFormData, setSucursalFormData] = useState({
    nombre: '',
    direccion: '',
    region: '', // ID de la región
    comuna: '', // ID de la comuna
  });

  // Estados para el formulario de Bodega
  const [editingBodega, setEditingBodega] = useState<Bodega | null>(null);
  const [bodegaFormData, setBodegaFormData] = useState({
    sucursal: '', // ID de la sucursal (string para el input, se parseará)
    tipo_bodega: '', // ID del TipoBodega
    direccion: '',
  });

  const [regiones, setRegiones] = useState<Region[]>([]);
  const [comunas, setComunas] = useState<Comuna[]>([]);
  const [tiposBodega, setTiposBodega] = useState<TipoBodega[]>([]);
  const [filteredComunas, setFilteredComunas] = useState<Comuna[]>([]);

  // Estado para controlar qué formulario está activo
  const [activeForm, setActiveForm] = useState<null | 'createSucursal' | 'editSucursal' | 'createBodega' | 'editBodega'>(null);

  const resetSucursalForm = () => {
    setEditingSucursal(null);
    setSucursalFormData({ nombre: '', direccion: '', region: '', comuna: '' });
    setFormError(null);
    setActiveForm(null); // Volver a la lista
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sucursalesRes, bodegasRes, regionesRes, comunasRes, tiposBodegaRes] = await Promise.all([
        apiClient.get<Sucursal[]>('/sucursales/sucursales/'),
        apiClient.get<Bodega[]>('/sucursales/bodegas/'),
        apiClient.get<Region[]>('/ubicaciones/regiones/'), // Ajusta este endpoint
        apiClient.get<Comuna[]>('/ubicaciones/comunas/'),   // Ajusta este endpoint
        apiClient.get<TipoBodega[]>('/sucursales/tipos-bodega/'), // Endpoint para Tipos de Bodega
      ]);
      setSucursales(sucursalesRes.data);
      setBodegas(bodegasRes.data);
      setRegiones(regionesRes.data);
      setComunas(comunasRes.data); // Guardamos todas las comunas inicialmente
      setTiposBodega(tiposBodegaRes.data);
    } catch (err: any) {
      console.error("Error al cargar locaciones:", err);
      setError(err.response?.data?.detail || "No se pudieron cargar las locaciones.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtrar comunas cuando cambia la región seleccionada en el formulario de sucursal
  useEffect(() => {
    if (sucursalFormData.region) {
      setFilteredComunas(comunas.filter(c => c.region === parseInt(sucursalFormData.region)));
    } else {
      setFilteredComunas([]);
    }
  }, [sucursalFormData.region, comunas]);

  const handleSucursalFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSucursalFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'region') { // Si cambia la región, reseteamos la comuna
      setSucursalFormData(prev => ({ ...prev, comuna: '' }));
    }
  };

  const handleSucursalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const url = editingSucursal
      ? `/sucursales/sucursales/${editingSucursal.id}/` // CORREGIDO
      : '/sucursales/sucursales/'; // CORREGIDO
    const method = editingSucursal ? 'patch' : 'post';
    const dataToSend = {
      nombre: sucursalFormData.nombre,
      direccion: sucursalFormData.direccion,
      region: sucursalFormData.region ? parseInt(sucursalFormData.region) : null,
      comuna: sucursalFormData.comuna ? parseInt(sucursalFormData.comuna) : null,
    };

    try {
      const response = await apiClient[method](url, dataToSend);

      // Si estamos creando una nueva sucursal y fue exitoso, crear su InventarioSucursal
      if (method === 'post' && response.data && response.data.id) {
        const nuevaSucursalId = response.data.id;
        try {
          await apiClient.post('/inventario/inventarios-sucursal/', { sucursal: nuevaSucursalId });
          // Opcional: notificar al usuario que el inventario general también se creó.
        } catch (invError: any) {
          // Si falla la creación del InventarioSucursal, es importante notificarlo.
          // Podrías mostrar un error adicional o loggearlo.
          // El formulario de sucursal ya se reseteó, pero la sucursal se creó.
          console.error("Error al crear InventarioSucursal para la nueva sucursal:", invError.response?.data);
          setFormError(prevError => `${prevError || ''} (Advertencia: No se pudo crear el inventario general para la nueva sucursal: ${invError.response?.data?.sucursal || invError.response?.data?.detail || 'Error desconocido'})`);
        }
      }

      resetSucursalForm();
      fetchData(); // Recargar datos
    } catch (err: any) {
      console.error("Error al guardar sucursal:", err.response?.data);
      setFormError(err.response?.data?.detail || err.response?.data?.nombre?.[0] || "Error al guardar la sucursal.");
    }
  };

  const handleEditSucursal = (sucursal: Sucursal) => {
    setEditingSucursal(sucursal);
    setSucursalFormData({ 
      nombre: sucursal.nombre, 
      direccion: sucursal.direccion,
      region: sucursal.region?.toString() || '',
      comuna: sucursal.comuna?.toString() || ''
    });
    setActiveForm('editSucursal');
    setFormError(null);
  };

  const handleDeleteSucursal = async (id: number) => {
    if (window.confirm("¿Seguro que quieres eliminar esta sucursal? Esto podría afectar a las bodegas asociadas.")) {
      try {
        await apiClient.delete(`/sucursales/sucursales/${id}/`);
        fetchData();
      } catch (err: any) {
        console.error("Error al eliminar sucursal:", err);
        alert(err.response?.data?.detail || "Error al eliminar la sucursal.");
      }
    }
  };

  // --- Lógica para Bodegas ---
  const resetBodegaForm = () => {
    setEditingBodega(null);
    setBodegaFormData({ sucursal: '', tipo_bodega: '', direccion: '' });
    setFormError(null);
    setActiveForm(null); // Volver a la lista
  };

  const handleBodegaFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setBodegaFormData({ ...bodegaFormData, [e.target.name]: e.target.value });
  };

  const handleBodegaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const dataToSend = {
      // Si sucursal es una cadena vacía, enviar null, sino parsear a número
      sucursal: bodegaFormData.sucursal ? parseInt(bodegaFormData.sucursal) : null,
      tipo_bodega: bodegaFormData.tipo_bodega ? parseInt(bodegaFormData.tipo_bodega) : null,
      direccion: bodegaFormData.direccion,
    };

    const url = editingBodega
      ? `/sucursales/bodegas/${editingBodega.id}/` // CORREGIDO
      : '/sucursales/bodegas/'; // CORREGIDO
    const method = editingBodega ? 'patch' : 'post';

    try {
      await apiClient[method](url, dataToSend);
      resetBodegaForm();
      fetchData();
    } catch (err: any) {
      console.error("Error al guardar bodega:", err.response?.data);
      setFormError(err.response?.data?.detail || err.response?.data?.nombre?.[0] || "Error al guardar la bodega.");
    }
  };

  const handleEditBodega = (bodega: Bodega) => {
    setEditingBodega(bodega);
    setBodegaFormData({
      sucursal: bodega.sucursal?.toString() || '',
      tipo_bodega: bodega.tipo_bodega?.toString() || '',
      direccion: bodega.direccion || '',
    });
    setActiveForm('editBodega');
    setFormError(null);
  };

  const handleDeleteBodega = async (id: number) => {
    if (window.confirm("¿Seguro que quieres eliminar esta bodega?")) {
      try {
        await apiClient.delete(`/sucursales/bodegas/${id}/`); // CORREGIDO
        fetchData();
      } catch (err: any) {
        console.error("Error al eliminar bodega:", err);
        alert(err.response?.data?.detail || "Error al eliminar la bodega.");
      }
    }
  };

  // Ordenar sucursales por región y luego por comuna
  const sortedSucursales = useMemo(() => {
    return [...sucursales].sort((a, b) => {
      const regionA = a.region_nombre || '';
      const regionB = b.region_nombre || '';
      if (regionA.localeCompare(regionB) !== 0) {
        return regionA.localeCompare(regionB);
      }
      const comunaA = a.comuna_nombre || '';
      const comunaB = b.comuna_nombre || '';
      return comunaA.localeCompare(comunaB);
    });
  }, [sucursales]);

  // Ordenar bodegas por nombre de sucursal
  const sortedBodegas = useMemo(() => {
    return [...bodegas].sort((a, b) =>
      (a.sucursal_nombre || '').localeCompare(b.sucursal_nombre || '')
    );
  }, [bodegas]);

  // Agrupar sucursales por región y luego por comuna para la visualización
  const groupedSucursales = useMemo(() => {
    const groups: Record<string, Record<string, Sucursal[]>> = {};
    sortedSucursales.forEach(sucursal => {
      const regionName = sucursal.region_nombre || 'Región Desconocida';
      const comunaName = sucursal.comuna_nombre || 'Comuna Desconocida';

      if (!groups[regionName]) {
        groups[regionName] = {};
      }
      if (!groups[regionName][comunaName]) {
        groups[regionName][comunaName] = [];
      }
      groups[regionName][comunaName].push(sucursal);
    });
    return groups;
  }, [sortedSucursales]);

  // Agrupar bodegas por sucursal para la visualización
  const groupedBodegas = useMemo(() => {
    const groups: Record<string, Bodega[]> = {};
    sortedBodegas.forEach(bodega => {
      const sucursalName = bodega.sucursal_nombre || 'Bodegas Independientes (Sin Sucursal Asignada)';
      if (!groups[sucursalName]) {
        groups[sucursalName] = [];
      }
      groups[sucursalName].push(bodega);
    });
    return groups;
  }, [sortedBodegas]);



  if (loading) return <p className="text-center py-4">Cargando locaciones...</p>;
  if (error) return <p className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">Error: {error}</p>;

  return (
    <div className="container mx-auto p-4">
      <Link to="/personal/admin/dashboard" className="text-blue-600 hover:underline mb-6 inline-block">&larr; Volver al Dashboard de Admin</Link>
      <h1 className="text-2xl font-bold mb-6">Gestionar Sucursales y Bodegas</h1>

      {activeForm === null && (
        <>
          {/* Sección Lista de Sucursales */}
          <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Sucursales</h2>
              <button 
                onClick={() => { setEditingSucursal(null); setSucursalFormData({ nombre: '', direccion: '', region: '', comuna: ''}); setActiveForm('createSucursal'); setFormError(null);}}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
              >
                + Nueva Sucursal
              </button>
            </div>
            {Object.keys(groupedSucursales).length > 0 ? (
              Object.entries(groupedSucursales).map(([regionName, comunasEnRegion]) => (
                <div key={regionName} className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-700 border-b pb-1 mb-2">{regionName}</h3>
                  {Object.entries(comunasEnRegion).map(([comunaName, sucursalesEnComuna]) => (
                    <div key={comunaName} className="ml-4 mb-4">
                      <h4 className="text-md font-medium text-gray-600 mb-1">{comunaName}</h4>
                      <ul className="divide-y divide-gray-200">
                        {sucursalesEnComuna.map(s => (
                          <li key={s.id} className="py-3 flex justify-between items-center">
                            <div>
                              <p className="font-medium">{s.nombre}</p>
                              <p className="text-sm text-gray-500">
                                {s.direccion}
                              </p>
                            </div>
                            <div>
                              <button onClick={() => handleEditSucursal(s)} className="text-indigo-600 hover:text-indigo-900 mr-3 text-sm">Editar</button>
                              <button onClick={() => handleDeleteSucursal(s.id)} className="text-red-600 hover:text-red-900 text-sm">Eliminar</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))
            ) : <p>No hay sucursales registradas.</p>}
          </div>

          {/* Sección Lista de Bodegas */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Bodegas</h2>
              <button 
                onClick={() => { setEditingBodega(null); setBodegaFormData({ sucursal: '', tipo_bodega: '', direccion: ''}); setActiveForm('createBodega'); setFormError(null);}}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
              >
                + Nueva Bodega
              </button>
            </div>
            {Object.keys(groupedBodegas).length > 0 ? (
              Object.entries(groupedBodegas).map(([sucursalName, bodegasEnSucursal]) => (
                <div key={sucursalName} className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-700 border-b pb-1 mb-2">{sucursalName}</h3>
                  <ul className="divide-y divide-gray-200 ml-4">
                    {bodegasEnSucursal.map(b => (
                      <li key={b.id} className="py-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium">
                            {b.tipo_bodega_tipo ? `Tipo: ${b.tipo_bodega_tipo}` : `Bodega ID: ${b.id}`}
                          </p>
                          <p className="text-sm text-gray-500">
                            Dirección: {b.direccion}
                          </p>
                        </div>
                        <div>
                          <button onClick={() => handleEditBodega(b)} className="text-indigo-600 hover:text-indigo-900 mr-3 text-sm">Editar</button>
                          <button onClick={() => handleDeleteBodega(b.id)} className="text-red-600 hover:text-red-900 text-sm">Eliminar</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : <p>No hay bodegas registradas.</p>}
          </div>
        </>
      )}

      {/* Formulario para Sucursal (Crear o Editar) */}
      {(activeForm === 'createSucursal' || activeForm === 'editSucursal') && (
        <div className="my-8 p-6 border border-gray-200 rounded-lg bg-gray-50 shadow-md">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              {activeForm === 'editSucursal' ? 'Editar Sucursal' : 'Nueva Sucursal'}
            </h3>
            {formError && <p className="text-red-500 text-sm mb-3">{formError}</p>}
            <form onSubmit={handleSucursalSubmit}>
              <div className="mb-4">
                <label htmlFor="nombreSucursal" className="block text-sm font-medium text-gray-700">Nombre:</label>
                <input type="text" name="nombre" id="nombreSucursal" value={sucursalFormData.nombre} onChange={handleSucursalFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
              </div>
              <div className="mb-4">
                <label htmlFor="direccionSucursal" className="block text-sm font-medium text-gray-700">Dirección:</label>
                <input type="text" name="direccion" id="direccionSucursal" value={sucursalFormData.direccion} onChange={handleSucursalFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
          </div>
          <div className="mb-4">
            <label htmlFor="regionSucursal" className="block text-sm font-medium text-gray-700">Región:</label>
                <select name="region" id="regionSucursal" value={sucursalFormData.region} onChange={handleSucursalFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              <option value="">Seleccione una región</option>
              {regiones.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="comunaSucursal" className="block text-sm font-medium text-gray-700">Comuna:</label>
                <select name="comuna" id="comunaSucursal" value={sucursalFormData.comuna} onChange={handleSucursalFormChange} disabled={!sucursalFormData.region} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100">
              <option value="">Seleccione una comuna</option>
              {filteredComunas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
              </div>
              <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">Guardar</button>
                <button type="button" onClick={() => setActiveForm(null)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm">Cancelar</button>
              </div>
            </form>
          </div>
      )}

      {/* Formulario para Bodega (Crear o Editar) */}
      {(activeForm === 'createBodega' || activeForm === 'editBodega') && (
        <div className="my-8 p-6 border border-gray-200 rounded-lg bg-gray-50 shadow-md">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              {activeForm === 'editBodega' ? 'Editar Bodega' : 'Nueva Bodega'}
            </h3>
            {formError && <p className="text-red-500 text-sm mb-3">{formError}</p>}
            <form onSubmit={handleBodegaSubmit}>
            <div className="mb-4">
                <label htmlFor="direccionBodega" className="block text-sm font-medium text-gray-700">Dirección:</label>
                <input type="text" name="direccion" id="direccionBodega" value={bodegaFormData.direccion} onChange={handleBodegaFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
              </div>
              <div className="mb-4">
                <label htmlFor="tipoBodega" className="block text-sm font-medium text-gray-700">Tipo de Bodega:</label>
                <select name="tipo_bodega" id="tipoBodega" value={bodegaFormData.tipo_bodega} onChange={handleBodegaFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  <option value="">Seleccione un tipo</option>
                  {tiposBodega.map(tb => <option key={tb.id} value={tb.id}>{tb.tipo}</option>)}
                </select>
              </div>
              <div className="mb-4">
                <label htmlFor="sucursalBodega" className="block text-sm font-medium text-gray-700">Sucursal (Opcional):</label>
                <select name="sucursal" id="sucursalBodega" value={bodegaFormData.sucursal} onChange={handleBodegaFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  <option value="">Sin sucursal asignada</option>
                  {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">Guardar</button>
                <button type="button" onClick={() => setActiveForm(null)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm">Cancelar</button>
              </div>
            </form>
          </div>
      )}

    </div>
  );
};

export default GestionarLocacionesPage;