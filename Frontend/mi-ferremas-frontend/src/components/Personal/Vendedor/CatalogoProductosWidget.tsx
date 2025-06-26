import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useCart } from '../../../contexts/CartContext'; // Importamos el hook useCart

// Interfaz para los datos del producto que recibimos de la API
interface Producto {
  id: number;
  nombre: string;
  sku: string;
  precio_final: string; // El backend lo envía como string formateado
  stock_total: number;
  imagen: string | null; // La imagen puede ser null
}

const CatalogoProductosWidget: React.FC = () => {
  const { addToCart } = useCart(); // Obtenemos la función addToCart del contexto del carrito
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    // Usamos un temporizador para evitar hacer una llamada a la API en cada pulsación de tecla (debounce)
    const handler = setTimeout(() => {
      fetchProductos(); // Llama a la función de búsqueda
    }, 300); // Espera 300ms después de que el usuario deja de escribir

    const fetchProductos = async () => {
      setLoading(true);
      try {
        const response = await api.get('/gestion-productos/catalogo/', { // Corregida la URL
          params: { search: filtro }
        });
        setProductos(response.data.results); // La respuesta es paginada
      } catch (err) {
        setError('No se pudo cargar el catálogo de productos.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    // Limpiar el temporizador si el componente se desmonta o si el filtro cambia
    return () => {
      clearTimeout(handler);
    };
  }, [filtro]); // Este efecto se ejecuta cada vez que 'filtro' cambia

  const handleAddToCart = (producto: Producto) => {
    // Asumimos que addToCart espera un objeto con id, nombre, precio y cantidad
    addToCart({
      id: producto.id,
      name: producto.nombre,
      price: parseFloat(producto.precio_final), // Convertimos el precio a número
      quantity: 1, // Por defecto, se agrega 1 unidad
      // Puedes añadir más propiedades si tu CartContext las necesita, como imagen, SKU, etc.
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">🛍️ Catálogo Rápido</h2>
      <div className="mb-4">
        <input
          type="text"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Filtrar por nombre, SKU..."
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 transition"
        />
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
        {loading && <p className="text-center text-gray-500">Cargando productos...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}
        {!loading && !error && (
          <>
            {productos.length === 0 ? (
              <p className="text-center text-gray-500">
                {filtro ? `No se encontraron productos para "${filtro}".` : 'No hay productos en el catálogo.'}
              </p>
            ) : (
              productos.map((producto) => (
                <div key={producto.id} className="flex items-center gap-4 p-2 border-b border-gray-100">
                  <img 
                    src={producto.imagen || 'https://via.placeholder.com/64x64.png?text=Sin+Imagen'} 
                    alt={producto.nombre} 
                    className="w-16 h-16 object-cover rounded-md bg-gray-200" 
                  />
                  <div className="flex-grow">
                    <p className="font-semibold">{producto.nombre}</p>
                    <p className="text-sm text-gray-600">
                      Stock: <span className={producto.stock_total > 0 ? 'font-bold text-green-600' : 'font-bold text-red-600'}>{producto.stock_total}</span> | ${parseFloat(producto.precio_final).toLocaleString('es-CL')}
                    </p>
                  </div>
                  <button 
                    disabled={producto.stock_total === 0} // Deshabilitar si no hay stock
                    onClick={() => handleAddToCart(producto)} // Añadir el producto al carrito al hacer clic
                    className="bg-blue-500 text-white text-xs font-bold py-1 px-2 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Agregar
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CatalogoProductosWidget;