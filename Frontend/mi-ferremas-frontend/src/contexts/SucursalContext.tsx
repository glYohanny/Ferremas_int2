import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Sucursal, getSucursales } from '../services/productService'; // Ajusta la ruta si es necesario

interface SucursalContextType {
  sucursales: Sucursal[];
  selectedSucursal: Sucursal | null;
  favoriteSucursalId: number | null;
  setSelectedSucursalById: (id: number | null) => void;
  isLoadingSucursales: boolean;
  setFavoriteSucursalId: (id: number | null) => void;
  refreshSucursales: () => void; // Para poder recargar las sucursales si es necesario
}

const SucursalContext = createContext<SucursalContextType | undefined>(undefined);

export const SucursalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState<Sucursal | null>(null);
  const [favoriteSucursalId, setFavoriteSucursalIdState] = useState<number | null>(() => {
    const savedFav = localStorage.getItem('favoriteSucursalId');
    return savedFav ? parseInt(savedFav, 10) : null;
  });
  const [isLoadingSucursales, setIsLoadingSucursales] = useState(true);

  const fetchSucursales = useCallback(async () => {
    try {
      setIsLoadingSucursales(true);
      const data = await getSucursales();
      console.log('[SucursalContext] Datos de sucursales recibidos:', data); // Log para ver qué llega

      if (Array.isArray(data)) {
        setSucursales(data);

        // Lógica para seleccionar sucursal basada en la favorita o la primera disponible
        // Solo intentar seleccionar si hay sucursales y no hay una ya seleccionada (para evitar bucles si selectedSucursal es dependencia)
        if (data.length > 0) {
          const currentFavorite = data.find(s => s.id === favoriteSucursalId);
          if (currentFavorite) {
            setSelectedSucursal(currentFavorite);
          } else {
            // Si no hay favorita o la favorita no está en la lista, seleccionar la primera
            setSelectedSucursal(data[0]);
          }
        } else {
          setSelectedSucursal(null); // No hay sucursales, no seleccionar ninguna
        }
      } else {
        console.error("Error: getSucursales no devolvió un array. Recibido:", data);
        setSucursales([]); // Asegurar que sucursales sea un array vacío en caso de error/datos incorrectos
        setSelectedSucursal(null);
      }
    } catch (error) {
      console.error("Error fetching sucursales:", error);
      setSucursales([]); // Asegurar que sucursales sea un array vacío en caso de error en la petición
      setSelectedSucursal(null);
    } finally {
      setIsLoadingSucursales(false);
    }
  }, [favoriteSucursalId]); // Quitar selectedSucursal de las dependencias para evitar recargas por su propia actualización

  useEffect(() => {
    fetchSucursales();
  }, [fetchSucursales]); // useEffect ahora depende de la función memoizada

  const setSelectedSucursalById = (id: number | null) => {
    const sucursal = sucursales.find(s => s.id === id) || null;
    setSelectedSucursal(sucursal);
  };

  const setFavoriteSucursalId = (id: number | null) => {
    localStorage.setItem('favoriteSucursalId', id ? String(id) : '');
    if (!id) localStorage.removeItem('favoriteSucursalId'); // Limpiar si es null
    setFavoriteSucursalIdState(id);
  };

  return (
    <SucursalContext.Provider value={{ sucursales, selectedSucursal, favoriteSucursalId, setSelectedSucursalById, isLoadingSucursales, setFavoriteSucursalId, refreshSucursales: fetchSucursales }}>
      {children}
    </SucursalContext.Provider>
  );
};

export const useSucursal = (): SucursalContextType => {
  const context = useContext(SucursalContext);
  if (context === undefined) {
    throw new Error('useSucursal must be used within a SucursalProvider');
  }
  return context;
};