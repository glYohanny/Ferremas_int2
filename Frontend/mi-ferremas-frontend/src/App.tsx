import { Routes, Route, Link } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext'; // Importa useAuth
// import './App.css' // Puedes eliminar la importación de App.css si todos los estilos van a ser de Tailwind
import { CartProvider, useCart } from './contexts/CartContext'; // Importa CartProvider y useCart

// Páginas Públicas
import HomePage from './pages/Publicos/HomePage';
import ProductDetailPage from './pages/Publicos/ProductDetailPage';
import RegistroClientePage from './pages/Publicos/RegistroClientePage';
import SolicitarResetPasswordPage from './pages/Publicos/SolicitarResetPasswordPage';
import ResetPasswordConfirmPage from './pages/Publicos/ResetPasswordConfirmPage'; // Importación añadida
import LoginPage from './pages/Publicos/LoginPage';
// Páginas de Clientes

import CartPage from './pages/Clientes/CartPage'; // Importa la página del carrito
import CheckoutPage from './pages/Clientes/CheckoutPage'; // Importa la página de checkout
import OrderConfirmationPage from './pages/Clientes/OrderConfirmationPage'; // Importa la nueva página
import MisPedidosPage from './pages/Clientes/MisPedidosPage'; // Importa la página de Mis Pedidos
import OrderDetailPage from './pages/Clientes/OrderDetailPage'; // Importa la página de Detalle de Pedido
import UserProfilePage from './pages/Clientes/UserProfilePage'; // Importa la página de Perfil de Usuario
import ProtectedRoute from './components/ProtectedRoute'; // Importa el componente de ruta protegida
import AccessDeniedPage from './pages/AccessDeniedPage'; // Importa la página de acceso denegado
// Páginas de Personal (Asegúrate de que estas rutas de importación sean correctas y los archivos existan)
import AdminDashboardPage from './pages/Personal/Administrador/AdminDashboardPage';
import GenerarReportesPage from './pages/Personal/Administrador/Reportes/GenerarReportesPage';
import GestionarPromocionesPage from './pages/Personal/Administrador/Promociones/GestionarPromocionesPage';
import GestionarUsuariosPage from './pages/Personal/Administrador/AdministracionUsuarios/GestionarUsuariosPage';
import UsuarioDetallePage from './pages/Personal/Administrador/AdministracionUsuarios/UsuarioDetallePage'; // Importar la nueva página
import GestionarLocacionesPage from './pages/Personal/Administrador/GestionLocaciones/GestionarLocacionesPage'; // Importar página de locaciones
import GestionarProductosPage from './pages/Personal/Administrador/GestionProductos/GestionarProductosPage'; // Importar página de productos
import GestionarStockPage from './pages/Personal/Administrador/GestionProductos/GestionarStockPage'; // Importar página de stock
import GestionarTraspasosPage from './pages/Personal/Administrador/GestionTraspasos/GestionarTraspasosPage'; // Importar página de traspasos

import ProveedorListPage from './pages/Personal/Administrador/GestionProveedores/ProveedorListPage'; // Nueva página
import ProveedorDetailPage from './pages/Personal/Administrador/GestionProveedores/ProveedorDetailPage'; // Detalle de un proveedor
import ProveedorFormPage from './pages/Personal/Administrador/GestionProveedores/EditarProveedorPage'; // Componente unificado para crear/editar
import CrearPedidoProveedorPage from './pages/Personal/Administrador/GestionProveedores/CrearPedidoProveedorPage'; // Formulario para crear un pedido a proveedor
import PedidoProveedorListPage from './pages/Personal/Administrador/GestionProveedores/PedidoProveedorListPage'; // Lista de pedidos a proveedor
import PedidoProveedorDetailPage from './pages/Personal/Administrador/GestionProveedores/PedidoProveedorDetailPage'; // Nueva página de detalle


import BodegueroDashboardPage from './pages/Personal/Bodeguero/BodegueroDashboardPage';
import HistorialEntregasPage from './pages/Personal/Bodeguero/HistorialEntregasPage';
import PedidosPorPrepararPage from './pages/Personal/Bodeguero/PedidosPorPrepararPage'; // Importar la nueva página
import ContadorDashboardPage from './pages/Personal/Contador/ContadorDashboardPage';
import StockCompletoPage from './pages/Personal/Bodeguero/StockCompletoPage'; // Importar la nueva página
import VendedorDashboardPage from './pages/Personal/Vendedor/VendedorDashboardPage';
import PagoFallidoPage from './pages/Clientes/PagoFallidoPage'; // Importar la nueva página


