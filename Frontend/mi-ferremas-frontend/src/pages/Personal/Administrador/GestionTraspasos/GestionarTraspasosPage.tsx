import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../../../../services/api';
import { Link } from 'react-router-dom';

// Definición local de interfaces si no existe un archivo central de modelos
interface Producto {
  id: number;
  nombre: string;
  // Agrega otros campos relevantes de Producto si los necesitas aquí
}
interface Sucursal {
  id: number;
  nombre: string;
  // Agrega otros campos relevantes de Sucursal si los necesitas aquí
}
interface Bodega {
  id: number;
  direccion: string; // o un nombre más descriptivo
  tipo_bodega_tipo?: string;
  sucursal: number | null; // ID de la sucursal a la que pertenece
  // Agrega otros campos relevantes de Bodega si los necesitas aquí
}
// Interfaces específicas para Traspasos (pueden estar en el archivo de modelos también)
interface DetalleTraspasoStock {
  id?: number;
  producto: number;
  producto_nombre?: string;
  cantidad_solicitada: number;
  cantidad_enviada?: number | null;
  cantidad_recibida?: number | null;
  bodega_origen: number;
  bodega_origen_nombre?: string;
  bodega_destino: number;
  bodega_destino_nombre?: string;
}

interface TraspasoInternoStock {
  id: number;
  sucursal_origen: number;
  sucursal_origen_nombre?: string;
  sucursal_destino: number;
  sucursal_destino_nombre?: string;
  fecha_pedido: string;
  estado: 'PENDIENTE' | 'EN_TRANSITO' | 'RECIBIDO_PENDIENTE_VERIFICACION' | 'COMPLETADO' | 'CANCELADO';
  motivo: string;
  comentarios?: string | null;
  fecha_envio?: string | null;
  fecha_recepcion?: string | null;
  creado_por?: number;
  creado_por_detalle?: { email: string }; // Ajusta según tu UserSerializer
  pedido_cliente_origen?: number | null;
  detalles_traspaso: DetalleTraspasoStock[];
}

interface CreateTraspasoDetalleFormItem {
  producto: string;
  cantidad_solicitada: string;
  bodega_origen: string;
  bodega_destino: string;
}

interface CreateTraspasoFormData {
  sucursal_origen: string;
  sucursal_destino: string;
  motivo: string;
  comentarios: string;
  detalles_traspaso: Array<CreateTraspasoDetalleFormItem>;
}

