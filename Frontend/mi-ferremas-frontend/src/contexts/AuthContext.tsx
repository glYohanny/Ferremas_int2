import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '../services/api'; 
import { Sucursal } from '../services/productService'; // Importa la interfaz Sucursal

// Interfaz para el objeto User (ajusta según los datos que devuelve tu backend)
// Interfaz para el perfil personal (para usuarios STAFF)
interface PerfilPersonal {
  id: number;
  rol: string; // 'BODEGUERO', 'ADMINISTRADOR', 'VENDEDOR', 'CONTADOR'
  sucursal?: Sucursal; // La sucursal a la que pertenece el personal
  // Otros campos del perfil personal si los hay
}

interface SimpleClienteProfile {
  id: number;
  rut?: string;
  num_telefono?: string;
  // Añade otros campos si los necesitas en el frontend
}

export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  tipo_perfil?: 'Cliente' | 'Personal' | 'Admin' | 'Usuario Base';
  is_staff?: boolean;
  rol?: string;
  rol_display?: string; // Nombre legible del rol
  perfil_personal?: PerfilPersonal; // Añadir el perfil personal para usuarios STAFF
  perfil_cliente?: SimpleClienteProfile; // Añadir el perfil de cliente
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null; 
  login: (email: string, password: string) => Promise<void>;
  registerClient: (userData: any) => Promise<void>; // Define un tipo más específico para userData
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (uidb64: string, token: string, newPassword1: string, newPassword2: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define una interfaz para los datos de registro del cliente
// Ajusta esto según los campos que tu API de registro espera
export interface ClientRegistrationData {
  username: string; // Añadido
  email: string;
  password: string;
  password2: string; // Añadido para la confirmación que espera el backend
  first_name: string; // Cambiado de 'nombre'
  last_name: string;  // Cambiado de 'apellidos'
  rut: string;
  direccion_calle_numero?: string; // Añadido, opcional
  num_telefono?: string;           // Añadido, opcional
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // El token se gestiona internamente, no es necesario exponerlo directamente en el contexto si no se usa fuera.
  // La autenticación se basará en si 'user' tiene datos.

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          // Intenta obtener los datos del usuario actual del backend
          // CAMBIO: Usar el endpoint unificado
          const response = await apiClient.get<User>('/usuarios/me/');
          const fetchedUser = response.data;
          // Normalizamos el rol a mayúsculas para consistencia en toda la app
          if (fetchedUser.rol) {
            fetchedUser.rol = fetchedUser.rol.toUpperCase();
          
            if (fetchedUser.rol === 'CONTABLE') {
              fetchedUser.rol = 'CONTADOR';
            }
          }
          setUser(fetchedUser);
          localStorage.setItem('user', JSON.stringify(fetchedUser)); // Actualiza el usuario en localStorage
        } catch (error) {
          console.error('Failed to fetch current user with token, logging out:', error);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          delete apiClient.defaults.headers.common['Authorization'];
          setUser(null);
        }
      } else {
        // Si no hay token, intenta cargar el usuario desde localStorage (si se guardó)
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (e) {
            localStorage.removeItem('user'); // Si está corrupto, elimínalo
          }
        }
      }
      setIsLoading(false);
    };

    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/token/', { email, password });
      const { access, refresh } = response.data;
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${access}`;

      // Después de obtener el token, obtén los datos del usuario
      try {
        // CAMBIO: Usar el endpoint unificado
        const userResponse = await apiClient.get<User>('/usuarios/me/'); // Asegúrate que la URL base de apiClient sea correcta
         const fetchedUser = userResponse.data;
        // Normalizamos el rol a mayúsculas para consistencia en toda la app
        if (fetchedUser.rol) {
          fetchedUser.rol = fetchedUser.rol.toUpperCase();
          // Parche temporal: si el backend envía 'CONTABLE' en lugar de 'CONTADOR'
          if (fetchedUser.rol === 'CONTABLE') {
            fetchedUser.rol = 'CONTADOR';
          }
        }
        setUser(fetchedUser);
        localStorage.setItem('user', JSON.stringify(fetchedUser)); // Guarda el usuario en localStorage
      } catch (userError) {
        console.error('Failed to fetch user details after login:', userError);
        // Decide cómo manejar esto: ¿logout? ¿mostrar error?
        // Por ahora, dejaremos el token pero el usuario será null, lo que podría llevar a "Acceso Denegado"
        setUser(null); 
        localStorage.removeItem('user');
        // Podrías incluso hacer logout aquí si obtener el perfil es crítico
        // throw new Error("Login exitoso, pero no se pudo obtener el perfil del usuario.");
      }
    } catch (error) {
      console.error('Login failed:', error);
      logout(); // Limpia todo si el login falla
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const registerClient = async (userData: ClientRegistrationData) => { // Tipo de userData actualizado
    try {
      setIsLoading(true);
      // Ajusta el endpoint si es diferente. Asumimos que el backend crea el usuario y el perfil de cliente.
      await apiClient.post('/usuarios/clientes/registro/', userData);
      // Opcional: podrías intentar loguear al usuario automáticamente después del registro
    } catch (error) {
      console.error('Client registration failed:', error);
      throw error; // Relanza el error para que el componente de registro lo maneje
    } finally {
      setIsLoading(false);
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      setIsLoading(true);
      // Ajusta el endpoint si es diferente
      await apiClient.post('/usuarios/password-reset/', { email }); // Corregida la URL, quitando /request/
    } catch (error) {
      console.error('Password reset request failed:', error);
      throw error; // Relanza el error para que el componente lo maneje
    } finally {
      setIsLoading(false);
    }
  };

  const confirmPasswordReset = async (uidb64: string, token: string, newPassword1: string, newPassword2: string) => {
    try {
      setIsLoading(true);
      // Ajusta el endpoint si es diferente. Nota cómo se incluyen uidb64 y token en la URL.
      await apiClient.post(`/usuarios/password-reset-confirm/${uidb64}/${token}/`, {
        new_password1: newPassword1,
        new_password2: newPassword2,
      });
    } catch (error) {
      console.error('Password reset confirmation failed:', error);
      throw error; // Relanza el error para que el componente lo maneje
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setIsLoading(true); // Para consistencia, aunque el logout suele ser rápido
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user'); // Asegúrate de limpiar el usuario de localStorage
    delete apiClient.defaults.headers.common['Authorization'];
    setUser(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, registerClient, requestPasswordReset, confirmPasswordReset, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};