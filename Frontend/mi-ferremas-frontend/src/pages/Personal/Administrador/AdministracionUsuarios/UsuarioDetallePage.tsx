import React from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../../../../services/api';
import { User } from '../../../../contexts/AuthContext'; // Reutilizamos la interfaz User
import { PersonalDetail } from './GestionarUsuariosPage'; // Reutilizar si es aplicable
import { Link as RouterLink } from 'react-router-dom'; // Para evitar conflicto con el Link de Material UI si se usara

// Interfaz para los datos combinados que mostraremos en la página de detalles
interface UserDetailData {
  // Campos básicos del Usuario (de UsuarioSerializer)
  id: number;
  email: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  is_staff: boolean;

  // Campos enriquecidos o de perfiles específicos
  tipo_perfil?: "Personal" | "Admin" | "Cliente" | "Usuario Base";
  rol?: string; // Rol legible para personal
  personalProfile?: PersonalDetail; // Detalles específicos si es Personal
  // clienteProfile?: ClienteDetail; // Para el futuro, si tienes detalles de cliente
}

const UsuarioDetallePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [usuarioDetalle, setUsuarioDetalle] = React.useState<UserDetailData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchUsuarioDetalle = async () => {
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        // 1. Cargar datos base del usuario
        const baseUserResponse = await apiClient.get<User & { is_staff: boolean, is_active: boolean }>(`/usuarios/usuarios-admin/${userId}/`);
        let combinedDetails: UserDetailData = {
          ...baseUserResponse.data,
          tipo_perfil: undefined, // Se determinará a continuación
          rol: undefined,
        };

        // 2. Intentar cargar perfil de Personal
        try {
          const personalResponse = await apiClient.get<PersonalDetail>(`/usuarios/personal/${userId}/`);
          if (personalResponse.data) {
            combinedDetails.personalProfile = personalResponse.data;
            combinedDetails.tipo_perfil = "Personal";
            combinedDetails.rol = personalResponse.data.rol_display;
            // Sobrescribir datos base con los del perfil de personal si son más específicos o actualizados
            // (aunque el ID, email, etc., del usuario anidado en PersonalDetail deberían coincidir)
            combinedDetails.email = personalResponse.data.usuario.email;
            combinedDetails.username = personalResponse.data.usuario.username;
            combinedDetails.first_name = personalResponse.data.usuario.first_name;
            combinedDetails.last_name = personalResponse.data.usuario.last_name;
            combinedDetails.is_active = personalResponse.data.usuario.is_active;
            combinedDetails.is_staff = personalResponse.data.usuario.is_staff;
          }
        } catch (personalError: any) {
          if (personalError.response?.status !== 404) {
            // Si no es 404, podría ser un error real al intentar cargar el perfil de personal
            console.warn("Error al cargar perfil de personal (no 404):", personalError);
          }
          // Si es 404, significa que no tiene perfil de personal, lo cual es normal.
        }

        // 3. TODO: Intentar cargar perfil de Cliente si existe un endpoint
        // if (!combinedDetails.personalProfile) { ... }

        // 4. Determinar tipo_perfil si no se estableció por un perfil específico
        if (!combinedDetails.tipo_perfil) {
          if (combinedDetails.is_staff) { // is_staff viene de la carga base
            combinedDetails.tipo_perfil = "Admin";
          } else {
            // Aquí podrías intentar deducir si es Cliente si tuvieras esa info,
            // o por defecto "Usuario Base"
            combinedDetails.tipo_perfil = "Usuario Base"; // O "Cliente" si se confirma de otra manera
          }
        }
        setUsuarioDetalle(combinedDetails);

      } catch (err: any) {
        console.error("Error al obtener detalles del usuario:", err);
        setError(err.response?.data?.detail || "No se pudo cargar la información del usuario.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsuarioDetalle();
  }, [userId]);

  if (loading) return <p className="text-center py-4">Cargando detalles del usuario...</p>;
  if (error) return <p className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">Error: {error}</p>;
  if (!usuarioDetalle) return <p>No se encontró información para este usuario.</p>;

  return (
    <div className="container mx-auto p-4">
      <RouterLink to="/personal/admin/gestionar-usuarios" className="text-blue-600 hover:underline mb-6 inline-block">&larr; Volver a Gestionar Usuarios</RouterLink>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-6">Detalles del Usuario: {usuarioDetalle.email || `ID ${userId}`}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-2 border-b pb-1">Información General</h3>
            <p><strong>ID Usuario:</strong> {usuarioDetalle.id}</p>
            <p><strong>Email:</strong> {usuarioDetalle.email}</p>
            <p><strong>Nombre de Usuario:</strong> {usuarioDetalle.username || 'N/A'}</p>
            <p><strong>Nombre:</strong> {usuarioDetalle.first_name || 'N/A'}</p>
            <p><strong>Apellido:</strong> {usuarioDetalle.last_name || 'N/A'}</p>
            <p><strong>Estado:</strong> <span className={usuarioDetalle.is_active ? 'text-green-600' : 'text-red-600'}>{usuarioDetalle.is_active ? 'Activo' : 'Inactivo'}</span></p>
            <p><strong>Es Staff:</strong> {usuarioDetalle.is_staff ? 'Sí' : 'No'}</p>
            <p><strong>Tipo de Perfil Determinado:</strong> {usuarioDetalle.tipo_perfil || 'Desconocido'}</p>
          </div>

          {usuarioDetalle.personalProfile && (
            <div>
              <h3 className="text-lg font-semibold mb-2 border-b pb-1">Perfil de Personal</h3>
              <p><strong>ID Perfil Personal:</strong> {usuarioDetalle.personalProfile.id}</p>
              <p><strong>Rol:</strong> {usuarioDetalle.personalProfile.rol_display || usuarioDetalle.rol || 'N/A'}</p>
              <p><strong>Sucursal ID:</strong> {usuarioDetalle.personalProfile.sucursal || 'N/A'}</p>
              <p><strong>Bodega ID:</strong> {usuarioDetalle.personalProfile.bodega || 'N/A'}</p>
            </div>
          )}

          {/* Sección para Perfil de Cliente (futuro) */}
          {/* {usuarioDetalle.clienteProfile && (
            <div>
              <h3 className="text-lg font-semibold mb-2 border-b pb-1">Perfil de Cliente</h3>
              <p><strong>RUT:</strong> {usuarioDetalle.clienteProfile.rut || 'N/A'}</p>
              ... más campos del cliente ...
            </div>
          )} */}
        </div>
        <pre className="mt-6 bg-gray-100 p-4 rounded overflow-x-auto text-xs">{JSON.stringify(usuarioDetalle, null, 2)}</pre>
      </div>
    </div>
  );
};

export default UsuarioDetallePage;