import axios from 'axios';

// Helper function to get a cookie by name
function getCookie(name: string): string | null {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}
// Obtén la URL base de la API desde las variables de entorno
const API_BASE_URL = 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // <--- AÑADE ESTA LÍNEA
});

// Interceptor para añadir el token de autenticación a las peticiones
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken'); // O donde almacenes el token
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Añadir dinámicamente el token CSRF a cada solicitud que no sea GET, HEAD, OPTIONS
    if (config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
      const csrftoken = getCookie('csrftoken');
      if (csrftoken) {
        config.headers['X-CSRFToken'] = csrftoken;
      } else {
        console.warn('CSRF token not found for a state-changing request. Request might fail.');
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;