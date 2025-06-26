import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../../../services/api';
import { User } from '../../../../contexts/AuthContext'; // Reutilizamos la interfaz User
import { useAuth } from '../../../../contexts/AuthContext'; // Para la validación de permisos al crear
// Definimos los tipos de perfil y roles para los filtros
const TIPOS_PERFIL = [
  { value: '', label: 'Todos los Tipos' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'personal', label: 'Personal' },
  { value: 'base', label: 'Usuario Base (sin perfil)'},
];

const ROLES_PERSONAL = [
  { value: '', label: 'Todos los Roles' },
  { value: 'BODEGUERO', label: 'Bodeguero' },
  { value: 'VENDEDOR', label: 'Vendedor' },
  { value: 'CONTABLE', label: 'Contador' },
  { value: 'ADMINISTRADOR', label: 'Administrador' },
];

// Interfaz para los usuarios listados, puede ser igual a User o más específica
interface ListedUser extends User {
  // Explicitly define properties that might not be in the base User from AuthContext,
  // but are returned by UsuarioListSerializer.
  is_active: boolean;
  // Align with the expected union type from the base User interface and backend serializers
  tipo_perfil: "Personal" | "Admin" | "Cliente" | "Usuario Base";
  // 'rol' from UsuarioListSerializer is the display name and can be null from backend.
  // To be compatible with User.rol (string | undefined), this should be string | undefined.
  rol: string | undefined; 
  // rol_display?: string | null; // Alternative if you prefer this name
}

// Interfaz para los detalles completos del personal (lo que devuelve PersonalSerializer)
export interface PersonalDetail { // <--- Añadir export aquí
  id: number; // ID del perfil de Personal
  // The nested 'usuario' comes from UsuarioSerializer, which includes is_active and is_staff
  usuario: User & { is_active: boolean; is_staff: boolean; }; // Datos del usuario anidado
  rol: string;
  rol_display: string;
  sucursal: number | null;
  bodega: number | null;
  tipo_perfil: "Personal"; // PersonalSerializer always returns 'Personal' for this
  // Asegúrate de que coincida con PersonalSerializer
}


// Interfaces para sucursales y bodegas (ajusta según tu API)
interface Sucursal {
  id: number;
  nombre: string; // O el campo que uses para el nombre visible
}
interface Bodega {
  id: number;
  // nombre: string; // Este campo no existe directamente en BodegaSerializer
  direccion: string; // Usaremos este
  tipo_bodega_tipo?: string; // Este también viene del serializer
  sucursal: number | null; // ID de la sucursal a la que pertenece la bodega
  sucursal_nombre?: string; // Para mostrar a qué sucursal pertenece
}

