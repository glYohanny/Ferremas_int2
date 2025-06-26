import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// Interfaz para los datos del perfil del cliente que esperas del backend
// Ajusta esto según lo que devuelva tu endpoint de perfil
interface UserProfileData {
  email: string;
  first_name: string;
  last_name: string;
  username: string; // Si lo tienes y quieres mostrarlo
  // Campos específicos del modelo Cliente
  rut?: string;
  direccion_calle_numero?: string;
  num_telefono?: string;
  // fecha_nacimiento?: string; // Si lo tienes
}

const UserProfilePage: React.FC = () => {
  console.log('[UserProfilePage] Componente montándose...'); // NUEVO LOG
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth(); // Usamos el 'user' del contexto como fallback o para verificar

  useEffect(() => {
    if (isAuthenticated && user) {
      const fetchUserProfile = async () => {
        try {
          setLoading(true);
          // Asume que tienes un endpoint para obtener el perfil completo del cliente
          // Podría ser '/usuarios/perfil-cliente/' o '/auth/users/me/' si usas Djoser
          // o un endpoint específico que devuelva los datos del modelo Cliente.
          // Por ahora, usaremos un endpoint hipotético '/usuarios/perfil-completo/'
          const response = await apiClient.get<UserProfileData>('/usuarios/perfil-cliente/me/'); // Ajusta este endpoint
          setProfile(response.data);
          setError(null);
        } catch (err) {
          console.error("Error fetching user profile:", err);
          setError("No se pudo cargar la información de tu perfil. Inténtalo de nuevo más tarde.");
          // Como fallback, podríamos usar los datos básicos del AuthContext si la llamada falla
          // pero el usuario está autenticado.
          if (user) {
            setProfile({
              email: user.email || '',
              first_name: user.first_name || '',
              last_name: user.last_name || '',
              username: user.username || '',
            });
          }
        } finally {
          setLoading(false);
        }
      };
      fetchUserProfile();
    } else {
      setLoading(false);
      // Podrías redirigir al login si no está autenticado
    }
  }, [user, isAuthenticated]);

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Cargando perfil...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-red-500">{error}</div>;
  }

  if (!profile) {
    return <div className="container mx-auto p-4 text-center">No se pudo cargar el perfil. <Link to="/login" className="text-blue-600 hover:underline">Inicia sesión</Link></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Mi Perfil</h1>
      <div className="bg-white shadow-lg rounded-lg p-6">
        <p className="mb-2"><strong>Nombre de Usuario:</strong> {profile.username}</p>
        <p className="mb-2"><strong>Nombres:</strong> {profile.first_name}</p>
        <p className="mb-2"><strong>Apellidos:</strong> {profile.last_name}</p>
        <p className="mb-2"><strong>Email:</strong> {profile.email}</p>
        <p className="mb-2"><strong>RUT:</strong> {profile.rut || 'No especificado'}</p>
        <p className="mb-2"><strong>Dirección:</strong> {profile.direccion_calle_numero || 'No especificada'}</p>
        <p className="mb-2"><strong>Teléfono:</strong> {profile.num_telefono || 'No especificado'}</p>
        {/* Aquí podrías añadir un botón para "Editar Perfil" en el futuro */}
        {/* <Link to="/editar-perfil" className="mt-4 inline-block px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">Editar Perfil</Link> */}
      </div>
    </div>
  );
};

export default UserProfilePage;