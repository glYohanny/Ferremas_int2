import React, { useState, useEffect, useCallback,useMemo } from 'react';
import apiClient from '../../../../services/api';
import { Link } from 'react-router-dom';

interface Producto {
  id: number;
  nombre: string;
}

interface Bodega {
  id: number;
  nombre: string; // O el campo que uses para el nombre visible, ej: direccion o tipo_bodega_tipo
  direccion: string;
  tipo_bodega_tipo?: string;
  sucursal_nombre?: string;
  sucursal: number | null; // ID de la sucursal a la que pertenece la bodega
}
interface InventarioSucursal {
  id: number;
  sucursal: number; // ID de la sucursal
  sucursal_nombre?: string;
}

interface DetalleInventarioBodega {
  id: number;
  producto: number; // ID
  producto_nombre?: string;
  bodega: number; // ID
  bodega_info?: Bodega; // Objeto Bodega completo si el serializer lo anida
  cantidad: number;
  inventario_sucursal?: number; // ID del InventarioSucursal, si el serializer lo devuelve
  stock_minimo: number | null;
  stock_maximo: number | null;
  ultima_actualizacion?: string;
}

// Para el formulario de edición
interface StockEditFormData {
  cantidad: string; // Usar string para el input, luego parsear
  stock_minimo?: string;
  stock_maximo?: string;
}

// Para el formulario de creación
interface StockCreateFormData {
  producto: string;
  bodega: string;
  cantidad: string;
  stock_minimo?: string;
  stock_maximo?: string;
  // inventario_sucursal se determinará programáticamente
}

