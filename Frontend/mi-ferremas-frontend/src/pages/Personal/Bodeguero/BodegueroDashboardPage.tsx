import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../../services/api';

// Interfaces de ejemplo (deberás ajustarlas a tus modelos reales)
interface StockItem {
  id: number;
  nombre: string;
  stockDisponible: number;
  umbralMinimo: number;
}

interface EntregaHistorialItem {
  id: number;
  cliente_detalle?: { usuario?: { email?: string, first_name?: string, last_name?: string }};
  estado_display: string;
  fecha_entregado?: string;
  total_pedido: string;
  // Añade cualquier otro campo que necesites del PedidoClienteSerializer
}

interface PedidoAPreparar {
  id: number;
  cliente: string; // ID del cliente, mantenido por si cliente_detalle no viene
  cliente_detalle?: { usuario?: { email?: string, first_name?: string, last_name?: string }}; // Ajustar según serializer
  estado_display: string; // Estado general del pedido (PAGADO, PROCESANDO, etc.)
  estado_preparacion: string; // El estado específico de preparación (PENDIENTE_ASIGNACION, ASIGNADO, etc.)
  estado_preparacion_display: string; // Texto legible del estado de preparación
  fecha_pedido: string; // Usaremos esta como referencia de cuándo se creó
  bodeguero_asignado_detalle?: { email?: string } | null;
}

interface BodegaItem { // Nueva interfaz para las bodegas
  id: number;
  sucursal_nombre: string; // Cambiado de 'nombre' a 'sucursal_nombre' para coincidir con el backend
  direccion?: string; // Opcional, por si quieres mostrarla
}


