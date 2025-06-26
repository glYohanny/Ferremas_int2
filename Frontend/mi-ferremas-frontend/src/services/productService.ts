import apiClient from './api'; // Tu cliente Axios configurado

// Interfaz para la información de la promoción aplicada
export interface InfoPromocionAplicada {
  id: number;
  titulo: string;
  tipo_promocion_display: string;
  valor: number | string | null;
}

// Interfaz para Sucursal (debe coincidir con SucursalSerializer del backend)
export interface Sucursal {
  id: number;
  nombre: string;
  direccion?: string; // Asumiendo que puede ser opcional
}

// Interfaz para la información de stock que vendrá en el producto
export interface StockInfo {
  [sucursalId: number]: number; // Mapea sucursal_id a cantidad
}

// Define la interfaz para un Producto, asegurándote que coincida con los datos del backend
export interface Product {
  id: number;
  nombre: string;
  sku?: string;
  marca?: number; // ID de la marca
  marca_nombre?: string; // Nombre de la marca
  categoria?: number; // ID de la categoría
  categoria_nombre?: string; // Nombre de la categoría
  descripcion?: string; 
  imagen?: string | null; // La URL de la imagen, puede ser null

  // Campos de precio actualizados para reflejar las promociones
  precio_original: string; // El backend envía DecimalField como string
  precio_final: string;    // El backend envía DecimalField como string
  info_promocion_aplicada: InfoPromocionAplicada | null;  stock_info?: StockInfo; // Nuevo campo para el stock por sucursal

  // Otros campos que tu API de producto devuelva
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export const getProducts = async (): Promise<Product[]> => {
  const response = await apiClient.get<Product[]>('/gestion-productos/'); // Corregida la URL para listar todos los productos
  return response.data;
};

export const getProductById = async (id: string | number): Promise<Product> => {
  // Asegúrate de que el endpoint sea el correcto para obtener un solo producto
  const response = await apiClient.get<Product>(`/gestion-productos/${id}/`); // Corregida la URL para obtener un producto por ID
  return response.data;
};

// Nueva función para obtener la lista de sucursales
export const getSucursales = async (): Promise<Sucursal[]> => {
  // Ajustar el endpoint para que coincida con la estructura de tu API
  const response = await apiClient.get<Sucursal[]>('/sucursales/sucursales/'); 
  return response.data;
};