const GestionarStockPage: React.FC = () => {
  const [stockItems, setStockItems] = useState<DetalleInventarioBodega[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]); // Para mostrar nombres de productos
  const [bodegas, setBodegas] = useState<Bodega[]>([]); // Para mostrar nombres de bodegas
  const [inventariosSucursal, setInventariosSucursal] = useState<InventarioSucursal[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingStockItem, setEditingStockItem] = useState<DetalleInventarioBodega | null>(null);
  const [stockFormData, setStockFormData] = useState<StockEditFormData>({
    cantidad: '',
    stock_minimo: '',
    stock_maximo: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStockFormData, setCreateStockFormData] = useState<StockCreateFormData>({
    producto: '',
    bodega: '',
    cantidad: '',
    stock_minimo: '',
    stock_maximo: '',
  });

  // Estados para la carga masiva desde Excel
  const [selectedExcelFile, setSelectedExcelFile] = useState<File | null>(null);
  const [excelUploadMessage, setExcelUploadMessage] = useState<string | null>(null);
  const [excelUploadErrors, setExcelUploadErrors] = useState<string[] | null>(null);


  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Endpoint según tu api_root: 'detalles_inventario_bodega': reverse('inventario_app:detalleinventariobodega-list', request=request)
      // Asumiendo que el router lo convierte a 'detalleinventariobodega'
      const [
        stockRes,
        productosRes,
        bodegasRes,
        inventariosSucursalRes
      ] = await Promise.all([
        apiClient.get<DetalleInventarioBodega[]>('/inventario/detalles-inventario-bodega/'),
        apiClient.get<Producto[]>('/gestion-productos/productos/'), // Siempre cargar para select de creación
        apiClient.get<Bodega[]>('/sucursales/bodegas/'), // Siempre cargar para select de creación
        apiClient.get<InventarioSucursal[]>('/inventario/inventarios-sucursal/') // Cargar inventarios de sucursal
      ]);
      
      setStockItems(stockRes.data);
      setProductos(productosRes.data);
      setBodegas(bodegasRes.data);
      setInventariosSucursal(inventariosSucursalRes.data);

      // Lógica de carga condicional (si los datos no vienen anidados) - puedes mantenerla o simplificarla
      // if (stockRes.data.length > 0 && !stockRes.data[0].producto_nombre) { setProductos(productosRes.data); }
      // if (stockRes.data.length > 0 && !stockRes.data[0].bodega_info) { setBodegas(bodegasRes.data); }
      // setInventariosSucursal(inventariosSucursalRes.data);
      
    } catch (err: any) {
      console.error("Error al cargar datos de stock:", err);
      setError(err.response?.data?.detail || "No se pudieron cargar los datos de stock.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getProductoNombre = (productoId: number): string => {
    const producto = productos.find(p => p.id === productoId);
    return producto ? producto.nombre : `ID: ${productoId}`;
  };

  const getBodegaNombre = (bodegaId: number): string => {
    const bodega = bodegas.find(b => b.id === bodegaId);
    return bodega ? (bodega.tipo_bodega_tipo ? `${bodega.tipo_bodega_tipo} - ${bodega.direccion}` : bodega.direccion) : `ID: ${bodegaId}`;
  };


  const handleEditStockItem = (item: DetalleInventarioBodega) => {
    setEditingStockItem(item);
    setStockFormData({
      cantidad: item.cantidad.toString(),
      stock_minimo: item.stock_minimo?.toString() || '',
      stock_maximo: item.stock_maximo?.toString() || '',
    });
    setFormError(null);
  };

  const resetCreateStockForm = () => {
    setShowCreateModal(false);
    setCreateStockFormData({ producto: '', bodega: '', cantidad: '', stock_minimo: '', stock_maximo: '' });
    setFormError(null);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStockFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCreateStockFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStockItem) return;
    setFormError(null);

    const dataToSend = {
      cantidad: parseInt(stockFormData.cantidad),
      stock_minimo: stockFormData.stock_minimo ? parseInt(stockFormData.stock_minimo) : null,
      stock_maximo: stockFormData.stock_maximo ? parseInt(stockFormData.stock_maximo) : null,
      // Asegúrate de enviar solo los campos que tu serializer espera para PATCH/PUT
      // Puede que solo necesites enviar 'cantidad' si es lo único editable directamente.
      producto: editingStockItem.producto, // Necesario si el serializer lo requiere para validar o si es un PUT completo
      bodega: editingStockItem.bodega,     // Necesario si el serializer lo requiere para validar o si es un PUT completo
    };

    try {
      // Usar PATCH para actualizaciones parciales
      await apiClient.patch(`/inventario/detalles-inventario-bodega/${editingStockItem.id}/`, dataToSend);
      setEditingStockItem(null);
      fetchData(); // Recargar datos
    } catch (err: any) {
      console.error("Error al actualizar stock:", err.response?.data);
      setFormError(err.response?.data?.detail || JSON.stringify(err.response?.data) || "Error al actualizar el stock.");
    }
  };

  const handleCreateStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const selectedBodega = bodegas.find(b => b.id === parseInt(createStockFormData.bodega));
    if (!selectedBodega || selectedBodega.sucursal === null) { 
        setFormError("La bodega seleccionada no tiene una sucursal asociada o no se encontró la bodega.");
        // Si Bodega tiene sucursal (ID), usar eso:
        // if (!selectedBodega || selectedBodega.sucursal === null) {
        //   setFormError("La bodega seleccionada no tiene una sucursal asociada.");
        //   return;
        // }
        return;
    }
    
    // Encontrar el InventarioSucursal.id basado en la sucursal de la bodega seleccionada
    // Esto asume que `selectedBodega.sucursal` (el ID de la sucursal) está disponible.
    // Tu interfaz Bodega tiene `sucursal_nombre`, pero el serializer de Bodega sí devuelve `sucursal` (ID).
    const inventarioSucursal = inventariosSucursal.find(inv => inv.sucursal === selectedBodega.sucursal);

    if (!inventarioSucursal) {
      setFormError(`No se encontró un inventario general para la sucursal: ${selectedBodega.sucursal_nombre}. Por favor, cree uno primero.`);
      return;
    }

    const dataToSend = {
      producto: parseInt(createStockFormData.producto),
      bodega: parseInt(createStockFormData.bodega),
      inventario_sucursal: inventarioSucursal.id,
      cantidad: parseInt(createStockFormData.cantidad),
      stock_minimo: createStockFormData.stock_minimo ? parseInt(createStockFormData.stock_minimo) : null,
      stock_maximo: createStockFormData.stock_maximo ? parseInt(createStockFormData.stock_maximo) : null,
    };

    try {
      await apiClient.post('/inventario/detalles-inventario-bodega/', dataToSend);
      resetCreateStockForm();
      fetchData(); // Recargar datos
    } catch (err: any) {
      console.error("Error al crear registro de stock:", err.response?.data);
      setFormError(err.response?.data?.detail || JSON.stringify(err.response?.data) || "Error al crear el registro de stock.");
    }
  };

  const handleDeleteStockItem = async (id: number) => {
    if (window.confirm("¿Seguro que quieres eliminar este registro de stock? Esta acción no se puede deshacer.")) {
      try {
        await apiClient.delete(`/inventario/detalles-inventario-bodega/${id}/`);
        fetchData(); // Recargar datos para reflejar la eliminación
      } catch (err: any) {
        console.error("Error al eliminar registro de stock:", err.response?.data);
        alert(err.response?.data?.detail || "Error al eliminar el registro de stock.");
      }
    }
  };

  const handleExcelFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedExcelFile(event.target.files[0]);
      setExcelUploadMessage(null); // Limpiar mensajes anteriores al seleccionar nuevo archivo
      setExcelUploadErrors(null);
    } else {
      setSelectedExcelFile(null);
    }
  };

  const handleExcelUploadSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedExcelFile) {
      setExcelUploadMessage("Por favor, seleccione un archivo Excel para cargar.");
      setExcelUploadErrors(null);
      return;
    }

    const formData = new FormData();
    formData.append('archivo_excel', selectedExcelFile);

    setExcelUploadMessage("Cargando archivo...");
    setExcelUploadErrors(null);

    try {
      const response = await apiClient.post('/inventario/detalles-inventario-bodega/cargar-excel/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setExcelUploadMessage(response.data.message || "Carga completada exitosamente.");
      if (response.data.errores_excel_previos && response.data.errores_excel_previos !== "Ninguno.") {
        setExcelUploadErrors(Array.isArray(response.data.errores_excel_previos) ? response.data.errores_excel_previos : [response.data.errores_excel_previos]);
      }
      fetchData(); // Recargar la lista de stock
    } catch (error: any) {
      const errorData = error.response?.data;
      console.error("Error al cargar stock desde Excel:", errorData); // Loguea el objeto de error completo

      let uiMessage = "Error al cargar el archivo.";
      let uiDetailErrors: string[] | null = null;

      if (typeof errorData === 'string') {
        uiMessage = errorData;
      } else if (typeof errorData === 'object' && errorData !== null) {
        uiMessage = errorData.message || errorData.error || errorData.detail || uiMessage;

        const collectErrors = (errors: any): string[] => {
          if (Array.isArray(errors)) {
            return errors.flat().map(e => typeof e === 'string' ? e : JSON.stringify(e));
          }
          if (typeof errors === 'string') {
            return [errors];
          }
          if (typeof errors === 'object' && errors !== null) {
            return Object.entries(errors).map(([key, value]) => 
              `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`
            );
          }
          return [];
        };

        let collectedDetailErrors: string[] = [];
        if (errorData.errores_excel) {
          collectedDetailErrors = collectedDetailErrors.concat(collectErrors(errorData.errores_excel));
        }
        if (errorData.errores_serializer) {
          collectedDetailErrors = collectedDetailErrors.concat(collectErrors(errorData.errores_serializer));
        }
        if (errorData.error_detalle && !collectedDetailErrors.includes(errorData.error_detalle)) {
           collectedDetailErrors.push(errorData.error_detalle);
        }
         // Si no hay errores específicos pero el mensaje principal es genérico, intenta mostrar el objeto de error
        if (collectedDetailErrors.length === 0 && uiMessage === "Error al cargar el archivo." && Object.keys(errorData).length > 0) {
            collectedDetailErrors = collectErrors(errorData)
        }

        if (collectedDetailErrors.length > 0) uiDetailErrors = collectedDetailErrors;
      }
      setExcelUploadMessage(uiMessage);
      setExcelUploadErrors(uiDetailErrors);
    }
  };
  // Agrupar stockItems por sucursal y luego por bodega
  const groupedStockItems = useMemo(() => {
    const groups: Record<string, Record<string, DetalleInventarioBodega[]>> = {};

    stockItems.forEach(item => {
      const bodegaDetail = bodegas.find(b => b.id === item.bodega);
      
      const sucursalName = bodegaDetail?.sucursal_nombre || 'Bodegas sin Sucursal Asignada';
      
      let bodegaDisplayName = `ID: ${item.bodega}`; // Fallback
      if (bodegaDetail) {
          bodegaDisplayName = bodegaDetail.tipo_bodega_tipo 
              ? `${bodegaDetail.tipo_bodega_tipo} (${bodegaDetail.direccion})` 
              : bodegaDetail.direccion;
      } else if (item.bodega_info) { // Si bodega_info está poblado (aunque actualmente no lo parece por el serializer)
            bodegaDisplayName = item.bodega_info.tipo_bodega_tipo
              ? `${item.bodega_info.tipo_bodega_tipo} (${item.bodega_info.direccion})`
              : item.bodega_info.direccion;
      }

      if (!groups[sucursalName]) {
        groups[sucursalName] = {};
      }
      if (!groups[sucursalName][bodegaDisplayName]) {
        groups[sucursalName][bodegaDisplayName] = [];
      }
      groups[sucursalName][bodegaDisplayName].push(item);
    });
    return groups;
  }, [stockItems, bodegas]);




  if (loading) return <p className="text-center py-4">Cargando stock...</p>;
  if (error) return <p className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">Error: {error}</p>;

  return (
    <div className="container mx-auto p-4">
      <Link to="/personal/admin/dashboard" className="text-blue-600 hover:underline mb-6 inline-block">&larr; Volver al Dashboard de Admin</Link>
      <h1 className="text-2xl font-bold mb-2">Gestionar Stock en Bodegas</h1>

      {/* Formulario de Edición Modal (o inline) */}
      {editingStockItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              Editar Stock: {editingStockItem.producto_nombre || getProductoNombre(editingStockItem.producto)} <br/>
              <span className="text-sm text-gray-500">Bodega: {editingStockItem.bodega_info?.tipo_bodega_tipo ? `${editingStockItem.bodega_info.tipo_bodega_tipo} - ${editingStockItem.bodega_info.direccion}` : getBodegaNombre(editingStockItem.bodega)}</span>
            </h3>
            {formError && <p className="text-red-500 text-sm mb-3 bg-red-100 p-2 rounded">{formError}</p>}
            <form onSubmit={handleStockSubmit} className="space-y-4">
              <div>
                <label htmlFor="cantidad" className="block text-sm font-medium text-gray-700">Cantidad Actual:</label>
                <input type="number" name="cantidad" id="cantidad" value={stockFormData.cantidad} onChange={handleEditFormChange} required className="mt-1 block w-full input-form"/>
              </div>
              <div>
                <label htmlFor="stock_minimo" className="block text-sm font-medium text-gray-700">Stock Mínimo (Opcional):</label>
                <input type="number" name="stock_minimo" id="stock_minimo" value={stockFormData.stock_minimo} onChange={handleEditFormChange} className="mt-1 block w-full input-form"/>
              </div>
              <div>
                <label htmlFor="stock_maximo" className="block text-sm font-medium text-gray-700">Stock Máximo (Opcional):</label>
                <input type="number" name="stock_maximo" id="stock_maximo" value={stockFormData.stock_maximo} onChange={handleEditFormChange} className="mt-1 block w-full input-form"/>
              </div>
              <div className="mt-6 flex items-center justify-end gap-x-6">
                <button type="button" onClick={() => setEditingStockItem(null)} className="text-sm font-semibold leading-6 text-gray-900">Cancelar</button>
                <button type="submit" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Formulario de Creación Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              Registrar Nuevo Stock en Bodega
            </h3>
            {formError && <p className="text-red-500 text-sm mb-3 bg-red-100 p-2 rounded">{formError}</p>}
            <form onSubmit={handleCreateStockSubmit} className="space-y-4">
              <div>
                <label htmlFor="create_producto" className="block text-sm font-medium text-gray-700">Producto:</label>
                <select name="producto" id="create_producto" value={createStockFormData.producto} onChange={handleCreateFormChange} required className="mt-1 block w-full input-form">
                  <option value="">Seleccione un producto</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="create_bodega" className="block text-sm font-medium text-gray-700">Bodega:</label>
                <select name="bodega" id="create_bodega" value={createStockFormData.bodega} onChange={handleCreateFormChange} required className="mt-1 block w-full input-form">
                  <option value="">Seleccione una bodega</option>
                  {bodegas.map(b => <option key={b.id} value={b.id}>{b.tipo_bodega_tipo ? `${b.tipo_bodega_tipo} - ${b.direccion}` : b.direccion} (Suc: {b.sucursal_nombre || 'N/A'})</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="create_cantidad" className="block text-sm font-medium text-gray-700">Cantidad Inicial:</label>
                <input type="number" name="cantidad" id="create_cantidad" value={createStockFormData.cantidad} onChange={handleCreateFormChange} required className="mt-1 block w-full input-form"/>
              </div>
              <div>
                <label htmlFor="create_stock_minimo" className="block text-sm font-medium text-gray-700">Stock Mínimo (Opcional):</label>
                <input type="number" name="stock_minimo" id="create_stock_minimo" value={createStockFormData.stock_minimo} onChange={handleCreateFormChange} className="mt-1 block w-full input-form"/>
              </div>
              <div>
                <label htmlFor="create_stock_maximo" className="block text-sm font-medium text-gray-700">Stock Máximo (Opcional):</label>
                <input type="number" name="stock_maximo" id="create_stock_maximo" value={createStockFormData.stock_maximo} onChange={handleCreateFormChange} className="mt-1 block w-full input-form"/>
              </div>
              <div className="mt-6 flex items-center justify-end gap-x-6">
                <button type="button" onClick={resetCreateStockForm} className="text-sm font-semibold leading-6 text-gray-900">Cancelar</button>
                <button type="submit" className="rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600">
                  Registrar Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Formulario de Carga Masiva Excel */}
        <div className="w-full md:w-auto bg-gray-50 p-4 rounded-lg shadow">
          <h3 className="text-md font-semibold mb-2 text-gray-700">Carga Masiva de Stock (Excel)</h3>
          <form onSubmit={handleExcelUploadSubmit} className="space-y-3">
            <div>
              <input 
                type="file" 
                accept=".xls,.xlsx" 
                onChange={handleExcelFileChange} 
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <button 
              type="submit"
              disabled={!selectedExcelFile}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-300"
            >
              Cargar desde Excel
            </button>
          </form>
          {excelUploadMessage && (
            <p className={`mt-3 text-sm ${excelUploadErrors ? 'text-red-600' : 'text-green-600'}`}>{excelUploadMessage}</p>
          )}
          {excelUploadErrors && Array.isArray(excelUploadErrors) && excelUploadErrors.length > 0 && (
            <ul className="mt-2 list-disc list-inside text-red-500 text-xs">
              {excelUploadErrors.map((err, idx) => <li key={idx}>{typeof err === 'string' ? err : JSON.stringify(err)}</li>)}
            </ul>
          )}
        </div>
        <div>
          <button
            onClick={() => { resetCreateStockForm(); setShowCreateModal(true); }}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
          >
            + Registrar Nuevo Stock (Manual)
          </button>
        </div>
      </div>

      {/* Lista de Stock */}
      <div className="bg-white p-6 rounded-lg shadow-md mt-4">
        <h2 className="text-xl font-semibold mb-4">Inventario en Bodegas</h2>
        {Object.keys(groupedStockItems).length > 0 ? (
          Object.entries(groupedStockItems).sort(([sucA], [sucB]) => sucA.localeCompare(sucB)).map(([sucursalName, bodegasEnSucursal]) => (
            <div key={sucursalName} className="mb-8">
              <h3 className="text-xl font-semibold text-gray-800 border-b-2 border-blue-500 pb-2 mb-4">{sucursalName}</h3>
              {Object.keys(bodegasEnSucursal).length > 0 ? (
                Object.entries(bodegasEnSucursal).sort(([bodA], [bodB]) => bodA.localeCompare(bodB)).map(([bodegaName, itemsEnBodega]) => (
                  <div key={bodegaName} className="mb-6 ml-4">
                    <h4 className="text-lg font-medium text-gray-700 mb-2">{bodegaName}</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Mín.</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Máx.</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Últ. Act.</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {itemsEnBodega.map(item => (
                            <tr key={item.id}>
                              <td className="px-4 py-4 whitespace-nowrap font-medium text-gray-900">
                                {item.producto_nombre || getProductoNombre(item.producto)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.cantidad}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.stock_minimo ?? 'N/A'}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.stock_maximo ?? 'N/A'}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.ultima_actualizacion ? new Date(item.ultima_actualizacion).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                <button onClick={() => handleEditStockItem(item)} className="text-indigo-600 hover:text-indigo-900 mr-3">
                                  Ajustar
                                </button>
                                <button onClick={() => handleDeleteStockItem(item.id)} className="text-red-600 hover:text-red-900">
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              ) : <p className="ml-4 text-sm text-gray-500">No hay stock registrado en bodegas para esta sucursal.</p>}
            </div>
          ))
        ) : <p>No hay items de stock registrados o disponibles.</p>}
      </div>
    </div>
  );
};

export default GestionarStockPage;