const GestionarUsuariosPage: React.FC = () => {
  const [usuarios, setUsuarios] = useState<ListedUser[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false); // Específico para la carga de la lista
  const [listError, setListError] = useState<string | null>(null); // Renombrado para claridad
  
  // Estado para el formulario de creación de personal
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    password: '',
    password2: '',
    rol: ROLES_PERSONAL.find(r => r.value !== '')?.value || ROLES_PERSONAL[1].value, // Primer rol válido
    sucursal: '',
    bodega: '',
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccessMessage, setCreateSuccessMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [sucursalesList, setSucursalesList] = useState<Sucursal[]>([]);
  const [bodegasList, setBodegasList] = useState<Bodega[]>([]);
  const [filteredBodegasListCreateForm, setFilteredBodegasListCreateForm] = useState<Bodega[]>([]); // Para el formulario de creación
  const [filteredBodegasListEditForm, setFilteredBodegasListEditForm] = useState<Bodega[]>([]); // Para el formulario de edición
  const [loadingSucursales, setLoadingSucursales] = useState(false);
  const [loadingBodegas, setLoadingBodegas] = useState(false);
  const { user: adminUser } = useAuth(); // Para verificar permisos del admin

  // Estado para el modal de edición
  const [editingUser, setEditingUser] = useState<ListedUser | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    password: '', // Dejar vacío para no cambiar, o llenar para cambiar
    password2: '',
    rol: '',
    sucursal: '',
    bodega: '',
    is_active: true,
  });
  const [isEditingLoading, setIsEditingLoading] = useState(false); // Para la carga de detalles y el submit de edición
  const [editError, setEditError] = useState<string | null>(null);


  const [filtroTipoPerfil, setFiltroTipoPerfil] = useState('');
  const [filtroRol, setFiltroRol] = useState('');

  // Efecto para auto-limpiar el mensaje de éxito de creación
  useEffect(() => {
    if (createSuccessMessage) {
      const timer = setTimeout(() => {
        setCreateSuccessMessage(null);
      }, 5000); // Limpiar después de 5 segundos
      return () => clearTimeout(timer);
    }
  }, [createSuccessMessage]);

  const fetchUsuarios = useCallback(async () => {
    console.log('Fetching usuarios con filtros:', { filtroTipoPerfil, filtroRol });
    setIsLoadingList(true);
    setListError(null); // Usar el estado renombrado
    try {
      const params = new URLSearchParams();
      if (filtroTipoPerfil) {
        params.append('tipo_perfil', filtroTipoPerfil);
      }
      // Solo aplicar filtro de rol si el tipo de perfil es 'personal'
      if (filtroTipoPerfil === 'personal' && filtroRol) {
        params.append('rol', filtroRol);
      }
      
      // Tu endpoint de backend para listar usuarios es /api/usuarios/usuarios/
      // según UsuarioListView y urls.py (router.register(r'usuarios', UsuarioViewSet, basename='usuario'))
      // CORRECCIÓN: El endpoint es /api/usuarios/usuarios/ según tu UsuarioListView, no el ViewSet.
      // El ViewSet de 'personal' es para /api/usuarios/personal/.
      // El endpoint para listar todos los usuarios con filtros es el que definiste en UsuarioListView.
      // En tu urls.py tienes: path('usuarios/', UsuarioListView.as_view(), name='usuario-list'),
      // Así que la URL base es /api/usuarios/usuarios/
      const response = await apiClient.get<ListedUser[]>(`/usuarios/usuarios/?${params.toString()}`);
      setUsuarios(response.data);
    } catch (err: any) {
      console.error("Error al obtener usuarios:", err);
      setListError(err.response?.data?.detail || "No se pudo cargar la lista de usuarios."); // Usar el estado renombrado
    } finally {
      setIsLoadingList(false);
    }
  }, [filtroTipoPerfil, filtroRol]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const handleFilterChange = () => {
    // fetchUsuarios se llama automáticamente por el useEffect cuando cambian los filtros
  };
  
  // Resetear filtro de rol si el tipo de perfil no es 'personal'
  useEffect(() => {
    if (filtroTipoPerfil !== 'personal') {
      setFiltroRol('');
    }
  }, [filtroTipoPerfil]);

  // Efecto para cargar sucursales y bodegas cuando se muestra el formulario de creación
  useEffect(() => {
    const fetchSucursalesYBodegas = async () => {
      if (showCreateForm || (showEditModal && editingUser?.tipo_perfil === 'Personal')) { 
        setLoadingSucursales(true);
        setLoadingBodegas(true);
        try {
          const [sucursalesRes, bodegasRes] = await Promise.all([
            // REVISA Y AJUSTA ESTOS ENDPOINTS SEGÚN TU urls.py PRINCIPAL DEL BACKEND
            // Ejemplo: si sucursal_app.api.urls está bajo 'api/locaciones/'
            apiClient.get<Sucursal[]>('/sucursales/sucursales/'), 
            apiClient.get<Bodega[]>('/sucursales/bodegas/') // Endpoint para bodegas
          ]);
          // Actualizar las listas de sucursales y bodegas
          // El serializer de Bodega ya incluye sucursal_nombre y tipo_bodega_tipo
          // por lo que no necesitamos hacer cruces manuales aquí si la API los devuelve.
          setSucursalesList(sucursalesRes.data);
          setBodegasList(bodegasRes.data);
        } catch (error) {
          console.error("Error al cargar sucursales o bodegas:", error);
          setCreateError("No se pudieron cargar las opciones de sucursal/bodega.");
          // Podrías tener errores separados para sucursales y bodegas si prefieres
        } finally {
          setLoadingSucursales(false);
          setLoadingBodegas(false);
        }
      }
    };

    fetchSucursalesYBodegas();
    // Quitar sucursalesList.length de las dependencias para permitir recargas
    // si el componente se monta/desmonta o si showCreateForm cambia,
    // pero la carga real dentro de la función aún puede ser condicional
    // si se desea evitar recargas innecesarias (ej. if (bodegasList.length === 0) loadBodegas())
  }, [showCreateForm, showEditModal, editingUser]); 

  // Efecto para filtrar bodegas en el formulario de CREACIÓN cuando cambia la sucursal seleccionada
  useEffect(() => {
    if (createFormData.sucursal) {
      const sucursalIdSeleccionada = parseInt(createFormData.sucursal, 10);
      setFilteredBodegasListCreateForm(
        bodegasList.filter(b => b.sucursal === sucursalIdSeleccionada)
      );
    } else {
      setFilteredBodegasListCreateForm([]); // O mostrar todas si no hay sucursal: setFilteredBodegasListCreateForm(bodegasList)
    }
    // Resetear bodega seleccionada si cambia la sucursal
    // setCreateFormData(prev => ({ ...prev, bodega: '' })); // Comentado para que el usuario decida si quiere cambiarla
  }, [createFormData.sucursal, bodegasList]);

  // Efecto para filtrar bodegas en el formulario de EDICIÓN cuando cambia la sucursal seleccionada
  useEffect(() => {
    if (showEditModal && editFormData.sucursal) {
      const sucursalIdSeleccionada = parseInt(editFormData.sucursal, 10);
      setFilteredBodegasListEditForm(
        bodegasList.filter(b => b.sucursal === sucursalIdSeleccionada)
      );
    } else {
      setFilteredBodegasListEditForm([]);
    }
    // No resetear la bodega aquí automáticamente, ya que podría ser una carga inicial. El reseteo se hace en handleEditFormChange.
  }, [showEditModal, editFormData.sucursal, bodegasList]);

  const handleCreateFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.target.name === 'sucursal') {
      setCreateFormData({ ...createFormData, sucursal: e.target.value, bodega: '' }); // Resetear bodega al cambiar sucursal
    } else
    setCreateFormData({ ...createFormData, [e.target.name]: e.target.value });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null); // Limpiar error previo de creación
    setCreateSuccessMessage(null); // Limpiar mensaje de éxito previo

    if (createFormData.password !== createFormData.password2) {
      setCreateError("Las contraseñas no coinciden.");
      return;
    }
    if (!adminUser || (adminUser.rol !== 'ADMINISTRADOR' && adminUser.tipo_perfil !== 'Admin')) {
        setCreateError("No tienes permisos para realizar esta acción.");
        return;
    }

    setIsCreating(true);
    const dataToSend = {
      email: createFormData.email,
      username: createFormData.username,
      first_name: createFormData.first_name,
      last_name: createFormData.last_name,
      password: createFormData.password,
      rol: createFormData.rol, // Este es el valor del rol, ej: "BODEGUERO"
      sucursal: createFormData.sucursal ? parseInt(createFormData.sucursal, 10) : null,
      bodega: createFormData.bodega ? parseInt(createFormData.bodega, 10) : null,
    };

    try {
      await apiClient.post('/usuarios/personal/', dataToSend);
      setCreateSuccessMessage(`Personal "${createFormData.email}" creado exitosamente.`);
      setCreateFormData({
        email: '', username: '', first_name: '', last_name: '',
        password: '', password2: '', rol: ROLES_PERSONAL.find(r => r.value !== '')?.value || ROLES_PERSONAL[1].value,
        sucursal: '', bodega: '',
      });
      setShowCreateForm(false); // Ocultar formulario después de éxito
      fetchUsuarios(); // Recargar la lista de usuarios
    } catch (err: any) {
      console.error("Error al crear personal:", err.response?.data || err.message);
      const apiError = err.response?.data;
      let errorMessage = "Ocurrió un error al crear el personal."; // Mensaje por defecto
      if (apiError) {
        if (apiError.email && Array.isArray(apiError.email) && apiError.email.length > 0) {
          errorMessage = apiError.email[0]; // Error específico del campo email
        } else if (apiError.detail) {
          errorMessage = apiError.detail; // Error general de DRF
        } else if (typeof apiError === 'object') {
          // Intenta concatenar todos los errores de campo si es un objeto de arrays
          const fieldErrors = Object.values(apiError).flat().join(' ');
          errorMessage = fieldErrors || JSON.stringify(apiError); // Fallback a stringify si no hay errores de campo claros
        }
      } else if (err.message) { // Si no hay err.response.data, usa el mensaje de error general
        errorMessage = err.message;
      }
      setCreateError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      // Asumiendo que tienes un input checkbox para is_active
      setEditFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (name === 'sucursal') {
      // Si cambia la sucursal en el form de edición, resetear la bodega
      setEditFormData(prev => ({ ...prev, sucursal: value, bodega: '' }));
    } else {
      setEditFormData({ ...editFormData, [name]: value });
    }
  };

  const openEditModalForPersonal = async (userToEdit: ListedUser) => {
    if (userToEdit.tipo_perfil !== 'Personal' && userToEdit.tipo_perfil !== 'Admin') {
      alert("La edición detallada solo está implementada para Personal.");
      return;
    }
    setEditingUser(userToEdit);
    setIsEditingLoading(true);
    setEditError(null);
    try {
      // El ID aquí es el ID del Usuario, que es el lookup_field en PersonalViewSet
      const response = await apiClient.get<PersonalDetail>(`/usuarios/personal/${userToEdit.id}/`);
      const personalDetail = response.data;
      setEditFormData({
        email: personalDetail.usuario.email,
        username: personalDetail.usuario.username || '',
        first_name: personalDetail.usuario.first_name || '',
        last_name: personalDetail.usuario.last_name || '',
        password: '', // No pre-rellenar contraseña
        password2: '',
        rol: personalDetail.rol,
        sucursal: personalDetail.sucursal?.toString() || '',
        bodega: personalDetail.bodega?.toString() || '',
        is_active: personalDetail.usuario.is_active !== undefined ? personalDetail.usuario.is_active : true,
      });
      // Después de setear editFormData, si hay una sucursal, el useEffect de filtrado para edición se encargará.
      // Si la sucursal cargada es válida, filteredBodegasListEditForm se poblará.
      // Si no, quedará vacía.
      // Esto es importante para que el select de bodega en el modal de edición
      // muestre las opciones correctas desde el inicio si una sucursal ya está seleccionada.
      // No es necesario llamar a setFilteredBodegasListEditForm explícitamente aquí.

      setShowEditModal(true);
    } catch (err) {
      console.error("Error al cargar datos del personal para editar:", err);
      setEditError("No se pudieron cargar los datos del usuario para editar.");
    } finally {
      setIsEditingLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (editFormData.password !== editFormData.password2) {
      setEditError("Las contraseñas no coinciden.");
      return;
    }
    setIsEditingLoading(true);
    setEditError(null);
    try {
      // Construir el objeto de datos a enviar, excluyendo contraseñas si están vacías
      const { password, password2, ...restOfData } = editFormData;
      const dataToUpdate: any = { ...restOfData };

      if (password && password2 && password === password2) {
        dataToUpdate.password = password;
      } else if (password && password !== password2) {
        // Si se proporcionó una contraseña pero no coinciden, ya se manejó el error.
        // No se envía la contraseña en este caso para evitar problemas.
        // O podrías lanzar un error aquí de nuevo si prefieres.
      }
      await apiClient.patch(`/usuarios/personal/${editingUser.id}/`, dataToUpdate); // dataToUpdate ahora no tendrá 'password' si estaba vacío
      setShowEditModal(false);
      setEditingUser(null);
      fetchUsuarios(); // Recargar lista
      // Considera un mensaje de éxito para la edición
    } catch (err: any) {
      console.error("Error al actualizar personal:", err.response?.data || err.message);
      setEditError(err.response?.data?.detail || "Ocurrió un error al actualizar el personal.");
    } finally {
      setIsEditingLoading(false);
    }
  };

    // Separar usuarios en personal y clientes para renderizar en tablas distintas
    const personalUsuarios = usuarios.filter(u => u.tipo_perfil === 'Personal' || (u.tipo_perfil === 'Admin' && u.is_staff));
    const clienteUsuarios = usuarios.filter(u => u.tipo_perfil === 'Cliente');
    const otrosUsuarios = usuarios.filter(u => u.tipo_perfil !== 'Personal' && u.tipo_perfil !== 'Cliente' && !(u.tipo_perfil === 'Admin' && u.is_staff));
  return (
    <>
      {/* Modal de Edición (simplificado) */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3 max-h-[70vh] overflow-y-auto"> {/* Se eliminó text-center y se añadió scroll */}
              <h3 className="text-lg leading-6 font-medium text-gray-900">Editar Personal: {editFormData.email}</h3>
              {isEditingLoading && <p className="text-sm text-gray-500 py-2">Cargando datos / Guardando...</p>}
              {editError && <p className="bg-red-100 text-red-700 p-3 rounded my-2 text-sm">{editError}</p>}
              <form onSubmit={handleEditSubmit} className="mt-2 px-7 py-3 space-y-4 text-left">
                <div><label className="block text-sm font-medium">Email:</label><input type="email" name="email" value={editFormData.email} onChange={handleEditFormChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
                <div><label className="block text-sm font-medium">Nombre de Usuario:</label><input type="text" name="username" value={editFormData.username} onChange={handleEditFormChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
                <div><label className="block text-sm font-medium">Nombre:</label><input type="text" name="first_name" value={editFormData.first_name} onChange={handleEditFormChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
                <div><label className="block text-sm font-medium">Apellido:</label><input type="text" name="last_name" value={editFormData.last_name} onChange={handleEditFormChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
                <div>
                  <label className="block text-sm font-medium">Rol:</label>
                  <select name="rol" value={editFormData.rol} onChange={handleEditFormChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2">
                    {ROLES_PERSONAL.filter(r => r.value !== '').map(rol => <option key={rol.value} value={rol.value}>{rol.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Sucursal (Opcional):</label>
                  <select name="sucursal" value={editFormData.sucursal} onChange={handleEditFormChange} disabled={loadingSucursales} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2">
                    <option value="">{loadingSucursales ? "Cargando..." : "Seleccione sucursal"}</option>
                    {sucursalesList.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Bodega (Opcional):</label>
                  <select name="bodega" value={editFormData.bodega} onChange={handleEditFormChange} disabled={loadingBodegas || !editFormData.sucursal} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 disabled:bg-gray-100">
                    <option value="">{loadingBodegas ? "Cargando..." : (editFormData.sucursal ? "Seleccione bodega" : "Seleccione sucursal primero")}</option>
                    {filteredBodegasListEditForm.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.tipo_bodega_tipo ? `${b.tipo_bodega_tipo} - ${b.direccion}` : b.direccion} ({b.sucursal_nombre || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>
                <div><label className="block text-sm font-medium">Nueva Contraseña (dejar en blanco para no cambiar):</label><input type="password" name="password" value={editFormData.password} onChange={handleEditFormChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
                <div><label className="block text-sm font-medium">Confirmar Nueva Contraseña:</label><input type="password" name="password2" value={editFormData.password2} onChange={handleEditFormChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
                <div className="flex items-center">
                  <input type="checkbox" name="is_active" id="edit_is_active" checked={editFormData.is_active} onChange={handleEditFormChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"/>
                  <label htmlFor="edit_is_active" className="ml-2 block text-sm text-gray-900">Usuario Activo</label>
                </div>
                <div className="items-center px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" disabled={isEditingLoading} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                    {isEditingLoading ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                  <button type="button" onClick={() => { setShowEditModal(false); setEditingUser(null); setEditError(null);}} disabled={isEditingLoading} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    <div className="container mx-auto p-4">
      <Link to="/personal/admin/dashboard" className="text-blue-600 hover:underline mb-6 inline-block">&larr; Volver al Dashboard de Admin</Link>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-6">Gestionar Usuarios</h2>

        {/* Mensaje de éxito de creación (ahora se muestra aquí y se auto-limpia) */}
        {createSuccessMessage && <p className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">{createSuccessMessage}</p>}
        {/* Podrías optar por mostrar createError aquí también si es un error que impide mostrar el formulario */}

        {/* Botón para mostrar/ocultar formulario de creación */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
          >
            {showCreateForm ? 'Ocultar Formulario de Creación' : 'Crear Nuevo Personal'}
          </button>
        </div>

        {/* Formulario de Creación de Personal (condicional) */}
        {showCreateForm && (
          <div className="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="text-xl font-semibold mb-4">Formulario de Creación de Personal</h3>
            {/* Mensaje de error específico del formulario de creación */}
            {createError && <p className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{createError}</p>}
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium">Email:</label><input type="email" name="email" value={createFormData.email} onChange={handleCreateFormChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
              <div><label className="block text-sm font-medium">Nombre de Usuario:</label><input type="text" name="username" value={createFormData.username} onChange={handleCreateFormChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
              <div><label className="block text-sm font-medium">Nombre:</label><input type="text" name="first_name" value={createFormData.first_name} onChange={handleCreateFormChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
              <div><label className="block text-sm font-medium">Apellido:</label><input type="text" name="last_name" value={createFormData.last_name} onChange={handleCreateFormChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
              <div><label className="block text-sm font-medium">Contraseña:</label><input type="password" name="password" value={createFormData.password} onChange={handleCreateFormChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
              <div><label className="block text-sm font-medium">Confirmar Contraseña:</label><input type="password" name="password2" value={createFormData.password2} onChange={handleCreateFormChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
              <div>
                <label className="block text-sm font-medium">Rol:</label>
                <select name="rol" value={createFormData.rol} onChange={handleCreateFormChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2">
                  {ROLES_PERSONAL.filter(r => r.value !== '').map(rol => <option key={rol.value} value={rol.value}>{rol.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Sucursal (Opcional):</label>
                <select name="sucursal" value={createFormData.sucursal} onChange={handleCreateFormChange} disabled={loadingSucursales} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2">
                  <option value="">{loadingSucursales ? "Cargando..." : "Seleccione sucursal"}</option>
                  {sucursalesList.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              {/* Mostrar el campo Bodega solo si el rol seleccionado es BODEGUERO */}
              {createFormData.rol === 'BODEGUERO' && (
                <div>
                  <label className="block text-sm font-medium">Bodega (Requerido para Bodeguero):</label>
                  <select name="bodega" value={createFormData.bodega} onChange={handleCreateFormChange} disabled={loadingBodegas || !createFormData.sucursal} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 disabled:bg-gray-100">
                    <option value="">{loadingBodegas ? "Cargando..." : (createFormData.sucursal ? "Seleccione bodega" : "Seleccione sucursal primero")}</option>
                    {filteredBodegasListCreateForm.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.tipo_bodega_tipo ? `${b.tipo_bodega_tipo} - ${b.direccion}` : b.direccion} ({b.sucursal_nombre || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {/* 
                Campos antiguos como input numérico (se reemplazan por selects):
                <div><label className="block text-sm font-medium">ID Sucursal (Opcional):</label><input type="number" name="sucursal" value={createFormData.sucursal} onChange={handleCreateFormChange} placeholder="Ej: 1" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
                <div><label className="block text-sm font-medium">ID Bodega (Opcional):</label><input type="number" name="bodega" value={createFormData.bodega} onChange={handleCreateFormChange} placeholder="Ej: 1" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
              */}
              <button type="submit" disabled={isCreating} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:opacity-50">{isCreating ? 'Creando...' : 'Guardar Personal'}</button>
            </form>
          </div>
        )}

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-md">
          <div>
            <label htmlFor="filtroTipoPerfil" className="block text-sm font-medium text-gray-700 mb-1">Tipo de Perfil:</label>
            <select
              id="filtroTipoPerfil"
              value={filtroTipoPerfil}
              onChange={(e) => setFiltroTipoPerfil(e.target.value)}
              className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              {TIPOS_PERFIL.map(tipo => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
            </select>
          </div>
          
          {filtroTipoPerfil === 'personal' && (
            <div>
              <label htmlFor="filtroRol" className="block text-sm font-medium text-gray-700 mb-1">Rol (Personal):</label>
              <select
                id="filtroRol"
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value)}
                disabled={filtroTipoPerfil !== 'personal'}
                className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
              >
                {ROLES_PERSONAL.map(rol => <option key={rol.value} value={rol.value}>{rol.label}</option>)}
              </select>
            </div>
          )}
          {/* El botón de aplicar filtros no es estrictamente necesario si useEffect reacciona a los cambios de estado del filtro */}
          {/* <div className="md:col-start-3 flex items-end">
            <button 
              onClick={handleFilterChange} // fetchUsuarios se llama en useEffect
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm"
            >
              Aplicar Filtros
            </button>
          </div> */}
        </div>

        {isLoadingList && <p className="text-center py-4">Cargando usuarios...</p>}
        {listError && <p className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">Error al cargar la lista: {listError}</p>}
        
        {/* Tabla para Personal */}
        {(!isLoadingList && !listError && (filtroTipoPerfil === '' || filtroTipoPerfil === 'personal')) && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Personal del Sistema</h3>
            {personalUsuarios.length > 0 ? (
              <div className="overflow-x-auto shadow-md sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {personalUsuarios.map((usuario) => (
                      <tr key={usuario.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{usuario.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{usuario.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{usuario.username || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{usuario.first_name} {usuario.last_name}</td>
                        {/* Use usuario.rol directly as it's the display name from UsuarioListSerializer */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{usuario.rol || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            usuario.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {usuario.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            to={`/personal/admin/gestionar-usuarios/${usuario.id}`}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            title="Ver detalles del usuario"
                          >
                            Detalles
                          </Link>
                          <button 
                            onClick={() => { 
                              // Asegurarse de llamar a la función que carga los datos para la edición
                              if (usuario.tipo_perfil === 'Personal' || usuario.tipo_perfil === 'Admin') {
                                openEditModalForPersonal(usuario);
                              } else {
                                alert("La edición detallada solo está implementada para Personal.");
                              }
                            }} 
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                            title="Editar usuario"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={async () => {
                              if (window.confirm(`¿Seguro que quieres ${usuario.is_active ? 'desactivar' : 'activar'} a ${usuario.email}?`)) {
                                try {
                                  await apiClient.patch(`/usuarios/personal/${usuario.id}/`, { is_active: !usuario.is_active });
                                  fetchUsuarios(); // Recargar lista
                                } catch (patchError) { console.error("Error al cambiar estado:", patchError); alert("Error al cambiar estado del usuario."); }
                              }}}
                            className={usuario.is_active ? "text-yellow-600 hover:text-yellow-900 mr-3" : "text-green-600 hover:text-green-900 mr-3"}
                            title={usuario.is_active ? "Desactivar usuario" : "Activar usuario"}
                          >
                            {usuario.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                          <button 
                            onClick={async () => {
                              if (window.confirm(`¿Seguro que quieres ELIMINAR PERMANENTEMENTE a ${usuario.email}? Esta acción no se puede deshacer.`)) {
                                try {
                                  await apiClient.delete(`/usuarios/personal/${usuario.id}/`);
                                  fetchUsuarios(); // Recargar lista
                                } catch (deleteError) { console.error("Error al eliminar:", deleteError); alert("Error al eliminar usuario."); }
                              }}}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar usuario permanentemente"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No se encontró personal con los filtros aplicados.</p>
            )}
          </div>
        )}

        {/* Tabla para Clientes */}
        {(!isLoadingList && !listError && (filtroTipoPerfil === '' || filtroTipoPerfil === 'cliente')) && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Clientes</h3>
            {clienteUsuarios.length > 0 ? (
              <div className="overflow-x-auto shadow-md sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {clienteUsuarios.map((usuario) => (
                      <tr key={usuario.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{usuario.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{usuario.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{usuario.username || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{usuario.first_name} {usuario.last_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            usuario.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {usuario.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            to={`/personal/admin/gestionar-usuarios/${usuario.id}`}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            title="Ver detalles del cliente"
                          >
                            Detalles
                          </Link>
                          {/* Botón de Editar eliminado para Clientes */}
                          <button 
                            onClick={async () => {
                              if (window.confirm(`¿Seguro que quieres ${usuario.is_active ? 'desactivar' : 'activar'} a ${usuario.email}?`)) {
                                try {
                                  // Usar el nuevo endpoint genérico para actualizar Usuario
                                  await apiClient.patch(`/usuarios/usuarios-admin/${usuario.id}/`, { is_active: !usuario.is_active });
                                  fetchUsuarios(); // Recargar lista si la acción se completa
                                } catch (patchError) { console.error("Error al cambiar estado:", patchError); alert("Error al cambiar estado del usuario."); }
                              }}}
                            className={usuario.is_active ? "text-yellow-600 hover:text-yellow-900 mr-3" : "text-green-600 hover:text-green-900 mr-3"}
                            title={usuario.is_active ? "Desactivar cliente" : "Activar cliente"}
                          >
                            {usuario.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                          <button 
                            onClick={async () => {
                              if (window.confirm(`¿Seguro que quieres ELIMINAR PERMANENTEMENTE a ${usuario.email}?`)) {
                                try {
                                  await apiClient.delete(`/usuarios/usuarios-admin/${usuario.id}/`);
                                  fetchUsuarios(); // Recargar lista
                                } catch (deleteError) { console.error("Error al eliminar cliente:", deleteError); alert("Error al eliminar cliente."); }
                              }}}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar cliente permanentemente"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No se encontraron clientes con los filtros aplicados.</p>
            )}
          </div>
        )}

        {/* Tabla para "Otros Usuarios" (Usuario Base) */}
        {(!isLoadingList && !listError && (filtroTipoPerfil === '' || filtroTipoPerfil === 'base') && otrosUsuarios.length > 0) && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Usuarios Base (Sin Perfil Específico)</h3>
             <div className="overflow-x-auto shadow-md sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {otrosUsuarios.map((usuario) => (
                      <tr key={usuario.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{usuario.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{usuario.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{usuario.username || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{usuario.first_name} {usuario.last_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            usuario.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {usuario.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                           <Link
                            to={`/personal/admin/gestionar-usuarios/${usuario.id}`}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            title="Ver detalles del usuario base"
                          >
                            Detalles
                          </Link>
                           <button 
                            onClick={async () => {
                              if (window.confirm(`¿Seguro que quieres ${usuario.is_active ? 'desactivar' : 'activar'} a ${usuario.email}? (Usuario Base)`)) {
                                try {
                                  // Usar el nuevo endpoint genérico para actualizar Usuario
                                  await apiClient.patch(`/usuarios/usuarios-admin/${usuario.id}/`, { is_active: !usuario.is_active });
                                  // fetchUsuarios(); // Recargar lista
                                } catch (patchError) { console.error("Error al cambiar estado:", patchError); alert("Error al cambiar estado del usuario."); }
                              }}}
                            className={usuario.is_active ? "text-yellow-600 hover:text-yellow-900 mr-3" : "text-green-600 hover:text-green-900 mr-3"}
                            title={usuario.is_active ? "Desactivar usuario base" : "Activar usuario base"}
                           >
                             {usuario.is_active ? 'Desactivar' : 'Activar'}
                           </button>
                           {/* Botón de Editar eliminado para Usuarios Base */}
                           <button 
                            onClick={async () => {
                              if (window.confirm(`¿Seguro que quieres ELIMINAR PERMANENTEMENTE a ${usuario.email} (Usuario Base)? Esta acción no se puede deshacer.`)) {
                                try {
                                  await apiClient.delete(`/usuarios/usuarios-admin/${usuario.id}/`);
                                  fetchUsuarios(); // Recargar lista
                                } catch (deleteError) { console.error("Error al eliminar usuario base:", deleteError); alert("Error al eliminar usuario base."); }
                              }}}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar usuario base permanentemente"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default GestionarUsuariosPage;
