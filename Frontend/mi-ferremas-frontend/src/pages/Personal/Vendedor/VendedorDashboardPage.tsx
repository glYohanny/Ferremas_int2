import React from 'react';
import BuscadorPedidos from '../../../components/Personal/Vendedor/BuscadorPedidos';
import ClientesFrecuentesWidget from '../../../components/Personal/Vendedor/ClientesFrecuentesWidget';
import CatalogoProductosWidget from '../../../components/Personal/Vendedor/CatalogoProductosWidget';

const VendedorDashboardPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4 bg-gray-50 min-h-screen">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard del Vendedor</h1>
        <p className="text-gray-600">Bienvenido al panel de ventas. Gestiona pedidos, clientes y productos.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Principal - Buscador de Pedidos */}
        <div className="lg:col-span-2">
          <BuscadorPedidos />
        </div>

        {/* Columna Lateral - Clientes y Catálogo */}
        <div className="space-y-8">
          <ClientesFrecuentesWidget />
          <CatalogoProductosWidget />
        </div>
      </div>

      {/* Aquí se pueden añadir los componentes "extra" en el futuro */}
      {/* 
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <ResumenVentasWidget />
          <MetasVentaWidget />
          <AlertasOfertasWidget />
        </div>
      */}
    </div>
  );
};

export default VendedorDashboardPage;
