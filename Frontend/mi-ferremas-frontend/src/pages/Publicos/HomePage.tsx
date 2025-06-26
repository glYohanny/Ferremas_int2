import React, { useEffect, useState } from 'react';
import { getProducts, Product } from '../../services/productService';
import ProductCard from '../../components/ProductCard'; // Importa el componente de tarjeta
import { useSucursal } from '../../contexts/SucursalContext'; // Importar el hook de sucursal

const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { sucursales, selectedSucursal, setSelectedSucursalById, isLoadingSucursales, favoriteSucursalId, setFavoriteSucursalId } = useSucursal();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await getProducts();
        setProducts(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError('No se pudieron cargar los productos. Inténtalo de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) return <p className="text-center text-xl py-10">Cargando productos...</p>;
  if (error) return <p className="text-center text-red-500 text-xl py-10">{error}</p>;
  if (products.length === 0) return <p className="text-center text-xl py-10">No hay productos disponibles en este momento.</p>;
  // No mostrar selector si aún están cargando las sucursales o no hay
  const showSucursalSelector = !isLoadingSucursales && sucursales.length > 0;

  return (
    <div>
      <h1 className="text-4xl font-bold text-center text-gray-800 my-8 bg-green-500 p-10">Nuestro Catálogo</h1> {/* Prueba con fondo verde y padding grande */}

      {showSucursalSelector && (
        <div className="container mx-auto p-4 flex justify-center md:justify-end items-center mb-4">
          <label htmlFor="sucursal-selector" className="mr-2 text-gray-700">Ver stock en:</label>
          <select
            id="sucursal-selector"
            value={selectedSucursal?.id || ''}
            onChange={(e) => {
              const newId = e.target.value ? parseInt(e.target.value) : null;
              setSelectedSucursalById(newId);
            }}
            className="p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {/* <option value="">Todas (o por defecto)</option> */}
            {sucursales.map(s => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
          {selectedSucursal && (
            <button
              onClick={() => setFavoriteSucursalId(selectedSucursal.id === favoriteSucursalId ? null : selectedSucursal.id)}
              className={`ml-2 p-2 text-sm rounded-md ${selectedSucursal.id === favoriteSucursalId ? 'bg-yellow-400 hover:bg-yellow-500' : 'bg-gray-200 hover:bg-gray-300'}`}
              title={selectedSucursal.id === favoriteSucursalId ? "Quitar de favoritas" : "Marcar como favorita"}
            >
              {selectedSucursal.id === favoriteSucursalId ? '🌟 Favorita' : '⭐ Marcar Favorita'}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default HomePage;