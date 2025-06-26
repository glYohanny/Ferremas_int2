import React, { useState } from 'react';
import { useAuth, ClientRegistrationData } from '../../contexts/AuthContext'; // Importa ClientRegistrationData
import { useNavigate, Link } from 'react-router-dom';

const RegistroClientePage: React.FC = () => {
  const [formData, setFormData] = useState<ClientRegistrationData>({
    username: '',
    email: '',
    password: '',
    password2: '', // Se llenará con confirmPassword antes de enviar
    first_name: '',
    last_name: '',
    rut: '',
    direccion_calle_numero: '',
    num_telefono: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { registerClient, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (formData.password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    try {
      const dataToSend: ClientRegistrationData = {
        ...formData,
        password2: confirmPassword, // Asegúrate de que el backend espera 'password2'
      };
      await registerClient(dataToSend);
      setSuccessMessage('¡Registro exitoso! Ahora puedes iniciar sesión.');
      // Redirigir al login después de un breve momento para que el usuario vea el mensaje de éxito
      setTimeout(() => navigate('/login'), 2000); // Redirige después de 2 segundos
    } catch (err: any) {
      if (err.response && err.response.data) {
        // Intenta mostrar errores específicos del backend si están disponibles
        const backendErrors = err.response.data;
        const errorMessages = Object.values(backendErrors).flat().join(' ');
        setError(errorMessages || 'Error en el registro. Inténtalo de nuevo.');
      } else {
        setError('Error en el registro. Inténtalo de nuevo.');
      }
      console.error(err);
    }
  };

  // Define una función para renderizar campos de input para no repetir código
  const renderInput = (name: keyof ClientRegistrationData, label: string, type: string = 'text', placeholder?: string) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}:
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={formData[name]}
        onChange={handleChange}
        required
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4 py-12">
      <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-3xl font-bold text-center text-gray-900">Crear Cuenta de Cliente</h2>
        {successMessage && <p className="text-sm text-green-600 bg-green-100 p-3 rounded-md text-center">{successMessage}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {renderInput('first_name', 'Nombres', 'text', 'Tus nombres')}
          {renderInput('last_name', 'Apellidos', 'text', 'Tus apellidos')}
          {renderInput('username', 'Nombre de Usuario', 'text', 'Elige un nombre de usuario')}
          {renderInput('rut', 'RUT', 'text', '12345678-9')}
          {renderInput('email', 'Email', 'email', 'tu@email.com')}
          {renderInput('direccion_calle_numero', 'Dirección (Calle y Número)', 'text', 'Ej: Av. Siempre Viva 123')}
          {renderInput('num_telefono', 'Teléfono', 'tel', 'Ej: +56912345678')}
          {renderInput('password', 'Contraseña', 'password', 'Mínimo 8 caracteres')}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirmar Contraseña:</label>
            <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
          </div>
          
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <input
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            value={isLoading ? 'Registrando...' : 'Crear Cuenta'}
          />
        </form>
        <p className="text-sm text-center text-gray-600">
          ¿Ya tienes una cuenta? <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">Inicia sesión aquí</Link>
        </p>
      </div>
    </div>
  );
};

export default RegistroClientePage;