const GestionarTraspasosPage: React.FC = () => {
  const [traspasos, setTraspasos] = useState<TraspasoInternoStock[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState<CreateTraspasoFormData>({
    sucursal_origen: '',
    sucursal_destino: '',
    motivo: '',
    comentarios: '',
    detalles_traspaso: [{ producto: '', cantidad_solicitada: '', bodega_origen: '', bodega_destino: '' }],
  });

  const [selectedTraspaso, setSelectedTraspaso] = useState<TraspasoInternoStock | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showUpdateStateModal, setShowUpdateStateModal] = useState(false);
  const [updateStateData, setUpdateStateData] = useState<{
    newState: TraspasoInternoStock['estado'] | '';
    detalles?: DetalleTraspasoStock[]; // Para enviar cantidades enviadas/recibidas
  }>({ newState: '' });


  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [traspasosRes, sucursalesRes, bodegasRes, productosRes] = await Promise.all([
        apiClient.get<TraspasoInternoStock[]>('/inventario/traspasos-internos/'),
        apiClient.get<Sucursal[]>('/sucursales/sucursales/'),
        apiClient.get<Bodega[]>('/sucursales/bodegas/'),
        apiClient.get<Producto[]>('/gestion-productos/productos/'),
      ]);
      setTraspasos(traspasosRes.data);
      setSucursales(sucursalesRes.data);
      setBodegas(bodegasRes.data);
      setProductos(productosRes.data);
    } catch (err: any) {
      console.error("Error al cargar datos de traspasos:", err);
      setError(err.response?.data?.detail || "No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Lógica para el Formulario de Creación ---
  const resetCreateForm = () => {
    setShowCreateModal(false);
    setCreateFormData({
      sucursal_origen: '',
      sucursal_destino: '',
      motivo: '',
      comentarios: '',
      detalles_traspaso: [{ producto: '', cantidad_solicitada: '', bodega_origen: '', bodega_destino: '' }],
    });
    setFormError(null);
  };

  const handleCreateFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCreateFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDetalleTraspasoChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const detalles = [...createFormData.detalles_traspaso];
    detalles[index] = { ...detalles[index], [name]: value };
    setCreateFormData(prev => ({ ...prev, detalles_traspaso: detalles }));
  };

  const addDetalleTraspaso = () => {
    setCreateFormData(prev => ({
      ...prev,
      detalles_traspaso: [...prev.detalles_traspaso, { producto: '', cantidad_solicitada: '', bodega_origen: '', bodega_destino: '' }],
    }));
  };

  const removeDetalleTraspaso = (index: number) => {
    const detalles = [...createFormData.detalles_traspaso];
    detalles.splice(index, 1);
    setCreateFormData(prev => ({ ...prev, detalles_traspaso: detalles }));
  };

  const handleCreateTraspasoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (createFormData.sucursal_origen === createFormData.sucursal_destino) {
      setFormError("La sucursal de origen y destino no pueden ser la misma.");
      return;
    }

    const payload = {
      ...createFormData,
      sucursal_origen: parseInt(createFormData.sucursal_origen),
      sucursal_destino: parseInt(createFormData.sucursal_destino),
      detalles_traspaso: createFormData.detalles_traspaso.map(d => ({
        producto: parseInt(d.producto),
        cantidad_solicitada: parseInt(d.cantidad_solicitada),
        bodega_origen: parseInt(d.bodega_origen),
        bodega_destino: parseInt(d.bodega_destino),
      })),
    };

    try {
      await apiClient.post('/inventario/traspasos-internos/', payload);
      resetCreateForm();
      fetchData();
    } catch (err: any) {
      console.error("Error al crear traspaso:", err.response?.data);
      setFormError(err.response?.data?.detail || JSON.stringify(err.response?.data) || "Error al crear el traspaso.");
    }
  };

  // --- Lógica para Ver Detalles y Actualizar Estado ---
  const openDetailModal = (traspaso: TraspasoInternoStock) => {
    setSelectedTraspaso(traspaso);
    setShowDetailModal(true);
  };

  const openUpdateStateModal = (traspaso: TraspasoInternoStock, newState: TraspasoInternoStock['estado']) => {
    setSelectedTraspaso(traspaso);
    // Pre-llenar detalles si es necesario para EN_TRANSITO o COMPLETADO
    let initialDetalles = traspaso.detalles_traspaso.map(d => ({ ...d }));
    if (newState === 'EN_TRANSITO') {
      initialDetalles = initialDetalles.map(d => ({ ...d, cantidad_enviada: d.cantidad_enviada ?? d.cantidad_solicitada }));
    } else if (newState === 'COMPLETADO') {
      initialDetalles = initialDetalles.map(d => ({ ...d, cantidad_recibida: d.cantidad_recibida ?? d.cantidad_enviada ?? d.cantidad_solicitada }));
    }
    setUpdateStateData({ newState, detalles: initialDetalles });
    setShowUpdateStateModal(true);
    setFormError(null);
  };

  const handleUpdateStateDetalleChange = (index: number, field: 'cantidad_enviada' | 'cantidad_recibida', value: string) => {
    if (updateStateData.detalles) {
      const newDetalles = [...updateStateData.detalles];
      newDetalles[index] = { ...newDetalles[index], [field]: value ? parseInt(value) : null };
      setUpdateStateData(prev => ({ ...prev, detalles: newDetalles }));
    }
  };

  const handleUpdateStateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTraspaso || !updateStateData.newState) return;
    setFormError(null);

    const payload: any = { estado: updateStateData.newState };

    if (updateStateData.newState === 'EN_TRANSITO' || updateStateData.newState === 'COMPLETADO') {
      payload.detalles_traspaso = updateStateData.detalles?.map(d => ({
        id: d.id, // Importante para que el backend sepa qué detalle actualizar
        // Si la cantidad es null (input vacío), enviar 0 para que el backend lo valide como <= 0.
        cantidad_enviada: updateStateData.newState === 'EN_TRANSITO' ? (d.cantidad_enviada ?? 0) : undefined,
        cantidad_recibida: updateStateData.newState === 'COMPLETADO' ? (d.cantidad_recibida ?? 0) : undefined,
        // No enviar bodegas aquí, ya que no se cambian en este flujo
      }));
    }
     // Para 'RECIBIDO_PENDIENTE_VERIFICACION' o 'CANCELADO', solo se envía el estado.

    try {
      await apiClient.patch(`/inventario/traspasos-internos/${selectedTraspaso.id}/`, payload);
      setShowUpdateStateModal(false);
      setSelectedTraspaso(null);
      setUpdateStateData({ newState: '' });
      fetchData();
    } catch (err: any) {
      let errorMessage = "Error al actualizar estado del traspaso."; // Default
      const errorData = err.response?.data;
      console.error("Error al actualizar estado del traspaso. Raw error data:", errorData);

      if (errorData) {
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        } else if (Array.isArray(errorData) && errorData.length > 0 && typeof errorData[0] === 'string') {
          errorMessage = errorData.join('; ');
        } else if (typeof errorData === 'object') {
          const fieldErrors = Object.entries(errorData)
            .map(([key, value]) => {
              const messages = Array.isArray(value) ? value.join(', ') : String(value);
              return `${key}: ${messages}`;
            })
            .join('; ');
          if (fieldErrors) errorMessage = fieldErrors;
          else errorMessage = JSON.stringify(errorData);
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      }
      console.error("Processed error message for UI:", errorMessage);
      setFormError(errorMessage);
    }
  };

  // --- Renderizado ---
  if (loading) return <p className="text-center py-4">Cargando traspasos...</p>;
  if (error) return <p className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">Error: {error}</p>;

  const getEstadoTraspasoClass = (estado: TraspasoInternoStock['estado']) => {
    switch (estado) {
      case 'PENDIENTE': return 'bg-yellow-200 text-yellow-800';
      case 'EN_TRANSITO': return 'bg-blue-200 text-blue-800';
      case 'RECIBIDO_PENDIENTE_VERIFICACION': return 'bg-orange-200 text-orange-800';
      case 'COMPLETADO': return 'bg-green-200 text-green-800';
      case 'CANCELADO': return 'bg-red-200 text-red-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  const getAvailableActions = (traspaso: TraspasoInternoStock) => {
    const actions = [];
    if (traspaso.estado === 'PENDIENTE') {
      actions.push({ label: 'Marcar Enviado', newState: 'EN_TRANSITO' as const });
      actions.push({ label: 'Cancelar', newState: 'CANCELADO' as const });
    } else if (traspaso.estado === 'EN_TRANSITO') {
      actions.push({ label: 'Confirmar Recepción (Verificar)', newState: 'RECIBIDO_PENDIENTE_VERIFICACION' as const });
      // Podría haber una opción de cancelar si la lógica de negocio lo permite
    } else if (traspaso.estado === 'RECIBIDO_PENDIENTE_VERIFICACION') {
      actions.push({ label: 'Completar Traspaso', newState: 'COMPLETADO' as const });
      // Podría haber una opción de reportar discrepancia o cancelar
    }
    return actions;
  };

  const filteredBodegas = (sucursalId: string | number, tipo?: 'origen' | 'destino') => {
    if (!sucursalId) return [];
    return bodegas.filter(b => b.sucursal === parseInt(sucursalId.toString()));
    // Podrías añadir lógica para no permitir seleccionar la misma bodega si origen y destino son la misma sucursal
  };

  return (
    <div className="container mx-auto p-4">
      <Link to="/personal/admin/dashboard" className="text-blue-600 hover:underline mb-6 inline-block">&larr; Volver al Dashboard</Link>
      <h1 className="text-2xl font-bold mb-2">Gestionar Traspasos Internos de Stock</h1>

      <div className="mb-6 flex justify-end">
        <button
          onClick={() => { resetCreateForm(); setShowCreateModal(true); }}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
        >
          + Nuevo Traspaso Manual
        </button>
      </div>

      {/* Modal de Creación de Traspaso */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-start py-10">
          <div className="relative mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
            <h3 className="text-xl font-medium leading-6 text-gray-900 mb-4">Nuevo Traspaso Interno</h3>
            {formError && <p className="text-red-500 text-sm mb-3 bg-red-100 p-2 rounded">{formError}</p>}
            <form onSubmit={handleCreateTraspasoSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sucursal_origen" className="block text-sm font-medium text-gray-700">Sucursal Origen:</label>
                  <select name="sucursal_origen" id="sucursal_origen" value={createFormData.sucursal_origen} onChange={handleCreateFormChange} required className="mt-1 block w-full input-form">
                    <option value="">Seleccione sucursal origen</option>
                    {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="sucursal_destino" className="block text-sm font-medium text-gray-700">Sucursal Destino:</label>
                  <select name="sucursal_destino" id="sucursal_destino" value={createFormData.sucursal_destino} onChange={handleCreateFormChange} required className="mt-1 block w-full input-form">
                    <option value="">Seleccione sucursal destino</option>
                    {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="motivo" className="block text-sm font-medium text-gray-700">Motivo:</label>
                <select name="motivo" id="motivo" value={createFormData.motivo} onChange={handleCreateFormChange} required className="mt-1 block w-full input-form">
                  <option value="">Seleccione un motivo</option>
                  {/* Estos deben coincidir con TraspasoInternoStock.MotivoTraspaso.choices */}
                  <option value="REABASTECIMIENTO">Reabastecimiento</option>
                  <option value="TRASPASO_DIRECTO">Traspaso Directo</option>
                  <option value="PARA_COMPLETAR_PEDIDO">Para Completar Pedido Cliente</option>
                  <option value="AJUSTE_INVENTARIO">Ajuste de Inventario</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div>
                <label htmlFor="comentarios" className="block text-sm font-medium text-gray-700">Comentarios:</label>
                <textarea name="comentarios" id="comentarios" value={createFormData.comentarios} onChange={handleCreateFormChange} rows={2} className="mt-1 block w-full input-form"/>
              </div>

              <h4 className="text-md font-semibold mt-6 mb-2 border-t pt-4">Detalles del Traspaso</h4>
              {createFormData.detalles_traspaso.map((detalle, index) => (
                <div key={index} className="p-3 border rounded-md space-y-3 mb-3 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor={`producto-${index}`} className="block text-xs font-medium text-gray-700">Producto:</label>
                      <select name="producto" id={`producto-${index}`} value={detalle.producto} onChange={e => handleDetalleTraspasoChange(index, e)} required className="mt-1 block w-full input-form-sm">
                        <option value="">Seleccione producto</option>
                        {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`cantidad_solicitada-${index}`} className="block text-xs font-medium text-gray-700">Cant. Solicitada:</label>
                      <input type="number" name="cantidad_solicitada" id={`cantidad_solicitada-${index}`} value={detalle.cantidad_solicitada} onChange={e => handleDetalleTraspasoChange(index, e)} required min="1" className="mt-1 block w-full input-form-sm"/>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     <div>
                        <label htmlFor={`bodega_origen-${index}`} className="block text-xs font-medium text-gray-700">Bodega Origen:</label>
                        <select name="bodega_origen" id={`bodega_origen-${index}`} value={detalle.bodega_origen} onChange={e => handleDetalleTraspasoChange(index, e)} required className="mt-1 block w-full input-form-sm" disabled={!createFormData.sucursal_origen}>
                            <option value="">Seleccione bodega origen</option>
                            {filteredBodegas(createFormData.sucursal_origen).map(b => <option key={b.id} value={b.id}>{b.tipo_bodega_tipo} ({b.direccion})</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor={`bodega_destino-${index}`} className="block text-xs font-medium text-gray-700">Bodega Destino:</label>
                        <select name="bodega_destino" id={`bodega_destino-${index}`} value={detalle.bodega_destino} onChange={e => handleDetalleTraspasoChange(index, e)} required className="mt-1 block w-full input-form-sm" disabled={!createFormData.sucursal_destino}>
                            <option value="">Seleccione bodega destino</option>
                            {filteredBodegas(createFormData.sucursal_destino).map(b => <option key={b.id} value={b.id}>{b.tipo_bodega_tipo} ({b.direccion})</option>)}
                        </select>
                    </div>
                  </div>
                  {createFormData.detalles_traspaso.length > 1 && (
                    <button type="button" onClick={() => removeDetalleTraspaso(index)} className="text-red-500 hover:text-red-700 text-xs">Eliminar Ítem</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addDetalleTraspaso} className="text-blue-500 hover:text-blue-700 text-sm">+ Añadir Otro Producto</button>

              <div className="mt-6 flex items-center justify-end gap-x-6 border-t pt-4">
                <button type="button" onClick={resetCreateForm} className="text-sm font-semibold leading-6 text-gray-900">Cancelar</button>
                <button type="submit" className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600">
                  Crear Traspaso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Actualización de Estado */}
      {showUpdateStateModal && selectedTraspaso && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-start py-10">
          <div className="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <h3 className="text-xl font-medium leading-6 text-gray-900 mb-4">
              Actualizar Estado Traspaso ID: {selectedTraspaso.id} <br/>
              <span className="text-md">Nuevo Estado: <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEstadoTraspasoClass(updateStateData.newState as TraspasoInternoStock['estado'])}`}>{updateStateData.newState}</span></span>
            </h3>
            {formError && <p className="text-red-500 text-sm mb-3 bg-red-100 p-2 rounded">{formError}</p>}
            <form onSubmit={handleUpdateStateSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {(updateStateData.newState === 'EN_TRANSITO' || updateStateData.newState === 'COMPLETADO') && updateStateData.detalles && (
                <div>
                  <h4 className="text-md font-semibold mb-2">Confirmar Cantidades:</h4>
                  {updateStateData.detalles.map((detalle, index) => (
                    <div key={detalle.id || index} className="p-3 border rounded-md mb-2 bg-gray-50 grid grid-cols-2 gap-4 items-center">
                      <p className="text-sm">
                        {detalle.producto_nombre || productos.find(p=>p.id === detalle.producto)?.nombre} <br/>
                        <span className="text-xs text-gray-500">Solicitado: {detalle.cantidad_solicitada}</span>
                        {updateStateData.newState === 'COMPLETADO' && <span className="text-xs text-gray-500"> / Enviado: {detalle.cantidad_enviada ?? 'N/A'}</span>}
                      </p>
                      {updateStateData.newState === 'EN_TRANSITO' && (
                        <div>
                          <label htmlFor={`cantidad_enviada_update-${index}`} className="block text-xs font-medium text-gray-700">Cant. Enviada:</label>
                          <input
                            type="number"
                            id={`cantidad_enviada_update-${index}`}
                            value={detalle.cantidad_enviada ?? ''}
                            onChange={e => handleUpdateStateDetalleChange(index, 'cantidad_enviada', e.target.value)}
                            min="1" // Requerir al menos 1
                            max={detalle.cantidad_solicitada} // No enviar más de lo solicitado
                            required
                            className="mt-1 block w-full input-form-sm"
                          />
                        </div>
                      )}
                      {updateStateData.newState === 'COMPLETADO' && (
                         <div>
                          <label htmlFor={`cantidad_recibida_update-${index}`} className="block text-xs font-medium text-gray-700">Cant. Recibida:</label>
                          <input
                            type="number"
                            id={`cantidad_recibida_update-${index}`}
                            value={detalle.cantidad_recibida ?? ''}
                            onChange={e => handleUpdateStateDetalleChange(index, 'cantidad_recibida', e.target.value)}
                            min="1" // Requerir al menos 1
                            max={detalle.cantidad_enviada ?? detalle.cantidad_solicitada} // No recibir más de lo enviado (o solicitado si enviado es null)
                            required
                            className="mt-1 block w-full input-form-sm"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6 flex items-center justify-end gap-x-6 border-t pt-4">
                <button type="button" onClick={() => { setShowUpdateStateModal(false); setSelectedTraspaso(null); setUpdateStateData({newState:''}); }} className="text-sm font-semibold leading-6 text-gray-900">Cancelar</button>
                <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                  Confirmar Actualización
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalles del Traspaso */}
      {showDetailModal && selectedTraspaso && (
         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-start py-10">
          <div className="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-medium text-gray-900">Detalle Traspaso ID: {selectedTraspaso.id}</h3>
                <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                    <span className="text-2xl">&times;</span>
                </button>
            </div>
            <div className="space-y-3 text-sm max-h-[70vh] overflow-y-auto pr-2">
                <p><strong>Origen:</strong> {selectedTraspaso.sucursal_origen_nombre}</p>
                <p><strong>Destino:</strong> {selectedTraspaso.sucursal_destino_nombre}</p>
                <p><strong>Fecha Pedido:</strong> {new Date(selectedTraspaso.fecha_pedido).toLocaleString()}</p>
                <p><strong>Estado:</strong> <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEstadoTraspasoClass(selectedTraspaso.estado)}`}>{selectedTraspaso.estado}</span></p>
                <p><strong>Motivo:</strong> {selectedTraspaso.motivo}</p>
                {selectedTraspaso.comentarios && <p><strong>Comentarios:</strong> {selectedTraspaso.comentarios}</p>}
                {selectedTraspaso.fecha_envio && <p><strong>Fecha Envío:</strong> {new Date(selectedTraspaso.fecha_envio).toLocaleString()}</p>}
                {selectedTraspaso.fecha_recepcion && <p><strong>Fecha Recepción:</strong> {new Date(selectedTraspaso.fecha_recepcion).toLocaleString()}</p>}
                {selectedTraspaso.creado_por_detalle && <p><strong>Creado Por:</strong> {selectedTraspaso.creado_por_detalle.email}</p>}
                {selectedTraspaso.pedido_cliente_origen && <p className="text-blue-600">Traspaso automático por Pedido Cliente ID: {selectedTraspaso.pedido_cliente_origen}</p>}
                
                <h4 className="text-md font-semibold mt-4 pt-2 border-t">Productos en Traspaso:</h4>
                <ul className="list-disc pl-5 space-y-1">
                    {selectedTraspaso.detalles_traspaso.map(d => (
                        <li key={d.id || d.producto}>
                            {d.producto_nombre || productos.find(p=>p.id === d.producto)?.nombre}: 
                            Sol: {d.cantidad_solicitada} / 
                            Env: {d.cantidad_enviada ?? 'N/A'} / 
                            Rec: {d.cantidad_recibida ?? 'N/A'} <br/>
                            <span className="text-xs text-gray-500">Bod. Origen: {d.bodega_origen_nombre || bodegas.find(b=>b.id === d.bodega_origen)?.direccion}</span> <br/>
                            <span className="text-xs text-gray-500">Bod. Destino: {d.bodega_destino_nombre || bodegas.find(b=>b.id === d.bodega_destino)?.direccion}</span>
                        </li>
                    ))}
                </ul>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Traspasos */}
      <div className="bg-white p-6 rounded-lg shadow-md mt-4">
        <h2 className="text-xl font-semibold mb-4">Historial de Traspasos</h2>
        {traspasos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origen</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destino</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Pedido</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motivo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {traspasos.map(t => (
                  <tr key={t.id} className={`${t.pedido_cliente_origen ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.id}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{t.sucursal_origen_nombre}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{t.sucursal_destino_nombre}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(t.fecha_pedido).toLocaleDateString()}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoTraspasoClass(t.estado)}`}>
                        {t.estado}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{t.motivo}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <button onClick={() => openDetailModal(t)} className="text-blue-600 hover:text-blue-800 mr-3">Detalles</button>
                      {getAvailableActions(t).map(action => (
                        <button 
                          key={action.newState}
                          onClick={() => openUpdateStateModal(t, action.newState)} 
                          className="text-indigo-600 hover:text-indigo-800 mr-2 text-xs"
                        >
                          {action.label}
                        </button>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>No hay traspasos registrados.</p>}
      </div>
       {/* Input form styles (si no están globales) */}
       <style>{`
        .input-form { @apply mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm; }
        .input-form-sm { @apply mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-xs; }
      `}</style>
    </div>
  );
};

export default GestionarTraspasosPage;