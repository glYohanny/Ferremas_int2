import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../../../services/api'; // Asegúrate que la ruta sea correcta

// Interfaces para los datos que cargaremos
interface Producto {
  id: number;
  nombre: string;
}
interface Categoria {
  id: number;
  nombre: string;
}
interface Marca {
  id: number;
  nombre: string;
}

// Interfaz para los ContentTypes que vendrán de la API
interface ApiContentType {
  id: number;
  name: string; // ej: 'producto', 'categoria'
  verbose_name: string; // ej: 'Productos', 'Categorías'
}

// Interfaz para los Tipos de Promoción que vendrán de la API
interface ApiTipoPromocion {
  value: string;
  label: string;
}

interface ObjetivoPromocionDetalle {
  id: number;
  nombre: string;
  // Podrías añadir más campos aquí si tu serializer los devuelve (ej. 'tipo_objeto_display')
}

// Define la interfaz para una Promoción según tu modelo de Django
interface Promocion {
  id: number;
  titulo: string; // Coincide con el modelo y el formulario
  descripcion?: string;
  valor: number | string; // El backend usa 'valor' para el descuento/precio
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean; // Cambiado de 'activa' a 'activo' para coincidir con el JSON del backend
  tipo_promocion_display: string; // Para mostrar el tipo de promoción
  objetivo_promocion_detalle: ObjetivoPromocionDetalle | null; // Para mostrar el detalle del objeto
  esta_vigente_display: boolean; // Para el estado de vigencia
}
// Interfaz para los datos del formulario de creación
interface PromocionCreateFormData {
  titulo: string; // Cambiado de nombre a titulo
  descripcion: string;
  valor_promocion: string; // Campo genérico para el valor de la promoción
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean; // <--- Cambiado de activa a activo
  // Campos requeridos por el backend que faltaban:
  tipo_promocion: string; // Necesitarás un select o input para esto
  content_type: string; // ID del ContentType (ej. producto, categoría). Necesitarás UI.
  object_id: string; // ID del objeto al que aplica la promo. Necesitarás UI.
}

