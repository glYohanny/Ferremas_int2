import React, { useState, FormEvent, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, User } from '../../contexts/AuthContext'; // Importa User también

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuth(); // Obtén isAuthenticated y user del contexto
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  // Efecto para redirigir si el usuario ya está autenticado y tiene datos
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('[LoginPage useEffect] Usuario ya autenticado, redirigiendo. User:', user);
      // Lógica de redirección mejorada basada en tipo_perfil y rol
      const userRoleNormalized = user.rol?.toUpperCase(); // Normalizar a mayúsculas
      if (user.tipo_perfil === 'Personal' || user.tipo_perfil === 'Admin' || user.is_staff) {
        switch (userRoleNormalized) { // Usar el rol normalizado
          case 'ADMINISTRADOR':
            navigate('/personal/admin/dashboard', { replace: true });
            break;
          case 'BODEGUERO':
            navigate('/personal/bodeguero/dashboard', { replace: true });
            break;
          case 'CONTADOR':
            navigate('/personal/contador/dashboard', { replace: true });
            break;
          case 'VENDEDOR':
            navigate('/personal/vendedor/dashboard', { replace: true });
            break;
          default:
            // Si es tipo_perfil 'Admin' (ej. superusuario sin modelo Personal específico) o is_staff es true
            // y no tiene un rol de personal específico, lo mandamos al dashboard de admin.
            if (user.tipo_perfil === 'Admin' || user.is_staff) {
              navigate('/personal/admin/dashboard', { replace: true });
            } else {
              // Fallback para 'Personal' sin rol conocido (debería ser raro)
              navigate(from, { replace: true }); // O a una página de error/dashboard genérico de personal si existiera
            }
        }
      } else if (user.tipo_perfil === 'Cliente') {
        navigate(from, { replace: true });
      } else {
        // Fallback si el tipo_perfil no está claro pero está autenticado
        navigate(from, { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, from]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      // La redirección se manejará por el useEffect de arriba cuando user e isAuthenticated se actualicen.
      // O, si login devolviera el usuario, podríamos hacerlo aquí directamente.
      // Por ahora, confiamos en que el AuthContext se actualiza y el useEffect reacciona.
      // Si el useEffect no es suficiente, podrías necesitar que login devuelva el usuario
      // o añadir un pequeño delay/observador aquí.
      // navigate(from, { replace: true }); // Movido al useEffect
    } catch (err: any) {
      console.error("Error de inicio de sesión:", err);
      setError(err.response?.data?.detail || "Error al iniciar sesión. Verifica tus credenciales.");
    } finally {
      setLoading(false);
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
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:opacity-50">
            {loading ? 'Iniciando...' : 'Iniciar Sesión'}
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