const BodegueroDashboardPage: React.FC = () => {
  // Estados de ejemplo para las diferentes secciones
  const [resumenStock, setResumenStock] = useState<StockItem[]>([]);
  const [pedidosPendientes, setPedidosPendientes] = useState<PedidoAPreparar[]>([]);

  // Estados para la Actualización Manual de Stock
  const [adjustmentProductIdentifier, setAdjustmentProductIdentifier] = useState(''); // Puede ser SKU o nombre
  const [adjustmentBodegaId, setAdjustmentBodegaId] = useState(''); // Volvemos a usar el ID para el envío
  const [adjustmentQuantity, setAdjustmentQuantity] = useState<number | ''>('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  const [updateStockError, setUpdateStockError] = useState<string | null>(null);
  const [updateStockSuccess, setUpdateStockSuccess] = useState<string | null>(null);

  // Estados para el historial de entregas
  const [historialEntregas, setHistorialEntregas] = useState<EntregaHistorialItem[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const [errorHistorial, setErrorHistorial] = useState<string | null>(null);

  // NUEVOS ESTADOS PARA TRASPASOS
  const [traspasosEnTransito, setTraspasosEnTransito] = useState<TraspasoEnTransito[]>([]);
  const [loadingTraspasos, setLoadingTraspasos] = useState(true);
  const [errorTraspasos, setErrorTraspasos] = useState<string | null>(null);

  const [stockCritico, setStockCritico] = useState<StockItem[]>([]); // NUEVO ESTADO
  const [stockAdvertencia, setStockAdvertencia] = useState<StockItem[]>([]); // Para productos <= 30 y > 15

  // NUEVOS ESTADOS PARA BODEGAS
  const [bodegas, setBodegas] = useState<BodegaItem[]>([]);
  const [loadingBodegas, setLoadingBodegas] = useState(true);
  const [errorBodegas, setErrorBodegas] = useState<string | null>(null);

  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [errorPedidos, setErrorPedidos] = useState<string | null>(null);

  // Handler para la actualización manual de stock
  const handleStockAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingStock(true);
    setUpdateStockError(null);
    setUpdateStockSuccess(null);

    if (!adjustmentProductIdentifier || !adjustmentBodegaId || adjustmentQuantity === '' || !adjustmentReason) {
      setUpdateStockError('Por favor, complete todos los campos.');
      setIsUpdatingStock(false);
      return;
    }

    const quantity = Number(adjustmentQuantity);
    if (isNaN(quantity) || quantity === 0) { // Quantity can be negative
      setUpdateStockError('La cantidad debe ser un número distinto de cero.');
      setIsUpdatingStock(false);
      return;
    }

    try {
      await apiClient.post('/inventario/ajuste-manual-stock/', {
        producto_identificador: adjustmentProductIdentifier,
        bodega_id: Number(adjustmentBodegaId), // Enviamos el ID numérico
        cantidad: quantity, // La cantidad a sumar o restar
        motivo: adjustmentReason,
      });

      setUpdateStockSuccess('Ajuste de stock registrado con éxito.');
      setAdjustmentQuantity(''); // Limpiar cantidad
      setAdjustmentReason(''); // Limpiar motivo
      fetchStockData(); // Recargar datos de stock para reflejar el cambio
    } catch (err: any) {
      setUpdateStockError(err.response?.data?.detail || err.message || 'Error al registrar el ajuste de stock.');
    } finally {
      setIsUpdatingStock(false);
    }
  };
    // Handler para seleccionar un producto del resumen de stock
  const handleSelectProductForAdjustment = (product: StockItem) => {
  setAdjustmentProductIdentifier(product.nombre); // Cambiado para usar el nombre del producto
  };

  const [searchTerm, setSearchTerm] = useState(''); // Para el buscador
  
  const [loadingStock, setLoadingStock] = useState(true);
  const [errorStock, setErrorStock] = useState<string | null>(null);


  // Carga de datos para el resumen de stock
  const fetchStockData = async () => {
    setLoadingStock(true);
    setErrorStock(null);
    try {
      const stockRes = await apiClient.get<StockItem[]>('/inventario/resumen-stock-bodeguero/');
      setResumenStock(stockRes.data);
    } catch (err: any) {
          setErrorStock(
        err.response?.data?.detail ||
          err.message ||
          'Error al cargar el resumen de stock.'
      );
      console.error("Error fetching stock data:", err);
      setResumenStock([]);
    } finally {
      setLoadingStock(false);
    }
  };

  const fetchBodegas = async () => {
    setLoadingBodegas(true);
    setErrorBodegas(null);
    try {
      // Asegúrate de que este endpoint exista y devuelva la lista de bodegas
      const response = await apiClient.get<BodegaItem[]>('/sucursales/bodegas/');
      setBodegas(response.data);
    } catch (err: any) {
      setErrorBodegas(err.response?.data?.detail || err.message || 'Error al cargar las bodegas.');
      console.error("Error fetching bodegas:", err);
      setBodegas([]);
    } finally {
      setLoadingBodegas(false);
    }
  };

  const fetchHistorialEntregas = async () => {
    setLoadingHistorial(true);
    setErrorHistorial(null);
    try {
      // Fetch from the new endpoint in pedido_app
      const response = await apiClient.get<{results: EntregaHistorialItem[]}>('/pedidos/historial-entregas/');
      // Take only the first 5 for the dashboard preview
      setHistorialEntregas((response.data.results || response.data).slice(0, 5));
    } catch (err: any) {
      setErrorHistorial(err.response?.data?.detail || 'Error al cargar el historial de entregas.');
      console.error("Error fetching delivery history:", err);
    } finally {
      setLoadingHistorial(false);
    }
  };

  useEffect(() => {
    fetchStockData(); // Carga inicial del stock
    fetchBodegas(); // Carga inicial de las bodegas
    fetchHistorialEntregas();
  }, []);
  // Calcula el stock crítico cada vez que se actualiza el resumen de stock
  useEffect(() => {
    const calcularStockCritico = () => {
      setStockCritico(resumenStock.filter(item => item.stockDisponible <= 15));
      setStockAdvertencia(
        resumenStock.filter(item => item.stockDisponible > 15 && item.stockDisponible <= 30)
      );
    };
    calcularStockCritico();
  }, [resumenStock]);

  // Carga de datos para pedidos pendientes por preparar
  const fetchPedidosPendientes = async () => {
    setLoadingPedidos(true);
    setErrorPedidos(null);
    try {
      // El endpoint /api/pedidos/pedidos-cliente/ ya debería filtrar por bodeguero si está logueado como tal
      const response = await apiClient.get<{results: PedidoAPreparar[], count: number} >('/pedidos/pedidos-cliente/'); // Asumiendo paginación
      setPedidosPendientes(response.data.results || response.data); // Ajustar si la API devuelve paginación
    } catch (err: any) {
      setErrorPedidos(err.response?.data?.detail || err.message || 'Error al cargar pedidos pendientes.');
      console.error("Error fetching pending orders:", err);
      setPedidosPendientes([]);
    } finally {
      setLoadingPedidos(false);
    }
  };

   const fetchTraspasosEnTransito = async () => {
    setLoadingTraspasos(true);
    setErrorTraspasos(null);
    try {
      // El endpoint /api/pedidos/pedidos-cliente/ ya debería filtrar por bodeguero si está logueado como tal
      // CORREGIR ESTE ENDPOINT PARA QUE APUNTE A LA API DE TRASPASOS
      const response = await apiClient.get<{results: TraspasoEnTransito[], count: number} >('/inventario/traspasos-internos/'); // Ejemplo: /inventario/traspasos-internos/
      setTraspasosEnTransito(response.data.results || response.data); // Ajustar si la API devuelve paginación
    } catch (err: any) {
      setErrorTraspasos(err.response?.data?.detail || err.message || 'Error al cargar traspasos en tránsito.');
      console.error("Error fetching traspasos en transito:", err);
      setTraspasosEnTransito([]);
    } finally {
      setLoadingTraspasos(false);
    }
  };

  // Filtrar stock basado en searchTerm
  const filteredStock = useMemo(() => {
    if (!searchTerm) {
      return resumenStock;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return resumenStock.filter(item =>
      item.nombre.toLowerCase().includes(lowercasedFilter)
      // También podrías buscar por ID si lo conviertes a string:
      // || item.id.toString().includes(lowercasedFilter) 
    );
  }, [searchTerm, resumenStock]);

   useEffect(() => {
    fetchTraspasosEnTransito(); // Cargar traspasos
    fetchPedidosPendientes();
   }, []);

  const handleTomarPedido = async (pedidoId: number) => {
    try {
      await apiClient.post(`/pedidos/pedidos-cliente/${pedidoId}/tomar_pedido_preparacion/`);
      fetchPedidosPendientes(); // Recargar la lista
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.detail || "Error al tomar el pedido.");
      console.error("Error al tomar pedido:", err.response);
    }
  };

  const handleConfirmarPreparacion = async (pedidoId: number) => {
     try {
      await apiClient.post(`/pedidos/pedidos-cliente/${pedidoId}/confirmar_preparacion_pedido/`);
      fetchPedidosPendientes(); // Recargar la lista
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.detail || "Error al confirmar preparación.");
      console.error("Error al confirmar preparación:", err.response);
    }
  };

  const getClienteNombre = (pedido: PedidoAPreparar | EntregaHistorialItem) => {
    if (pedido.cliente_detalle?.usuario) {
      const { first_name, last_name, email } = pedido.cliente_detalle.usuario;
      if (first_name && last_name) return `${first_name} ${last_name}`;
      if (email) return email;
    }
    // Type guard to ensure 'cliente' property exists before accessing it
    if ('cliente' in pedido && pedido.cliente) {
      return `Cliente ID: ${pedido.cliente}`;
    }
    return 'Cliente Desconocido';
  }

  const getTraspasoEstadoColor = (estado: string) => {
    if (estado === 'PENDIENTE') return 'text-gray-600';
    if (estado === 'EN_TRANSITO') return 'text-blue-600';
    if (estado === 'RECIBIDO_PENDIENTE_VERIFICACION') return 'text-orange-600';
    if (estado === 'COMPLETADO') return 'text-green-600';
    if (estado === 'CANCELADO') return 'text-red-600';
    return 'text-gray-500';

  }
  const estadoTraspasoDisplayTextMap: { [key: string]: string } = {
    'PENDIENTE': 'Pendiente',
    'EN_TRANSITO': 'En Tránsito',
    'RECIBIDO_PENDIENTE_VERIFICACION': 'Recibido (Pend. Verificación)',
    'COMPLETADO': 'Completado',
    'CANCELADO': 'Cancelado',
  };

  const getEstadoPreparacionColor = (estadoPrep: string) => {
    if (estadoPrep === 'PENDIENTE_ASIGNACION') return 'text-gray-600';
    if (estadoPrep === 'ASIGNADO' || estadoPrep === 'EN_PREPARACION') return 'text-blue-600';
    if (estadoPrep === 'LISTO_PARA_ENTREGA') return 'text-green-600';
    return 'text-gray-500';
  }

  return (
    <>
     {/* Alertas de Stock Crítico (Mostrar solo si hay productos en stock crítico) */}
    {stockCritico.length > 0 && (
      <div className="container mx-auto p-6 bg-red-100 border border-red-400 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold text-red-700 mb-4">
          🚨 ¡ALERTA! Stock Crítico
        </h2>
        <p className="text-sm text-red-600">
          Los siguientes productos tienen un stock muy bajo (15 unidades o menos) y requieren atención inmediata:
        </p>
        <ul className="list-disc list-inside text-sm text-red-700 font-medium">
          {stockCritico.map((item) => (
            <li key={item.id}>{item.nombre} ({item.stockDisponible} unidades)</li>
          ))}
        </ul>
      </div>
    )}
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard del Bodeguero</h1>
      <p className="text-gray-600">Bienvenido al panel de gestión de bodega.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Resumen de Stock Actual */}
        <div className="bg-white p-6 rounded-lg shadow-md min-h-[400px] flex flex-col"> {/* Quitamos col-span para que ocupe 1/3 en lg y 1/2 en md */}
          <h2 className="text-xl font-semibold text-gray-700 mb-4">📋 Resumen de Stock Actual</h2>
          {/* Buscador Rápido de Productos (Movido aquí) */}
          <div className="mb-4">
            <label htmlFor="search-product-stock" className="sr-only">Buscar producto</label>
            <input 
              type="search" 
              id="search-product-stock" 
              placeholder="Buscar producto por nombre..." 
              className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* Lista de productos con scroll */}
          {loadingStock && <p className="text-sm text-gray-500">Cargando stock...</p>}
          {errorStock && <p className="text-sm text-red-500">{errorStock}</p>}
          {!loadingStock && !errorStock && (
            <ul className="space-y-2 overflow-y-auto max-h-[250px] flex-grow"> {/* Ajusta max-h según necesites */}
            {filteredStock.map(item => {
              let itemClass = 'p-2 rounded-md border ';
              if (item.stockDisponible <= 15) {
                itemClass += 'bg-red-100 border-red-300 text-red-700';
              } else if (item.stockDisponible <= 30) {
                itemClass += 'bg-yellow-100 border-yellow-300 text-yellow-700';
              } else {
                itemClass += 'bg-green-100 border-green-300 text-green-700';
              }
              return (
                <li
                  key={item.id}
                  className={`${itemClass} cursor-pointer hover:bg-opacity-75`} // Añadimos cursor y hover visual
                  onClick={() => handleSelectProductForAdjustment(item)} // Añadimos el manejador de clic
                  title={`Clic para ajustar stock de ${item.nombre}`} // Tooltip opcional
                >
                  {item.nombre}: <strong>{item.stockDisponible}</strong> (Umbral Ref: {item.umbralMinimo})
                </li>
              );
            })}
            {filteredStock.length === 0 && !loadingStock && <p className="text-sm text-gray-500">No hay datos de stock para mostrar o que coincidan con la búsqueda.</p>}
          </ul>
          )}
          <Link to="/personal/bodeguero/stock-completo" className="text-blue-600 hover:underline mt-4 inline-block text-sm">Ver stock completo &rarr;</Link>
        </div>

        {/* Actualización Manual de Stock (Movido aquí) */}
        <div className="bg-white p-6 rounded-lg shadow-md min-h-[400px] flex flex-col">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">🔄 Actualización Manual de Stock</h2>
         <form className="space-y-4" onSubmit={handleStockAdjustmentSubmit}>
            <div>
              <label htmlFor="adjustment-product" className="block text-sm font-medium text-gray-700">SKU o Nombre del Producto</label>
              <input
                type="text"
                id="adjustment-product"
                placeholder="Ej: SKU123 o Martillo"
                className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={adjustmentProductIdentifier}
                onChange={(e) => setAdjustmentProductIdentifier(e.target.value)}
                disabled={isUpdatingStock}
              />
            </div>
            <div>
              <label htmlFor="adjustment-bodega" className="block text-sm font-medium text-gray-700">Bodega</label>
              <select
                id="adjustment-bodega"
                className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={adjustmentBodegaId}
                onChange={(e) => setAdjustmentBodegaId(e.target.value)}
                disabled={isUpdatingStock || loadingBodegas}
              >
                <option value="">Seleccione una bodega</option>
                {loadingBodegas && <option value="" disabled>Cargando bodegas...</option>}
                {!loadingBodegas && bodegas.map(bodega => (
                  <option key={bodega.id} value={bodega.id.toString()}>
                    {bodega.sucursal_nombre}
                  </option>
                ))}
              </select>
              {errorBodegas && <p className="text-xs text-red-500 mt-1">{errorBodegas}</p>}
              {!loadingBodegas && bodegas.length === 0 && !errorBodegas && (
                <p className="text-xs text-gray-500 mt-1">
                  No hay bodegas disponibles. Asegúrate de que se hayan cargado correctamente.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="adjustment-quantity" className="block text-sm font-medium text-gray-700">Cantidad a Ajustar (+/-)</label>
              <input
                type="number"
                id="adjustment-quantity"
                placeholder="Ej: 10 o -5"
                className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={adjustmentQuantity}
                onChange={(e) => setAdjustmentQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={isUpdatingStock}
              />
              <p className="text-xs text-gray-500 mt-1">Positivo para añadir, negativo para quitar.</p>
            </div>
            <div>
              <label htmlFor="adjustment-reason" className="block text-sm font-medium text-gray-700">Motivo del Ajuste</label>
              <textarea
                id="adjustment-reason"
                placeholder="Ej: Devolución cliente, Daño en almacén, Conteo de inventario"
                rows={3}
                className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                disabled={isUpdatingStock}
              ></textarea>
            </div>
            {updateStockError && <p className="text-sm text-red-600 bg-red-100 p-2 rounded-md">{updateStockError}</p>}
            {updateStockSuccess && <p className="text-sm text-green-600 bg-green-100 p-2 rounded-md">{updateStockSuccess}</p>}
            <button type="submit"
              className={`w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 ${isUpdatingStock ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isUpdatingStock}
            >
              {isUpdatingStock ? 'Registrando...' : 'Registrar Ajuste'}
            </button>
          </form>
        </div>

        {/* Pedidos Pendientes por Preparar */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">🚚 Pedidos Pendientes por Preparar</h2>
          {loadingPedidos && <p className="text-sm text-gray-500">Cargando pedidos...</p>}
          {errorPedidos && <p className="text-sm text-red-500">{errorPedidos}</p>}
          {!loadingPedidos && !errorPedidos && (
            <ul className="space-y-3 max-h-96 overflow-y-auto"> {/* Scroll para la lista de pedidos */}
              {pedidosPendientes.map(pedido => (
                <li key={pedido.id} className="p-3 border rounded-md hover:shadow-lg transition-shadow">
                  <p><strong>Pedido #{pedido.id}</strong> - Cliente: {getClienteNombre(pedido)}</p>
                  <p>Estado General: <span className="font-semibold">{pedido.estado_display}</span></p>
                  <p>Preparación: <span className={`font-semibold ${getEstadoPreparacionColor(pedido.estado_preparacion)}`}>{pedido.estado_preparacion_display}</span></p>
                  {pedido.bodeguero_asignado_detalle && <p className="text-xs text-gray-500">Asignado a: {pedido.bodeguero_asignado_detalle.email}</p>}
                  <p className="text-xs text-gray-500">Fecha Pedido: {new Date(pedido.fecha_pedido).toLocaleDateString()}</p>
                  
                  {pedido.estado_preparacion === 'PENDIENTE_ASIGNACION' && (
                    <button onClick={() => handleTomarPedido(pedido.id)} className="mt-2 bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded text-sm">
                      Tomar Pedido
                    </button>
                  )}
                  {(pedido.estado_preparacion === 'ASIGNADO' || pedido.estado_preparacion === 'EN_PREPARACION') && pedido.bodeguero_asignado_detalle && ( // Solo mostrar si está asignado a alguien
                    <button onClick={() => handleConfirmarPreparacion(pedido.id)} className="mt-2 bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm">Confirmar Preparación</button>
                  )}
                </li>
              ))}
              {pedidosPendientes.length === 0 && !loadingPedidos && <p className="text-sm text-gray-500">No hay pedidos pendientes para preparar.</p>}
            </ul>
          )}
           <Link to="/personal/bodeguero/pedidos-por-preparar" className="text-blue-600 hover:underline mt-4 inline-block text-sm">Ver todos los pedidos por preparar &rarr;</Link>
        </div>

        {/* Alertas de Reposición */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">🔔 Alertas de Reposición</h2>
          {(stockCritico.length > 0 || stockAdvertencia.length > 0) ? (
            <div className="space-y-2 max-h-48 overflow-y-auto text-sm">
              {stockCritico.map(item => (
                <p key={`crit-${item.id}`} className="text-red-600 font-medium">CRÍTICO: {item.nombre} ({item.stockDisponible} uds)</p>
              ))}
              {stockAdvertencia.map(item => (
                <p key={`adv-${item.id}`} className="text-yellow-600">ADVERTENCIA: {item.nombre} ({item.stockDisponible} uds)</p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No hay productos con stock bajo o en advertencia.</p>
          )}
          
          <button className="mt-3 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded text-sm">Generar Solicitud de Reposición</button>
        </div>

        {/* Órdenes de Compra en Tránsito */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">🔁 Órdenes de Traspaso Interno</h2>
          {loadingTraspasos && <p className="text-sm text-gray-500">Cargando traspasos...</p>}
          {errorTraspasos && <p className="text-sm text-red-500">{errorTraspasos}</p>}
          {!loadingTraspasos && !errorTraspasos && (
            <>
              <ul className="space-y-2 max-h-80 overflow-y-auto"> {/* Aumentamos max-h-48 a max-h-80 (de 12rem a 20rem) */}
                {traspasosEnTransito.map(traspaso => (
                  <li key={traspaso.id} className="p-2 border rounded-md">
                    <p><strong>Traspaso #{traspaso.id}</strong></p>
                    <p>De: {traspaso.sucursal_origen_nombre} a {traspaso.sucursal_destino_nombre}</p>
                    <p>Estado: <span className={`font-semibold ${getTraspasoEstadoColor(traspaso.estado)}`}>{traspaso.estado_display || estadoTraspasoDisplayTextMap[traspaso.estado] || traspaso.estado}</span></p>
                    {traspaso.fecha_envio && <p className="text-xs text-gray-500">Enviado: {new Date(traspaso.fecha_envio).toLocaleDateString()}</p>}
                    {traspaso.fecha_recepcion && <p className="text-xs text-gray-500">Recibido: {new Date(traspaso.fecha_recepcion).toLocaleDateString()}</p>}
                    {!traspaso.fecha_envio && !traspaso.fecha_recepcion && <p className="text-xs text-gray-500">Pedido: {new Date(traspaso.fecha_pedido).toLocaleDateString()}</p>}
                  </li>
                ))}
                {traspasosEnTransito.length === 0 && !loadingTraspasos && <p className="text-sm text-gray-500">No hay traspasos en tránsito o pendientes.</p>}
              </ul>
              <Link to="/personal/bodeguero/traspasos-internos" className="text-blue-600 hover:underline mt-4 inline-block text-sm">Ver todos los traspasos &rarr;</Link>
            </>
          )}
        </div>
      </div>

      {/* Historial de Entregas (podría ser una sección más grande o una página separada) */}
      <div className="bg-white p-6 rounded-lg shadow-md mt-8 col-span-1 md:col-span-2 lg:col-span-3">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">📦 Historial de Entregas</h2>
        {loadingHistorial && <p className="text-sm text-gray-500">Cargando historial...</p>}
        {errorHistorial && <p className="text-sm text-red-500">{errorHistorial}</p>}
        {!loadingHistorial && !errorHistorial && (
          <>
            <ul className="space-y-3">
              {historialEntregas.map(entrega => (
                <li key={entrega.id} className="p-3 border rounded-md flex justify-between items-center">
                  <div>
                    <p><strong>Pedido #{entrega.id}</strong> a {getClienteNombre(entrega)}</p>
                    <p className="text-xs text-gray-500">Entregado: {entrega.fecha_entregado ? new Date(entrega.fecha_entregado).toLocaleString() : 'N/A'}</p>
                  </div>
                  <Link to={`/pedido/${entrega.id}`} className="text-blue-600 hover:underline text-sm">Ver Detalle</Link>
                </li>
              ))}
              {historialEntregas.length === 0 && <p className="text-sm text-gray-500">No hay entregas recientes.</p>}
            </ul>
            <Link to="/personal/bodeguero/historial-entregas" className="text-blue-600 hover:underline mt-4 inline-block text-sm">Ver historial completo &rarr;</Link>
          </>
        )}
      </div>
    </div>
    </>
  );
};

interface TraspasoEnTransito {
  id: number;
  sucursal_origen_nombre: string;
  sucursal_destino_nombre: string;
  estado: string; // The internal state value (e.g., 'EN_TRANSITO')
  estado_display?: string; // Assuming the serializer provides a display value, now optional
  motivo: string;
  fecha_pedido: string; // ISO string
  fecha_envio?: string; // ISO string
  fecha_recepcion?: string; // ISO string
  // detalles_traspaso: any[]; // Maybe not needed for the summary card
}



export default BodegueroDashboardPage;
