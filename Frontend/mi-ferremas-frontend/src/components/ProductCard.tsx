import React from 'react';
import { Product } from '../services/productService'; // Importa la interfaz
import { Link } from 'react-router-dom'; // Importa Link
import { useSucursal } from '../contexts/SucursalContext'; // Importar hook de sucursal
import { useCart } from '../contexts/CartContext'; // Importar hook de carrito

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { selectedSucursal, sucursales } = useSucursal();
  const { addToCart } = useCart(); // Obtener la función addToCart del contexto

  let stockDisplayInfo = { text: "Seleccione sucursal para ver stock", className: "text-gray-500" };

  if (selectedSucursal && product.stock_info) {
    const stock = product.stock_info[selectedSucursal.id];
    if (stock !== undefined) {
      stockDisplayInfo = {
        text: `Stock en ${selectedSucursal.nombre}: ${stock} unidades`,
        className: stock > 0 ? 'text-green-600' : 'text-red-600'
      };
    } else {
      stockDisplayInfo = {
        text: `Stock no informado para ${selectedSucursal.nombre}`,
        className: 'text-gray-500'
      };
    }
  } else if (!selectedSucursal && product.stock_info && sucursales.length > 0) {
    // Lógica para encontrar sucursal con más stock si no hay una seleccionada
    let maxStock = -1;
    let sucursalConMasStock: string | null = null;
    for (const sucursal of sucursales) {
      const stockEnEstaSucursal = product.stock_info[sucursal.id];
      if (stockEnEstaSucursal !== undefined && stockEnEstaSucursal > maxStock) {
        maxStock = stockEnEstaSucursal;
        sucursalConMasStock = sucursal.nombre;
      }
    }
    if (sucursalConMasStock && maxStock > 0) {
      stockDisplayInfo = {
        text: `Disponible (${maxStock} en ${sucursalConMasStock})`,
        className: 'text-blue-600 italic'
      };
    } else if (sucursalConMasStock && maxStock === 0) {
        stockDisplayInfo = {
        text: `Agotado (verificado en ${sucursalConMasStock})`,
        className: 'text-red-600 italic'
      };
    }
     else {
      stockDisplayInfo = { text: "Verificar stock en sucursales", className: "text-gray-500" };
    }
  }

  // Intenta obtener una imagen. Si no hay imagen_url, usa un placeholder.
  const imageUrl = product.imagen || 'https://via.placeholder.com/300x200.png?text=Sin+Imagen';

  return (
    <Link to={`/productos/${product.id}`} className="block group"> {/* Enlace a la página de detalle */}
      <div className="border rounded-lg p-4 shadow-lg group-hover:shadow-xl transition-shadow duration-300 ease-in-out bg-white text-gray-800 flex flex-col h-full"> {/* Quitado el fondo rojo, ajustado para ser una tarjeta normal. h-full para igualar alturas en un grid si es necesario */}
        {/* Contenedor para la imagen con relación de aspecto */}
        <div className="w-full overflow-hidden rounded-md mb-3 bg-gray-200 h-40"> {/* Altura fija más pequeña para la imagen, ej: h-40 (10rem) y mb-3 */}
          <img 
            src={imageUrl} 
            alt={product.nombre} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" // Efecto de zoom en hover
          />
        </div>
        <h3 className="text-lg font-semibold mb-2 text-gray-900 group-hover:text-blue-600 transition-colors duration-300">{product.nombre}</h3> {/* mt-auto quitado para que el texto fluya naturalmente, ajustado tamaño y color */}
        {product.descripcion && <p className="mb-1 text-xs text-gray-600 h-12 overflow-hidden">{product.descripcion}</p>}
        {product.marca_nombre && <p className="text-xs text-gray-500 mb-1">Marca: {product.marca_nombre}</p>}
        {product.categoria_nombre && <p className="text-xs text-gray-500 mb-3">Categoría: {product.categoria_nombre}</p>}
        <div className="mt-auto"> {/* Contenedor para empujar precio y botón hacia abajo */}
          <div className="mb-3">
            {(() => {
              const originalPriceNum = product.precio_original ? parseFloat(product.precio_original) : NaN;
              // Asumimos que product.precio_final es string según la interfaz Product
              const finalPriceNum = product.precio_final ? parseFloat(product.precio_final) : NaN; 

              if (product.info_promocion_aplicada && !isNaN(finalPriceNum) && !isNaN(originalPriceNum) && finalPriceNum < originalPriceNum) {
                return (
                  <>
                    <p className="text-sm text-gray-500 line-through">
                      Antes: ${originalPriceNum.toLocaleString('es-CL')}
                    </p>
                    <p className="text-xl font-bold text-red-600">
                      Ahora: ${finalPriceNum.toLocaleString('es-CL')}
                    </p>
                    <div className="mt-1 text-xs text-green-600">
                      ¡Oferta! {product.info_promocion_aplicada.titulo}
                    </div>
                  </>
                );
              } else if (!isNaN(originalPriceNum)) {
                return (
                  <p className="text-xl font-bold text-blue-600">
                    ${originalPriceNum.toLocaleString('es-CL')}
                  </p>
                );
              } else {
                return <p className="text-xl font-bold text-gray-500">Precio no disponible</p>;
              }
            })()}
          </div>
          <div className={`mb-3 text-xs ${stockDisplayInfo.className}`}> {/* Ajustado a text-xs */}
            <p>{stockDisplayInfo.text}</p>
          </div>
          <button 
            onClick={(e) => { 
              e.preventDefault(); // Prevenir navegación si el botón está dentro de Link
              const priceToAdd = product.precio_final ? parseFloat(product.precio_final) : parseFloat(product.precio_original);
              addToCart({
                id: product.id,
                name: product.nombre,
                price: priceToAdd,
                quantity: 1, // Añadir 1 unidad por defecto
              });
              alert(`${product.nombre} añadido al carrito.`);
            }}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors duration-300 text-sm"
          >
            Añadir al Carrito
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;