const GestionarPromocionesPage: React.FC = () => {
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createFormError, setCreateFormError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false); // Nuevo estado para controlar la visibilidad del formulario
  const [apiContentTypes, setApiContentTypes] = useState<ApiContentType[]>([]);
  const [apiTiposPromocion, setApiTiposPromocion] = useState<ApiTipoPromocion[]>([]);

  // Estados para los selectores dinámicos
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [aplicableObjects, setAplicableObjects] = useState<{id: number, nombre: string}[]>([]);

  const initialCreateFormData: PromocionCreateFormData = {
    titulo: '', // Cambiado de nombre a titulo
    descripcion: '',
    valor_promocion: '', // Inicializar el nuevo campo
    fecha_inicio: '',
    fecha_fin: '',
    activo: true, // <--- Cambiado de activa a activo
    // Inicializar los nuevos campos
    tipo_promocion: '', // Se seleccionará de los datos de la API
    content_type: '', // Se seleccionará de los datos de la API
    object_id: '', 
   };
  const [createPromoFormData, setCreatePromoFormData] = useState<PromocionCreateFormData>(initialCreateFormData);


  const fetchPromociones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Ajusta el endpoint si es diferente
      // Por lo tanto, '/promociones/promociones/' se resolverá a '/api/promociones/promociones/'
      const [promoRes, productosRes, categoriasRes, marcasRes, contentTypesRes, tiposPromocionRes] = await Promise.all([
        apiClient.get<Promocion[]>('/promociones/promociones/'),
        apiClient.get<Producto[]>('/gestion-productos/productos/'), // Asumiendo este endpoint
        apiClient.get<Categoria[]>('/gestion-productos/categorias/'), // Asumiendo este endpoint
        apiClient.get<Marca[]>('/gestion-productos/marcas/'), // Asumiendo este endpoint para marcas
        apiClient.get<ApiContentType[]>('/promociones/contenttypes/'), 
        apiClient.get<ApiTipoPromocion[]>('/promociones/tipos-promocion/') // Nuevo endpoint para tipos de promoción
      ]);

      setPromociones(promoRes.data);
      setProductos(productosRes.data);
      setCategorias(categoriasRes.data);
      setMarcas(marcasRes.data);
      setApiContentTypes(contentTypesRes.data);
      setApiTiposPromocion(tiposPromocionRes.data);
    } catch (err: any) {
      // Manejar errores individuales de las llamadas si es necesario
      console.error("Error al cargar promociones:", err);
      setError(err.response?.data?.detail || "No se pudieron cargar las promociones.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromociones();
  }, [fetchPromociones]);

  // Efecto para actualizar aplicableObjects y el content_type inicial del formulario
  useEffect(() => {
    // Si los content types de la API ya se cargaron y el formulario aún no tiene content_type seleccionado
    if (apiContentTypes.length > 0 && !createPromoFormData.content_type) {
      setCreatePromoFormData(prev => ({
        ...prev,
        content_type: String(apiContentTypes[0]?.id || '') // Usar el ID del primer CT como default
      }));
    }
    // Si los tipos de promoción de la API ya se cargaron y el formulario aún no tiene tipo_promocion seleccionado
    if (apiTiposPromocion.length > 0 && !createPromoFormData.tipo_promocion) {
      setCreatePromoFormData(prev => ({
        ...prev,
        tipo_promocion: apiTiposPromocion[0]?.value || '' // Usar el value del primer tipo como default
      }));
    }

    // Actualizar la lista de objetos aplicables basado en el content_type seleccionado
    // y si los datos base (productos, categorias, marcas) ya están cargados.
    if (createPromoFormData.content_type && (productos.length > 0 || categorias.length > 0 || marcas.length > 0)) {
      let currentApplicable: { id: number; nombre: string }[] = [];
      const selectedContentTypeFromApi = apiContentTypes.find(ct => String(ct.id) === createPromoFormData.content_type);

      if (selectedContentTypeFromApi?.name === 'producto') {
        currentApplicable = productos;
      } else if (selectedContentTypeFromApi?.name === 'categoria') {
        currentApplicable = categorias;
      } else if (selectedContentTypeFromApi?.name === 'marca') {
        currentApplicable = marcas;
      }
      setAplicableObjects(currentApplicable);
      // No reseteamos object_id aquí porque handleCreatePromoFormChange ya lo hace
    }
  }, [createPromoFormData.content_type, createPromoFormData.tipo_promocion, productos, categorias, marcas, apiContentTypes, apiTiposPromocion]);



   const handleCreatePromoFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setCreatePromoFormData(prev => {
      const newState = {
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
      };

      // Si cambia el content_type, resetear object_id y actualizar la lista de objetos aplicables
      if (name === 'content_type') {
        newState.object_id = ''; // Resetear object_id
        const selectedContentTypeFromApi = apiContentTypes.find(ct => String(ct.id) === value);

        if (selectedContentTypeFromApi?.name === 'producto') {
          setAplicableObjects(productos);
        } else if (selectedContentTypeFromApi?.name === 'categoria') {
          setAplicableObjects(categorias);
        } else if (selectedContentTypeFromApi?.name === 'marca') {
          setAplicableObjects(marcas);
        } else {
          setAplicableObjects([]);
        }
      }
      // Si cambia el tipo_promocion, y el nuevo tipo no requiere valor, limpiar valor_promocion
      if (name === 'tipo_promocion') {
        const tipoSeleccionado = apiTiposPromocion.find(tp => tp.value === value);
        if (tipoSeleccionado && (tipoSeleccionado.label.toLowerCase().includes('2x1') || tipoSeleccionado.label.toLowerCase().includes('regalo'))) {
          newState.valor_promocion = ''; // Limpiar valor si no es necesario
        }
      }
      return newState;
    });
  };

  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    return dateString.split('T')[0]; // Toma solo la parte YYYY-MM-DD
  };

  const handleEditPromo = (promo: Promocion) => {
    setIsEditing(true);
    setShowForm(true); // Mostrar el formulario al editar
    setEditingPromoId(promo.id);
    setCreateFormError(null); // Limpiar errores previos

    const objetivoDetalle = promo.objetivo_promocion_detalle;
    let calculatedContentType = '';

    if (objetivoDetalle && objetivoDetalle.id && typeof objetivoDetalle.nombre === 'string') {
        const objetivoNombreLower = objetivoDetalle.nombre.toLowerCase();
        const foundCt = apiContentTypes.find(ct => 
            ct.name === objetivoNombreLower || 
            (ct.verbose_name && ct.verbose_name.toLowerCase().includes(objetivoNombreLower))
        );
        if (foundCt) {
            calculatedContentType = String(foundCt.id);
        }
    }

    // Poblar el formulario con los datos de la promoción
    // Asegúrate de que los nombres de los campos coincidan con PromocionCreateFormData
    setCreatePromoFormData({
      titulo: promo.titulo,
      descripcion: promo.descripcion || '',
      valor_promocion: promo.valor !== null && promo.valor !== undefined ? String(promo.valor) : '',
      fecha_inicio: formatDateForInput(promo.fecha_inicio),
      fecha_fin: formatDateForInput(promo.fecha_fin),
      activo: promo.activo, // Usar 'activo' que ya es correcto aquí
      tipo_promocion: apiTiposPromocion.find(tp => tp.label === promo.tipo_promocion_display)?.value || '', // Buscar el 'value' por el 'label'
      content_type: calculatedContentType,
      object_id: String(objetivoDetalle?.id || ''),
    });
    // Desplazar la vista al formulario
    const formElement = document.getElementById('promo-form-section');
    if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCreatePromoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFormError(null);

    if (new Date(createPromoFormData.fecha_fin) < new Date(createPromoFormData.fecha_inicio)) {
      setCreateFormError("La fecha de fin no puede ser anterior a la fecha de inicio.");
      return;
    }

    const tipoPromocionSeleccionado = apiTiposPromocion.find(tp => tp.value === createPromoFormData.tipo_promocion);
    let valorNumericoParaEnviar: number | null = null;

    // Determinar si el tipo de promoción requiere un valor numérico explícito
    const requiereValorNumerico = tipoPromocionSeleccionado && 
                                 !tipoPromocionSeleccionado.label.toLowerCase().includes('2x1') &&
                                 !tipoPromocionSeleccionado.label.toLowerCase().includes('regalo');

    if (requiereValorNumerico) {
      if (!createPromoFormData.valor_promocion.trim()) {
        setCreateFormError("El valor de la promoción es requerido para este tipo de promoción.");
        return;
      }
      const parsedValor = parseFloat(createPromoFormData.valor_promocion);
      if (isNaN(parsedValor)) {
        setCreateFormError("El valor de la promoción debe ser un número válido.");
        return;
      }
      valorNumericoParaEnviar = parsedValor;

      if (tipoPromocionSeleccionado?.label.toLowerCase().includes('porcentual')) {
        if (valorNumericoParaEnviar <= 0 || valorNumericoParaEnviar > 100) {
          setCreateFormError("El porcentaje de descuento debe estar entre 1 y 100.");
          return;
        }
      } else { // Para precio fijo u otros que no sean porcentaje pero sí requieren valor
        if (valorNumericoParaEnviar <= 0) {
          setCreateFormError("El valor de la promoción debe ser mayor que cero.");
          return;
        }
      }
    }

   const { valor_promocion, ...restOfCreateFormData } = createPromoFormData;

    const payload = {
      ...restOfCreateFormData,
      valor: valorNumericoParaEnviar, // Enviar valor procesado o null
      content_type: restOfCreateFormData.content_type ? parseInt(restOfCreateFormData.content_type) : null,
      object_id: restOfCreateFormData.object_id ? parseInt(restOfCreateFormData.object_id) : null,
    };

    // Log para ver el payload que se envía al backend
    console.log("Payload enviado al backend:", JSON.stringify(payload, null, 2));
    try {
      // El apiClient ya debería tener configurado el baseURL como /api/
      if (isEditing && editingPromoId) {
        await apiClient.put(`/promociones/promociones/${editingPromoId}/`, payload);
        alert("Promoción actualizada exitosamente!");
        setIsEditing(false);
        setEditingPromoId(null);
      } else {
        await apiClient.post('/promociones/promociones/', payload);
        alert("Promoción creada exitosamente!");
      }
      setCreatePromoFormData(initialCreateFormData); // Limpiar formulario
      fetchPromociones(); // Recargar la lista
      setShowForm(false); // Ocultar el formulario después de guardar/actualizar
    } catch (err: any) {
      const actionText = isEditing ? "actualizar" : "crear";
      console.error(`Error al ${actionText} promoción:`, err.response?.data);
      const errorData = err.response?.data;
      let errorMessage = `No se pudo ${actionText} la promoción.`;

      if (errorData && typeof errorData === 'object') {
        const fieldErrors = Object.entries(errorData)
          .map(([field, errors]) => {
            const errorMessages = Array.isArray(errors) ? errors.join(', ') : String(errors);
            return `${field}: ${errorMessages}`;
          });
        if (fieldErrors.length > 0) {
          errorMessage = fieldErrors.join('; ');
        } else if (errorData.detail) { // Para errores no relacionados con campos específicos
          errorMessage = errorData.detail;
        } else {
          errorMessage = JSON.stringify(errorData); // Como último recurso, mostrar el objeto JSON
        }
      }
      setCreateFormError(errorMessage);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingPromoId(null);
    setCreatePromoFormData(initialCreateFormData);
    setShowForm(false); // Ocultar el formulario al cancelar
    setCreateFormError(null);
  };

  const handleDeletePromo = async (promoId: number) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta promoción?")) {
      try {
        await apiClient.delete(`/promociones/promociones/${promoId}/`);
        alert("Promoción eliminada exitosamente!");
        fetchPromociones(); // Recargar la lista de promociones
        // Si el formulario estaba mostrando la promoción eliminada, resetearlo
        if (isEditing && editingPromoId === promoId) {
          handleCancelEdit();
        }
      } catch (err: any) {
        console.error("Error al eliminar promoción:", err.response?.data);
        alert(err.response?.data?.detail || "No se pudo eliminar la promoción.");
      }
    }
  };
  return (
    <div className="container mx-auto p-4">
      <Link to="/personal/admin/dashboard" className="text-blue-600 hover:underline mb-4 inline-block">&larr; Volver al Dashboard de Admin</Link>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Gestionar Promociones</h2>
          {!showForm && (
            <button 
              onClick={() => {
                setIsEditing(false); 
                setCreatePromoFormData(initialCreateFormData); 
                setCreateFormError(null);
                setShowForm(true);
              }} 
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
            >
              Crear Nueva Promoción
            </button>
          )}
        </div>
        <p className="text-sm text-gray-600 mb-6">Crea, visualiza, edita y elimina promociones para los productos.</p>
        
        {/* Formulario para crear/editar promoción (simplificado) */}
        {showForm && (
          <div id="promo-form-section" className="mb-6">
            <h3 className="text-lg font-medium mb-2">
              {isEditing ? 'Editar Promoción' : 'Nueva Promoción'}
            </h3>
            {createFormError && <p className="text-red-500 bg-red-100 p-3 rounded mb-3">{createFormError}</p>}
            <form onSubmit={handleCreatePromoSubmit} className="space-y-4 p-4 border rounded-md bg-gray-50">
              <div>
                <label htmlFor="titulo" className="block text-sm font-medium text-gray-700">Título Promoción:</label>
                <input type="text" name="titulo" id="titulo" value={createPromoFormData.titulo} onChange={handleCreatePromoFormChange} required className="mt-1 block w-full input-form"/>
              </div>
              <div>
                <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">Descripción (Opcional):</label>
                <textarea name="descripcion" id="descripcion" value={createPromoFormData.descripcion} onChange={handleCreatePromoFormChange} rows={3} className="mt-1 block w-full input-form"/>
              </div>
              {/* Campo Valor de la Promoción - Condicional */}
              {createPromoFormData.tipo_promocion && 
               !apiTiposPromocion.find(tp => tp.value === createPromoFormData.tipo_promocion)?.label.toLowerCase().includes('2x1') &&
               !apiTiposPromocion.find(tp => tp.value === createPromoFormData.tipo_promocion)?.label.toLowerCase().includes('regalo') &&
               (
                <div>
                  <label htmlFor="valor_promocion" className="block text-sm font-medium text-gray-700">
                    Valor de la Promoción 
                    {apiTiposPromocion.find(tp => tp.value === createPromoFormData.tipo_promocion)?.label.toLowerCase().includes('porcentual') ? ' (%):' : ':'}
                  </label>
                  <input 
                    type="number" 
                    name="valor_promocion" 
                    id="valor_promocion" 
                    value={createPromoFormData.valor_promocion} 
                    onChange={handleCreatePromoFormChange} 
                    required /* El required se maneja en la validación de JS ahora */
                    min={apiTiposPromocion.find(tp => tp.value === createPromoFormData.tipo_promocion)?.label.toLowerCase().includes('porcentual') ? "1" : "0.01"}
                    max={apiTiposPromocion.find(tp => tp.value === createPromoFormData.tipo_promocion)?.label.toLowerCase().includes('porcentual') ? "100" : undefined}
                    step="0.01" className="mt-1 block w-full input-form"/>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fecha_inicio" className="block text-sm font-medium text-gray-700">Fecha Inicio:</label>
                  <input type="date" name="fecha_inicio" id="fecha_inicio" value={createPromoFormData.fecha_inicio} onChange={handleCreatePromoFormChange} required className="mt-1 block w-full input-form"/>
                </div>
                <div>
                  <label htmlFor="fecha_fin" className="block text-sm font-medium text-gray-700">Fecha Fin:</label>
                  <input type="date" name="fecha_fin" id="fecha_fin" value={createPromoFormData.fecha_fin} onChange={handleCreatePromoFormChange} required className="mt-1 block w-full input-form"/>
                </div>
              </div>
              <div className="flex items-center">
                <input
                  id="activo"
                  name="activo"
                  type="checkbox"
                  checked={createPromoFormData.activo}
                  onChange={handleCreatePromoFormChange}
                  className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">
                  Promoción Activa
                </label>
              </div>
              {/* Campos Adicionales Requeridos por el Backend - Necesitan UI adecuada */}
              <div>
                <label htmlFor="tipo_promocion" className="block text-sm font-medium text-gray-700">Tipo de Promoción (ej. 'PORCENTAJE_PRODUCTO'):</label>
                <select name="tipo_promocion" id="tipo_promocion" value={createPromoFormData.tipo_promocion} onChange={handleCreatePromoFormChange} required className="mt-1 block w-full input-form">
                  <option value="" disabled>Seleccione un tipo</option>
                  {apiTiposPromocion.map(choice => (
                    <option key={choice.value} value={choice.value}>{choice.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="content_type" className="block text-sm font-medium text-gray-700">Aplicar Promoción A (Tipo de Objeto):</label>
                <select name="content_type" id="content_type" value={createPromoFormData.content_type} onChange={handleCreatePromoFormChange} required className="mt-1 block w-full input-form">
                  <option value="" disabled>Seleccione a qué aplica</option>
                  {apiContentTypes.map(ct => (
                    <option key={ct.id} value={ct.id}>{ct.verbose_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="object_id" className="block text-sm font-medium text-gray-700">Objeto Específico:</label>
                <select name="object_id" id="object_id" value={createPromoFormData.object_id} onChange={handleCreatePromoFormChange} required className="mt-1 block w-full input-form" disabled={aplicableObjects.length === 0}>
                  <option value="" disabled>Seleccione un objeto</option>
                  {aplicableObjects.map(obj => (
                    <option key={obj.id} value={obj.id}>{obj.nombre}</option>
                  ))}
                </select>
                {createPromoFormData.content_type && aplicableObjects.length === 0 && <p className="text-xs text-gray-500 mt-1">Cargando o no hay objetos disponibles para el tipo seleccionado.</p>}
              </div>
              {/* 
              */}
              <div className="flex space-x-3">
                <button type="submit" className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded">
                  {isEditing ? 'Actualizar Promoción' : 'Guardar Promoción'}
                </button>
                {isEditing && (
                  <button type="button" onClick={handleCancelEdit} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">Cancelar Edición</button>
                )}
                 <button type="button" onClick={() => setShowForm(false)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">
                    Cerrar Formulario
                 </button>
              </div>
            </form>
          </div>
        )}

        {/* Listado de promociones existentes */}
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-2">Promociones Activas</h3>
          {loading && <p>Cargando promociones...</p>}
          {error && <p className="text-red-500 bg-red-100 p-3 rounded">{error}</p>}
          {!loading && !error && promociones.length === 0 && <p>No hay promociones registradas.</p>}
          {!loading && !error && promociones.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Objetivo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Inicio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Fin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vigencia</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {promociones.map((promo) => (
                    <tr key={promo.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{promo.titulo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{promo.tipo_promocion_display}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {/* Formatear el valor. Si es un descuento porcentual, el backend debería enviar solo el número.
                            El tipo_promocion_display ya indica si es % o precio fijo. */
                          (promo.tipo_promocion_display && (promo.tipo_promocion_display.toLowerCase().includes('2x1') || promo.tipo_promocion_display.toLowerCase().includes('regalo')))
                            ? 'No aplica'
                            : promo.valor !== null && promo.valor !== undefined
                              ? `${promo.valor}${promo.tipo_promocion_display && promo.tipo_promocion_display.toLowerCase().includes('porcentual') ? '%' : ''}`
                              : 'No especificado'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {promo.objetivo_promocion_detalle 
                          ? promo.objetivo_promocion_detalle.nombre 
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(promo.fecha_inicio).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(promo.fecha_fin).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${promo.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {promo.activo ? '✓ Activa' : '✗ Inactiva'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${promo.esta_vigente_display ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {promo.esta_vigente_display ? '✓ Vigente' : '✗ No Vigente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onClick={() => handleEditPromo(promo)} className="text-indigo-600 hover:text-indigo-900 mr-3">Editar</button>
                        <button onClick={() => handleDeletePromo(promo.id)} className="text-red-600 hover:text-red-900">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {/* Estilos para input-form si no están globales */}
      <style>{`
        .input-form { @apply mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm; }
      `}</style>
    </div>
  );
};

export default GestionarPromocionesPage;