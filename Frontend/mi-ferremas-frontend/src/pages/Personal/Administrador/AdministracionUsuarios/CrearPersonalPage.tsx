import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../../../services/api';
import { useAuth } from '../../../../contexts/AuthContext';

const ROL_CHOICES = [
  { value: 'BODEGUERO', label: 'Bodeguero' },
  { value: 'VENDEDOR', label: 'Vendedor' },
  { value: 'CONTADOR', label: 'Contador' },
  { value: 'ADMINISTRADOR', label: 'Administrador' },
];

const CrearPersonalPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    password: '',
    password2: '',
    rol: ROL_CHOICES[0].value,
    sucursal: '',
    bodega: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (formData.password !== formData.password2) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!user || (user.rol !== 'ADMINISTRADOR' && user.tipo_perfil !== 'Admin')) {
        setError("No tienes permisos para realizar esta acción.");
        return;
    }

    setIsLoading(true);
    const dataToSend = {
      email: formData.email,
      username: formData.username,
      first_name: formData.first_name,
      last_name: formData.last_name,
      password: formData.password,
      rol: formData.rol,
      sucursal: formData.sucursal ? parseInt(formData.sucursal, 10) : null,
      bodega: formData.bodega ? parseInt(formData.bodega, 10) : null,
    };

    try {
      await apiClient.post('/usuarios/personal/', dataToSend);
      setSuccessMessage(`Personal "${formData.email}" creado exitosamente.`);
      setFormData({
        email: '', username: '', first_name: '', last_name: '',
        password: '', password2: '', rol: ROL_CHOICES[0].value,
        sucursal: '', bodega: '',
      });
    } catch (err: any) {
      console.error("Error al crear personal:", err.response?.data || err.message);
      setError(err.response?.data?.detail || "Ocurrió un error al crear el personal. Revisa los campos.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Link to="/personal/admin/dashboard" className="text-blue-600 hover:underline mb-4 inline-block">&larr; Volver al Dashboard de Admin</Link>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Crear Nuevo Personal</h2>
        {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</p>}
        {successMessage && <p className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">{successMessage}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium">Email:</label><input type="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
          <div><label className="block text-sm font-medium">Nombre de Usuario:</label><input type="text" name="username" value={formData.username} onChange={handleChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
          <div><label className="block text-sm font-medium">Nombre:</label><input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
          <div><label className="block text-sm font-medium">Apellido:</label><input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
          <div><label className="block text-sm font-medium">Contraseña:</label><input type="password" name="password" value={formData.password} onChange={handleChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
          <div><label className="block text-sm font-medium">Confirmar Contraseña:</label><input type="password" name="password2" value={formData.password2} onChange={handleChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
          <div><label className="block text-sm font-medium">Rol:</label><select name="rol" value={formData.rol} onChange={handleChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2">{ROL_CHOICES.map(rol => <option key={rol.value} value={rol.value}>{rol.label}</option>)}</select></div>
          <div><label className="block text-sm font-medium">ID Sucursal (Opcional):</label><input type="number" name="sucursal" value={formData.sucursal} onChange={handleChange} placeholder="Ej: 1" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
          <div><label className="block text-sm font-medium">ID Bodega (Opcional):</label><input type="number" name="bodega" value={formData.bodega} onChange={handleChange} placeholder="Ej: 1" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:opacity-50">{isLoading ? 'Creando...' : 'Crear Personal'}</button>
        </form>
      </div>
    </div>
  );
};

export default CrearPersonalPage;