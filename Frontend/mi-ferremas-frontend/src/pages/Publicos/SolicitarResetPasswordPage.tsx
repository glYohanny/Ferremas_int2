import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

const SolicitarResetPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { requestPasswordReset, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await requestPasswordReset(email);
      setMessage('Si existe una cuenta con ese email, recibirás un correo con instrucciones para restablecer tu contraseña.');
    } catch (err) {
      // No revelamos si el email existe o no por seguridad,
      // pero podrías tener un error genérico o el mismo mensaje de éxito.
      // Para depuración, puedes mostrar el error real.
      console.error(err);
      setError('Ocurrió un error al procesar tu solicitud. Inténtalo de nuevo.');
      // Opcionalmente, podrías mostrar el mismo mensaje de éxito para no revelar si un email está registrado:
      // setMessage('Si existe una cuenta con ese email, recibirás un correo con instrucciones para restablecer tu contraseña.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-3xl font-bold text-center text-gray-900">Recuperar Contraseña</h2>
        <p className="text-sm text-center text-gray-600">
          Ingresa tu dirección de correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email:
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="tu@email.com"
            />
          </div>
          {message && <p className="text-sm text-green-600 text-center">{message}</p>}
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <input type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50" value={isLoading ? 'Enviando...' : 'Enviar Enlace de Recuperación'} />
        </form>
        <p className="text-sm text-center text-gray-600">
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">Volver a Iniciar Sesión</Link>
        </p>
      </div>
    </div>
  );
};

export default SolicitarResetPasswordPage;