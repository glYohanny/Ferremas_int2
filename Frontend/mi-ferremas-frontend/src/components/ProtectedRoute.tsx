import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  allowedRoles: Array<
    | 'Cliente' 
    | 'Personal' // Can be used as a general staff type
    | 'Admin'    // Can be used for a general admin type (e.g., from is_staff or tipo_perfil)
    | 'Usuario Base' 
    | 'BODEGUERO' 
    | 'ADMINISTRADOR' 
    | 'VENDEDOR' 
    | 'CONTADOR'>;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user, isLoading: authIsLoading } = useAuth();
  const location = useLocation();
  console.log('[ProtectedRoute] Path:', location.pathname, 'authIsLoading:', authIsLoading, 'isAuthenticated:', isAuthenticated, 'User:', user, 'AllowedRoles:', allowedRoles); // NUEVO LOG

  if (authIsLoading) {
    console.log('[ProtectedRoute] authIsLoading es true, mostrando mensaje de carga.'); // NUEVO LOG
    return <div className="text-center p-10">Verificando autenticación...</div>; // O un spinner más elaborado
  }

  if (!isAuthenticated) {
    // Redirige al login, guardando la ubicación actual para volver después del login
    console.log('[ProtectedRoute] No autenticado, redirigiendo a /login. Desde:', location.pathname); // NUEVO LOG
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Lógica de autorización mejorada:
  let isAuthorized = false;
  const userTipoPerfil = user?.tipo_perfil; // 'Cliente', 'Personal', 'Admin', 'Usuario Base'
  const userStaffRole = user?.rol; // 'BODEGUERO', 'ADMINISTRADOR', etc. (viene del backend)
  const isUserStaffFlag = user?.is_staff;
  const hasClientProfile = !!user?.perfil_cliente;

  // Lógica para inferir el tipo de perfil si no viene explícitamente del backend.
  // Esto hace que la autorización sea más robusta.
  let effectiveTipoPerfil = userTipoPerfil;
  if (!effectiveTipoPerfil) {
    if (hasClientProfile) {
      effectiveTipoPerfil = 'Cliente';
    } else if (userStaffRole || isUserStaffFlag) {
      // Asume 'Personal' o 'Admin' si tiene rol o es staff, pero no perfil de cliente.
      effectiveTipoPerfil = 'Personal';
    }
  }

  console.log('[ProtectedRoute] User tipo_perfil:', userTipoPerfil, 'User rol:', userStaffRole, 'User is_staff:', isUserStaffFlag, 'Effective tipo_perfil:', effectiveTipoPerfil);

  if (effectiveTipoPerfil && allowedRoles.includes(effectiveTipoPerfil as any)) {
    // Autorizado por tipo de perfil general (ej. 'Cliente', 'Personal')
    isAuthorized = true;
  }
  
  if (!isAuthorized && userStaffRole && allowedRoles.includes(userStaffRole as any)) {
    // Autorizado por rol específico de personal (ej. 'BODEGUERO' si 'BODEGUERO' está en allowedRoles)
    // Esto permite que allowedRoles=['BODEGUERO'] funcione incluso si allowedRoles no incluye 'Personal' explícitamente.
    isAuthorized = true;
  }
  
  if (!isAuthorized && isUserStaffFlag && allowedRoles.includes('Admin' as any)) {
    // Fallback para autorizar si es staff y 'Admin' es un rol permitido (para superusuarios sin perfil Personal específico)
    isAuthorized = true;
  }

  if (isAuthorized) {
    console.log('[ProtectedRoute] Rol permitido. Renderizando Outlet para:', location.pathname); // NUEVO LOG
    return <Outlet />; // El usuario tiene el rol permitido, renderiza el contenido de la ruta hija
  } else {
    // El usuario está autenticado pero no tiene el rol permitido
    console.warn(`Acceso denegado a ${location.pathname}. User tipo_perfil: ${userTipoPerfil} (Efectivo: ${effectiveTipoPerfil}), User rol: ${userStaffRole}, Roles permitidos: ${allowedRoles.join(', ')}`);
    console.log('[ProtectedRoute] Rol NO permitido. Redirigiendo a /acceso-denegado para:', location.pathname); // NUEVO LOG
    return <Navigate to="/acceso-denegado" replace />; 
  }
};

export default ProtectedRoute;