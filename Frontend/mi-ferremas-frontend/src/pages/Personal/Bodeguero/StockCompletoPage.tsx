import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../../services/api';

// Interfaz para el detalle completo del stock
interface StockDetalleItem {
  id: number;
  producto_detalle: {
    id: number;
    nombre: string;
    sku: string;
  };
  bodega_nombre: string;
  cantidad: number;
  stock_minimo: number | null;
  ultima_actualizacion: string;
}

const StockCompletoPage: React.FC = () => {
  const [stockCompleto, setStockCompleto] = useState<StockDetalleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para filtros y ordenamiento
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroBodega, setFiltroBodega] = useState('');
  const [orden, setOrden] = useState<{ key: keyof StockDetalleItem | 'producto_nombre' | 'bodega_nombre', direccion: 'asc' | 'desc' }>({ key: 'producto_nombre', direccion: 'asc' });

  useEffect(() => {
    const fetchStockCompleto = async () => {
      setLoading(true);
      setError(null);
      try {
        // Endpoint que devuelve el stock detallado por bodega
        const response = await apiClient.get<StockDetalleItem[]>('/inventario/detalles-inventario-bodega/');
        setStockCompleto(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Error al cargar el stock completo.');
      } finally {
        setLoading(false);
      }
    };

    fetchStockCompleto();
  }, []);

  const stockFiltradoYOrdenado = useMemo(() => {
    let items = [...stockCompleto];

    // Filtrado
    if (filtroNombre) {
      items = items.filter(item => 
        item.producto_detalle.nombre.toLowerCase().includes(filtroNombre.toLowerCase()) ||
        item.producto_detalle.sku.toLowerCase().includes(filtroNombre.toLowerCase())
      );
    }
    if (filtroBodega) {
      items = items.filter(item => 
        item.bodega_nombre.toLowerCase().includes(filtroBodega.toLowerCase())
      );
    }

    // Ordenamiento
    items.sort((a, b) => {
      let valA, valB;

      if (orden.key === 'producto_nombre') {
        valA = a.producto_detalle.nombre.toLowerCase();
        valB = b.producto_detalle.nombre.toLowerCase();
      } else if (orden.key === 'bodega_nombre') {
        valA = a.bodega_nombre.toLowerCase();
        valB = b.bodega_nombre.toLowerCase();
      } else {
        // @ts-ignore
        valA = a[orden.key];
        // @ts-ignore
        valB = b[orden.key];
      }

      // Manejar valores nulos para que no rompan la comparación
      if (valA === null) return valB === null ? 0 : 1; // Mover nulos al final
      if (valB === null) return -1; // Mover nulos al final

      if (valA < valB) {
        return orden.direccion === 'asc' ? -1 : 1;
      }
      if (valA > valB) {
        return orden.direccion === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return items;
  }, [stockCompleto, filtroNombre, filtroBodega, orden]);

  const cambiarOrden = (key: keyof StockDetalleItem | 'producto_nombre' | 'bodega_nombre') => {
    setOrden(prevOrden => ({
      key,
      direccion: prevOrden.key === key && prevOrden.direccion === 'asc' ? 'desc' : 'asc'
    }));
  };

  const renderIconoOrden = (key: keyof StockDetalleItem | 'producto_nombre' | 'bodega_nombre') => {
    if (orden.key !== key) return null;
    return orden.direccion === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Stock Completo por Bodega</h1>
        <Link to="/personal/bodeguero/dashboard" className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm">
          &larr; Volver al Dashboard
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            placeholder="Buscar por producto o SKU..."
            className="p-2 border rounded-md"
            value={filtroNombre}
            onChange={e => setFiltroNombre(e.target.value)}
          />
          <input
            type="text"
            placeholder="Filtrar por bodega..."
            className="p-2 border rounded-md"
            value={filtroBodega}
            onChange={e => setFiltroBodega(e.target.value)}
          />
        </div>

        {loading && <p>Cargando stock...</p>}
        {error && <p className="text-red-500">{error}</p>}
        
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => cambiarOrden('producto_nombre')}>
                    Producto {renderIconoOrden('producto_nombre')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => cambiarOrden('bodega_nombre')}>
                    Bodega {renderIconoOrden('bodega_nombre')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => cambiarOrden('cantidad')}>
                    Cantidad {renderIconoOrden('cantidad')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => cambiarOrden('stock_minimo')}>
                    Umbral Mínimo {renderIconoOrden('stock_minimo')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => cambiarOrden('ultima_actualizacion')}>
                    Última Actualización {renderIconoOrden('ultima_actualizacion')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockFiltradoYOrdenado.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.producto_detalle.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.producto_detalle.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.bodega_nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">{item.cantidad}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.stock_minimo ?? 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.ultima_actualizacion).toLocaleString()}</td>
                  </tr>
                ))}
                {stockFiltradoYOrdenado.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No se encontraron registros de stock.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockCompletoPage;