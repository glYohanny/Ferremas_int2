import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Dashboard del Administrador</h1>
      <p>Bienvenido, {user?.first_name || user?.username}. Selecciona una opción:</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        <Link to="/personal/admin/generar-reportes" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-2">Generar Reportes</h2>
          <p className="text-sm text-gray-600">Visualizar y descargar reportes de ventas, inventario, etc.</p>
        </Link>
        <Link to="/personal/admin/gestionar-promociones" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-2">Gestionar Promociones</h2>
          <p className="text-sm text-gray-600">Crear y administrar promociones y descuentos de productos.</p>
        </Link>
        <Link to="/personal/admin/gestionar-usuarios" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-2">Gestionar Usuarios</h2>
          <p className="text-sm text-gray-600">Listar, filtrar y administrar usuarios del sistema.</p>
        </Link>
        <Link to="/personal/admin/gestionar-locaciones" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-2">Gestionar Sucursales y Bodegas</h2>
          <p className="text-sm text-gray-600">Administrar sucursales y bodegas de la empresa.</p>
        </Link>
        <Link to="/personal/admin/gestionar-productos" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-2">Gestionar Productos</h2>
          <p className="text-sm text-gray-600">Administrar el catálogo de productos, categorías y marcas.</p>
        </Link>
        <Link to="/personal/admin/gestionar-stock" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-2">Gestionar Stock</h2>
          <p className="text-sm text-gray-600">Consultar y ajustar niveles de stock en bodegas.</p>
        </Link>
        <Link to="/personal/admin/gestionar-traspasos" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-2">Gestionar Traspasos</h2>
          <p className="text-sm text-gray-600">Administrar traspasos de stock entre sucursales.</p>
        </Link>
        <Link to="/personal/admin/proveedores" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-2">Gestionar Proveedores</h2>
          <p className="text-sm text-gray-600">Listar proveedores y crear pedidos de compra.</p>
        </Link>
        {/* Otros enlaces */}
        </div>
    </div>
  );
};

export default AdminDashboardPage;
