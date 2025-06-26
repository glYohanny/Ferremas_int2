import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ResetPasswordConfirmPage: React.FC = () => {
  const { uidb64, token } = useParams<{ uidb64: string; token: string }>();
  const [newPassword1, setNewPassword1] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { confirmPasswordReset, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!uidb64 || !token) {
      setError('Enlace de restablecimiento no válido o incompleto.');
      return;
    }

    if (newPassword1 !== newPassword2) {
      setError('Las nuevas contraseñas no coinciden.');
      return;
    }

    try {
      await confirmPasswordReset(uidb64, token, newPassword1, newPassword2);
      setMessage('¡Tu contraseña ha sido restablecida exitosamente! Ahora puedes iniciar sesión con tu nueva contraseña.');
      setTimeout(() => navigate('/login'), 3000); // Redirige al login después de 3 segundos
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Error al restablecer la contraseña. El enlace podría haber expirado o ser incorrecto.');
      }
      console.error(err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-3xl font-bold text-center text-gray-900">Restablecer Contraseña</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="newPassword1" className="block text-sm font-medium text-gray-700">
              Nueva Contraseña:
            </label>
            <input
              type="password"
              id="newPassword1"
              value={newPassword1}
              onChange={(e) => setNewPassword1(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Ingresa tu nueva contraseña"
            />
          </div>
          <div>
            <label htmlFor="newPassword2" className="block text-sm font-medium text-gray-700">
              Confirmar Nueva Contraseña:
            </label>
            <input
              type="password"
              id="newPassword2"
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Confirma tu nueva contraseña"
            />
          </div>
          {message && <p className="text-sm text-green-600 text-center">{message}</p>}
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <input type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50" value={isLoading ? 'Restableciendo...' : 'Restablecer Contraseña'} />
        </form>
        {message && (
          <p className="text-sm text-center text-gray-600">
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">Ir a Iniciar Sesión</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordConfirmPage;