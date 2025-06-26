import React, { useState, useEffect, useCallback} from 'react';
import apiClient from '../../../../services/api';
import { Link } from 'react-router-dom';

// --- Interfaces ---
interface Categoria {
  id: number;
  nombre: string;
}

interface Marca {
  id: number;
  nombre: string;
}

interface Producto {
  id: number;
  nombre: string;
  marca: number; // ID de la marca
  marca_nombre?: string;
  categoria: number; // ID de la categoría
  categoria_nombre?: string;
  precio: string; // El backend lo envía como string si es DecimalField
  descripcion?: string | null;
  imagen?: string | null; // URL de la imagen para mostrar
  // Considera añadir stock si lo gestionas aquí
}

const GestionarProductosPage: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [activeForm, setActiveForm] = useState<null | 'createProducto' | 'editProducto'>(null);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [productoFormData, setProductoFormData] = useState({
    nombre: '',
    marca: '', // ID
    categoria: '', // ID
    precio: '',
    descripcion: '',
    imagen: null as File | null, // Para el input de tipo file
  });
  const [previewImagen, setPreviewImagen] = useState<string | null>(null);

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [productosRes, categoriasRes, marcasRes] = await Promise.all([
        apiClient.get<Producto[]>('/gestion-productos/productos/'), 
        apiClient.get<Categoria[]>('/gestion-productos/categorias/'),
        apiClient.get<Marca[]>('/gestion-productos/marcas/'),

      ]);
      setProductos(productosRes.data);
      setCategorias(categoriasRes.data);
      setMarcas(marcasRes.data);
    } catch (err: any) {
      console.error("Error al cargar datos del catálogo:", err);
      setError(err.response?.data?.detail || "No se pudieron cargar los datos del catálogo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Form Handling ---
  const resetProductoForm = () => {
    setEditingProducto(null);
    setProductoFormData({
      nombre: '',
      marca: '',
      categoria: '',
      precio: '',
      descripcion: '',
      imagen: null,
    });
    setPreviewImagen(null);
    setActiveForm(null);
    setFormError(null);
  };

  const handleProductoFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProductoFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProductoFormData(prev => ({ ...prev, imagen: file }));
      setPreviewImagen(URL.createObjectURL(file));
    } else {
      setProductoFormData(prev => ({ ...prev, imagen: null }));
      setPreviewImagen(null);
    }
  };

  const handleProductoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const formData = new FormData();
    formData.append('nombre', productoFormData.nombre);
    formData.append('marca', productoFormData.marca);
    formData.append('categoria', productoFormData.categoria);
    formData.append('precio', productoFormData.precio);
    if (productoFormData.descripcion) {
      formData.append('descripcion', productoFormData.descripcion);
    }
    // Solo añadir la imagen si se ha seleccionado un nuevo archivo
    if (productoFormData.imagen instanceof File) {
      formData.append('imagen', productoFormData.imagen);
    } else if (editingProducto && !productoFormData.imagen && !previewImagen) {
      // Si se está editando y se quiere quitar la imagen (previewImagen es null y no hay nuevo archivo)
      // El backend debe manejar esto, usualmente enviando un valor especial o no enviando el campo 'imagen'
      // Para DRF, si no envías el campo 'imagen' en un PATCH, no se modifica.
      // Si quieres eliminarla, tu serializer necesitaría manejar un valor como null o una acción específica.
      // Por ahora, si no hay nueva imagen, no la enviamos, y el backend no la cambiará.
      // Si quieres permitir eliminar la imagen, necesitarías un checkbox "Eliminar imagen actual"
      // y enviar `imagen: null` o un campo booleano al backend.
    }


    const url = editingProducto
      ? `/gestion-productos/productos/${editingProducto.id}/`
      : '/gestion-productos/productos/';
    // Para PATCH con FormData, algunos backends prefieren POST con _method=PATCH
    // Pero DRF maneja PATCH con FormData directamente.
    const method = editingProducto ? 'patch' : 'post';

    try {
      await apiClient[method](url, formData);
      resetProductoForm();
      fetchData();
    } catch (err: any) {
      console.error("Error al guardar producto:", err.response?.data);
      let errorMessage = "Error al guardar el producto.";
      if (err.response?.data) {
        // Intentar obtener un mensaje de error más específico
        const errors = err.response.data;
        if (typeof errors === 'string') {
          errorMessage = errors;
        } else if (typeof errors === 'object') {
          const fieldErrors = Object.entries(errors)
            .map(([key, value]) => `${key}: ${(Array.isArray(value) ? value.join(', ') : value)}`)
            .join('; ');
          if (fieldErrors) errorMessage = fieldErrors;
        }
      }
      setFormError(errorMessage);
    }
  };

  const handleEditProducto = (producto: Producto) => {
    setEditingProducto(producto);
    setProductoFormData({
      nombre: producto.nombre,
      marca: producto.marca.toString(),
      categoria: producto.categoria.toString(),
      precio: producto.precio.toString(), // El precio viene como string del backend
      descripcion: producto.descripcion || '',
      imagen: null, // No pre-cargamos la imagen para editar, el usuario debe subir una nueva si quiere cambiarla
    });
    setPreviewImagen(producto.imagen || null); // Mostrar imagen actual si existe
    setActiveForm('editProducto');
    setFormError(null);
  };

  const handleDeleteProducto = async (id: number) => {
    if (window.confirm("¿Seguro que quieres eliminar este producto?")) {
      try {
         await apiClient.delete(`/gestion-productos/productos/${id}/`);
        fetchData();
      } catch (err: any) {
        console.error("Error al eliminar producto:", err);
        alert(err.response?.data?.detail || "Error al eliminar el producto.");
      }
    }
  };

  // --- Renderizado ---
  if (loading) return <p className="text-center py-4">Cargando catálogo...</p>;
  if (error) return <p className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">Error: {error}</p>;

  return (
    <div className="container mx-auto p-4">
      <Link to="/personal/admin/dashboard" className="text-blue-600 hover:underline mb-6 inline-block">&larr; Volver al Dashboard de Admin</Link>
      <h1 className="text-2xl font-bold mb-6">Gestionar Catálogo de Productos</h1>

      {activeForm === null && (
        <>
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => {
                resetProductoForm(); // Asegura que el formulario esté limpio
                setActiveForm('createProducto');
              }}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
            >
              + Nuevo Producto
            </button>
          </div>

          {/* Lista de Productos */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Productos</h2>
            {productos.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Imagen</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {productos.map(p => (
                      <tr key={p.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {p.imagen ? (
                            <img src={p.imagen} alt={p.nombre} className="h-12 w-12 object-cover rounded" />
                          ) : (
                            <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">Sin img</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{p.nombre}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.marca_nombre}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.categoria_nombre}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${/* Formatear precio a moneda local */}
                          {parseFloat(p.precio).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button onClick={() => handleEditProducto(p)} className="text-indigo-600 hover:text-indigo-900 mr-3">Editar</button>
                          <button onClick={() => handleDeleteProducto(p.id)} className="text-red-600 hover:text-red-900">Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p>No hay productos registrados.</p>}
          </div>
        </>
      )}

      {/* Formulario para Producto (Crear o Editar) */}
      {(activeForm === 'createProducto' || activeForm === 'editProducto') && (
        <div className="my-8 p-6 border border-gray-200 rounded-lg bg-gray-50 shadow-md">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            {activeForm === 'editProducto' ? 'Editar Producto' : 'Nuevo Producto'}
          </h3>
          {formError && <p className="text-red-500 text-sm mb-3 bg-red-100 p-2 rounded">{formError}</p>}
          <form onSubmit={handleProductoSubmit} className="space-y-4">
            <div>
              <label htmlFor="nombreProducto" className="block text-sm font-medium text-gray-700">Nombre:</label>
              <input type="text" name="nombre" id="nombreProducto" value={productoFormData.nombre} onChange={handleProductoFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
            </div>
            <div>
              <label htmlFor="marcaProducto" className="block text-sm font-medium text-gray-700">Marca:</label>
              <select name="marca" id="marcaProducto" value={productoFormData.marca} onChange={handleProductoFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <option value="">Seleccione una marca</option>
                {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="categoriaProducto" className="block text-sm font-medium text-gray-700">Categoría:</label>
              <select name="categoria" id="categoriaProducto" value={productoFormData.categoria} onChange={handleProductoFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <option value="">Seleccione una categoría</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="precioProducto" className="block text-sm font-medium text-gray-700">Precio:</label>
              <input type="number" name="precio" id="precioProducto" value={productoFormData.precio} onChange={handleProductoFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" step="1" min="0"/>
            </div>
            <div>
              <label htmlFor="descripcionProducto" className="block text-sm font-medium text-gray-700">Descripción (Opcional):</label>
              <textarea name="descripcion" id="descripcionProducto" value={productoFormData.descripcion} onChange={handleProductoFormChange} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
            </div>
            <div>
              <label htmlFor="imagenProducto" className="block text-sm font-medium text-gray-700">
                Imagen {editingProducto && editingProducto.imagen ? '(Dejar vacío para no cambiar)' : '(Opcional)'}:
              </label>
              <input type="file" name="imagen" id="imagenProducto" onChange={handleImagenChange} accept="image/*" className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
              {previewImagen && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">
                    {productoFormData.imagen ? 'Nueva imagen seleccionada:' : 'Imagen actual:'}
                  </p>
                  <img src={previewImagen} alt="Vista previa" className="h-32 w-auto rounded border" />
                </div>
              )}
            </div>
            <div className="mt-6 flex items-center justify-end gap-x-6">
              <button type="button" onClick={resetProductoForm} className="text-sm font-semibold leading-6 text-gray-900">Cancelar</button>
              <button type="submit" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                Guardar Producto
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default GestionarProductosPage;