const NotFoundPage = () => <h2>404 - Página No Encontrada</h2>;

// Componente de navegación con enlace al carrito
// Este componente Navigation no se está usando actualmente en el return de App.
// La navegación está inline. Vamos a modificar la navegación inline.
/* const Navigation = () => {
  const { isAuthenticated, logout, isLoading } = useAuth();
  const { totalItems } = useCart(); // Obtén la cantidad total de items del carrito

  // ... (resto de tu navegación)
  // Añade un enlace al carrito, quizás con un contador de items
}; */


function App() {
  const { isAuthenticated, logout, isLoading } = useAuth(); // Obtén el estado de autenticación
  // Para usar useCart aquí para el totalItems en la nav, CartProvider debe envolver este return.

  return (
    <CartProvider> {/* Envuelve todo el contenido que necesita acceso al carrito */}
      <AppContent isAuthenticated={isAuthenticated} logout={logout} authIsLoading={isLoading} />
    </CartProvider>
  )
}

// Creamos un subcomponente para que useCart() esté dentro de CartProvider
const AppContent: React.FC<{isAuthenticated: boolean, logout: () => void, authIsLoading: boolean}> = ({
  isAuthenticated, logout, authIsLoading
}) => {
  const { totalItems } = useCart(); // Ahora esto es seguro porque AppContent está dentro de CartProvider
  const { user } = useAuth(); // Obtener el usuario para verificar roles en la navegación
  console.log('[AppContent] authIsLoading recibido:', authIsLoading); // NUEVO LOG

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <nav className="bg-blue-600 p-4 text-white flex justify-between items-center">
        <ul className="flex space-x-4 items-center">
          <li><Link to="/" className="hover:text-blue-200">Inicio</Link></li>
          {isAuthenticated && user ? ( // Asegurarse que user no sea null
            (user.tipo_perfil === 'Personal' || user.tipo_perfil === 'Admin' || user.is_staff) ? (
              <>
                {/* Enlaces específicos para Personal/Admin */}
                {/* Comparación de roles insensible a mayúsculas/minúsculas */}
                {user.rol?.toUpperCase() === 'ADMINISTRADOR' && <li><Link to="/personal/admin/dashboard" className="hover:text-blue-200">Admin DB</Link></li>}
                {user.rol?.toUpperCase() === 'BODEGUERO' && <li><Link to="/personal/bodeguero/dashboard" className="hover:text-blue-200">Bodega DB</Link></li>}
                {user.rol?.toUpperCase() === 'CONTADOR' && <li><Link to="/personal/contador/dashboard" className="hover:text-blue-200">Contador DB</Link></li>}
                {user.rol?.toUpperCase() === 'VENDEDOR' && <li><Link to="/personal/vendedor/dashboard" className="hover:text-blue-200">Ventas DB</Link></li>}
                {/* Si es Admin (tipo_perfil o is_staff) pero no tiene rol específico, podría tener un dashboard genérico */}
                {(user.tipo_perfil === 'Admin' || (user.is_staff && !user.rol)) && 
                  <li><Link to="/personal/admin/dashboard" className="hover:text-blue-200">Admin DB General</Link></li>
                }
                <li>
                  <button
                    onClick={logout}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-3 rounded text-sm"
                  >
                    Cerrar Sesión ({user.email})
                  </button>
                </li>
              </>
            ) : ( // Es Cliente
              <>
                <li><Link to="/mis-pedidos" className="hover:text-blue-200">Mis Pedidos</Link></li>
                <li><Link to="/mi-perfil" className="hover:text-blue-200">Mi Perfil</Link></li>
                <li>
                  <button onClick={logout} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                    Cerrar Sesión
                  </button>
                </li>
              </>
            )
          ) : (
            <li><Link to="/login" className="hover:text-blue-200">Login</Link></li>
          )}
        </ul>
        <div>
          <Link to="/cart" className="hover:text-blue-200 flex items-center">
            🛒 Carrito ({totalItems})
          </Link>
        </div>
      </nav>
      <hr />
      <main className="p-4">
        {authIsLoading && <p className="text-center">Cargando autenticación...</p>}
        {/* No renderizar Routes hasta que la autenticación no esté cargando para evitar flashes de contenido */}
        {!authIsLoading && (
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password-confirm/:uidb64/:token" element={<ResetPasswordConfirmPage />} />
          <Route path="/solicitar-reset-password" element={<SolicitarResetPasswordPage />} />
          <Route path="/registro-cliente" element={<RegistroClientePage />} />
          <Route path="/productos/:idProducto" element={<ProductDetailPage />} />
          <Route path="/acceso-denegado" element={<AccessDeniedPage />} />
          <Route path="/pago-fallido" element={<PagoFallidoPage />} /> {/* Ruta añadida para la página de pago fallido */}

          {/* Rutas Protegidas (Clientes) */}
          <Route element={<ProtectedRoute allowedRoles={['Cliente']} />}>
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/pedido-confirmado/:pedidoId" element={<OrderConfirmationPage />} />
            <Route path="/mis-pedidos" element={<MisPedidosPage />} />
            <Route path="/pedido/:pedidoId" element={<OrderDetailPage />} />
            <Route path="/mi-perfil" element={<UserProfilePage />} />
          </Route>

          {/* Rutas Protegidas para Personal (los roles deben coincidir con los valores de user.rol del backend) */}
          {/* Asegúrate que los valores en allowedRoles ('ADMINISTRADOR', 'BODEGUERO', etc.) coincidan con user.rol */}
          <Route element={<ProtectedRoute allowedRoles={['ADMINISTRADOR', 'Admin']} />}>
            <Route path="/personal/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/personal/admin/generar-reportes" element={<GenerarReportesPage />} />
            <Route path="/personal/admin/gestionar-promociones" element={<GestionarPromocionesPage />} />
            <Route path="/personal/admin/gestionar-usuarios" element={<GestionarUsuariosPage />} /> {/* Nueva ruta */}
            <Route path="/personal/admin/gestionar-productos" element={<GestionarProductosPage />} /> {/* Ruta para productos */}
            <Route path="/personal/admin/gestionar-stock" element={<GestionarStockPage />} /> {/* Ruta para stock */}
            <Route path="/personal/admin/gestionar-traspasos" element={<GestionarTraspasosPage />} /> {/* Ruta para traspasos */}
            <Route path="/personal/admin/gestionar-locaciones" element={<GestionarLocacionesPage />} /> {/* Ruta para locaciones */}
            <Route path="/personal/admin/proveedores" element={<ProveedorListPage />} /> {/* Ruta para listar proveedores */}
            <Route path="/personal/admin/proveedores/detalle/:proveedorId" element={<ProveedorDetailPage />} /> {/* Ruta para ver el detalle de un proveedor */}
            <Route path="/personal/admin/crear-proveedor" element={<ProveedorFormPage />} /> {/* Ruta para crear proveedor */}
            <Route path="/personal/admin/proveedores/editar/:proveedorId" element={<ProveedorFormPage />} /> {/* Ruta para editar un proveedor existente */}
            <Route path="/personal/admin/crear-pedido-proveedor" element={<CrearPedidoProveedorPage />} /> {/* Ruta para crear pedido a proveedor */}
            <Route path="/personal/admin/pedidos-proveedor" element={<PedidoProveedorListPage />} /> {/* Ruta para listar pedidos a proveedor */}
            <Route path="/personal/admin/pedidos-proveedor/:pedidoId" element={<PedidoProveedorDetailPage />} /> {/* Ruta para el detalle del pedido a proveedor */}
            <Route path="/personal/admin/gestionar-usuarios/:userId" element={<UsuarioDetallePage />} /> {/* Ruta para detalles */}
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['BODEGUERO']} />}>
            <Route path="/personal/bodeguero/dashboard" element={<BodegueroDashboardPage />} />
            <Route path="/personal/bodeguero/historial-entregas" element={<HistorialEntregasPage />} />
            <Route path="/personal/bodeguero/pedidos-por-preparar" element={<PedidosPorPrepararPage />} />
            <Route path="/personal/bodeguero/stock-completo" element={<StockCompletoPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['CONTADOR']} />}>
            <Route path="/personal/contador/dashboard" element={<ContadorDashboardPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['VENDEDOR']} />}>
            <Route path="/personal/vendedor/dashboard" element={<VendedorDashboardPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        )}
      </main>
    </div>
  );
};

export default App
