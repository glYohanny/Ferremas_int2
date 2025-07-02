import React, { useState, FormEvent, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, User } from '../../contexts/AuthContext';

// Función auxiliar para determinar la ruta correcta del dashboard según el rol del usuario
const getDashboardPath = (user: User): string => {
  const role = user.rol?.toUpperCase();
  switch (role) {
    case 'ADMINISTRADOR':
      return '/personal/admin/dashboard';
    case 'VENDEDOR':
      return '/personal/vendedor/dashboard';
    case 'BODEGUERO':
      return '/personal/bodeguero/dashboard';
    case 'CONTADOR':
      return '/personal/contador/dashboard';
    default:
      // Fallback para personal sin un rol específico (ej. superusuario)
      if (user.is_staff || user.tipo_perfil === 'Admin') {
        return '/personal/admin/dashboard';
      }
      // Destino por defecto para Clientes u otros roles no de personal
      return '/';
  }
};

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login, isAuthenticated, user, isLoading } = useAuth(); // Usar isLoading del contexto
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // No hacer nada mientras el estado de autenticación está cargando
    if (isLoading) {
      return;
    }

    if (isAuthenticated && user) {
      console.log('[LoginPage useEffect] Usuario ya autenticado, redirigiendo. User:', user);
        // --- NUEVO DEBUGGING ---
      console.log('DEBUG: User object in LoginPage:', user);
      console.log('DEBUG: User.rol:', user.rol, 'User.tipo_perfil:', user.tipo_perfil, 'User.is_staff:', user.is_staff);

      const from = location.state?.from?.pathname;
      let destination = '/'; // Destino por defecto

      // Lógica de autorización mejorada: un usuario es personal si tiene un rol,
      // o si su tipo de perfil es 'Personal'/'Admin', o si la bandera is_staff es verdadera.
      // Esto es más robusto si el backend no envía todos los campos consistentemente.
      const isStaff = !!user.rol || user.tipo_perfil === 'Personal' || user.tipo_perfil === 'Admin' || user.is_staff;

      if (isStaff) {
        // El personal siempre va a su dashboard para evitar bucles de redirección.
        destination = getDashboardPath(user);
      } else {
        // Los clientes van a la página desde la que vinieron, o a la página de inicio.
        destination = from && from !== '/login' ? from : '/';
      }

      console.log(`[LoginPage useEffect] Redirigiendo a: ${destination}`);
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, user, isLoading, navigate, location.state]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      await login(email, password);
      // El useEffect se encargará de la redirección una vez que el estado del usuario se actualice.
    } catch (err: any) {
      console.error("Error de inicio de sesión:", err);
      setError(err.response?.data?.detail || "Error al iniciar sesión. Verifica tus credenciales.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Iniciar Sesión</h2>
        {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="email" className="block text-gray-700 text-sm font-semibold mb-2">
              Correo Electrónico
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="tu@email.com"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 text-sm font-semibold mb-2">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>
          <div className="mb-6 text-right">
            <Link to="/solicitar-reset-password" className="text-sm text-blue-600 hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:opacity-50">
            {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>
        </form>
        <p className="text-center text-gray-600 mt-8">
          ¿No tienes una cuenta? <Link to="/registro-cliente" className="text-blue-600 hover:underline font-semibold">Regístrate aquí</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;