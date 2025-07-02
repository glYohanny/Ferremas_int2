import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getProductById, Product } from '../../services/productService';
import { useCart } from '../../contexts/CartContext'; // Importa el hook del carrito

import { useSucursal } from '../../contexts/SucursalContext'; // Importar hook de sucursal

const ProductDetailPage: React.FC = () => {
  const { idProducto } = useParams<{ idProducto: string }>(); // Obtiene el ID del producto de la URL
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedSucursal, sucursales, favoriteSucursalId, setFavoriteSucursalId, isLoadingSucursales, setSelectedSucursalById } = useSucursal(); // Obtener sucursal seleccionada

  useEffect(() => {
    // ... (código existente para cargar detalles del producto)
    if (!idProducto) {
      setError('No se especificó un ID de producto.');
      setLoading(false);
      return;
    }

    const fetchProductDetails = async () => {
      try {
        setLoading(true);
        const data = await getProductById(idProducto);
        setProduct(data);
        setError(null);
      } catch (err) {
        console.error(`Error fetching product details for ID ${idProducto}:`, err);
        setError('No se pudo cargar el producto. Inténtalo de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [idProducto]);

  // --- Nuevas adiciones para el carrito ---
  const { addToCart } = useCart(); // Corregido: Obtén la función addToCart del carrito
  const [quantity, setQuantity] = useState(1); // Estado para la cantidad a añadir

  const handleAddToCart = () => {
    if (product) {
      const priceForCart = parseFloat(product.precio_final);
      if (isNaN(priceForCart)) {
        console.error("Error: El precio del producto no es un número válido.", product);
        alert("Error: No se pudo añadir el producto al carrito debido a un problema con el precio.");
        return;
      }

      const imageForCart = product.imagen || 'https://via.placeholder.com/150.png?text=En+Carrito';

      addToCart({
        id: product.id,
        name: product.nombre,
        price: priceForCart,
        quantity: quantity,
        imagen_url: imageForCart,
      });
      alert(`${quantity} x ${product.nombre} añadido al carrito!`);
    }
  };
  // --- Fin nuevas adiciones ---


  if (loading) return <p className="text-center text-xl py-10">Cargando detalles del producto...</p>;
  if (error) return <p className="text-center text-red-500 text-xl py-10">{error}</p>;
  if (!product) return <p className="text-center text-xl py-10">Producto no encontrado.</p>;

  const imageUrl = product.imagen || 'https://via.placeholder.com/600x400.png?text=Sin+Imagen';

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="bg-white shadow-xl rounded-lg overflow-hidden md:flex">
        <div className="md:w-1/2">
          <img src={imageUrl} alt={product.nombre} className="w-full h-64 md:h-full object-cover" />
        </div>
        <div className="md:w-1/2 p-6 md:p-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{product.nombre}</h1>
          {product.marca_nombre && <p className="text-md text-gray-600 mb-1">Marca: {product.marca_nombre}</p>}
          {product.categoria_nombre && <p className="text-md text-gray-600 mb-4">Categoría: {product.categoria_nombre}</p>}
          
          <p className="text-gray-700 text-base mb-6">{product.descripcion || 'No hay descripción disponible.'}</p>
          
          <div className="mb-6">
              {/* Intenta parsear los precios primero y verifica si son números válidos */}
            {(() => {
              const originalPriceNum = product.precio_original ? parseFloat(product.precio_original) : NaN;
              const finalPriceNum = product.precio_final ? parseFloat(product.precio_final) : NaN;

              if (product.info_promocion_aplicada && !isNaN(finalPriceNum) && !isNaN(originalPriceNum) && finalPriceNum < originalPriceNum) {
                return (
                  <>
                    <p className="text-gray-500 text-xl line-through">
                      Antes: ${originalPriceNum.toLocaleString('es-CL')}
                    </p>
                    <p className="text-red-600 font-bold text-4xl">
                      Ahora: ${finalPriceNum.toLocaleString('es-CL')}
                    </p>
                    <div className="mt-2 p-2 bg-yellow-100 text-yellow-700 text-sm rounded-md">
                      ¡Oferta! {product.info_promocion_aplicada.titulo}
                    </div>
                  </>
                );
              } else if (!isNaN(originalPriceNum)) {
                return (
                  <p className="text-blue-600 font-bold text-4xl">
                    ${originalPriceNum.toLocaleString('es-CL')}
                  </p>
                );
              } else {
                return <p className="text-blue-600 font-bold text-4xl">Precio no disponible</p>;
              }
            })()}
          </div>

          {/* Información de Stock */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Disponibilidad:</h3>
            {isLoadingSucursales && <p className="text-gray-600">Cargando disponibilidad en sucursales...</p>}
            {!isLoadingSucursales && Array.isArray(sucursales) && sucursales.length > 0 && (
              sucursales.map(sucursal => {
                const stockEnEstaSucursal = product.stock_info ? product.stock_info[sucursal.id] : undefined;
                const esSeleccionada = selectedSucursal?.id === sucursal.id;
                const esFavorita = favoriteSucursalId === sucursal.id;

                let stockText = "No informado";
                let stockClassName = "text-gray-500";
                if (stockEnEstaSucursal !== undefined) {
                  stockText = `${stockEnEstaSucursal} unidades`;
                  stockClassName = stockEnEstaSucursal > 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold";
                }

                return (
                  <div 
                    key={sucursal.id} 
                    className={`p-3 mb-2 border rounded-md flex justify-between items-center ${esSeleccionada ? 'bg-blue-50 border-blue-300' : 'border-gray-200'}`}
                  >
                    <div>
                      <span className="font-medium">{sucursal.nombre}</span>
                      {esFavorita && !esSeleccionada && <span className="ml-2 text-yellow-500">⭐</span>}
                      {esSeleccionada && esFavorita && <span className="ml-2 text-yellow-500">🌟</span>}
                      {esSeleccionada && !esFavorita && <span className="ml-2 text-blue-500">(Seleccionada)</span>}
                      <p className={`text-sm ${stockClassName}`}>{stockText}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!esSeleccionada && (
                         <button 
                          onClick={() => setSelectedSucursalById(sucursal.id)}
                          className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 py-1 px-2 rounded"
                        >
                          Seleccionar
                        </button>
                      )}
                      <button
                        onClick={() => setFavoriteSucursalId(esFavorita ? null : sucursal.id)}
                        className={`text-xs py-1 px-2 rounded ${esFavorita ? 'bg-yellow-400 hover:bg-yellow-500' : 'bg-gray-100 hover:bg-gray-200'}`}
                      >
                        {esFavorita ? '🌟 Quitar Fav.' : '⭐ Marcar Fav.'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            {!isLoadingSucursales && (!Array.isArray(sucursales) || sucursales.length === 0) && (
              <p className="text-gray-600">No hay información de sucursales disponible.</p>
            )}
          </div>
          {/* Selector de Cantidad */}
          <div className="flex items-center space-x-4 mb-6"> {/* Añade margen inferior */}
            <label htmlFor="quantity" className="text-lg font-medium text-gray-700">Cantidad:</label>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))} // Asegura que la cantidad sea al menos 1
              min="1"
              className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Botón Agregar al Carrito */}
          <button
            onClick={handleAddToCart} // Llama a la función para añadir al carrito
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors duration-300"
          >
            Añadir al Carrito
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;