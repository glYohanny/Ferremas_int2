import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.tsx'; // Importa el AuthProvider
import { SucursalProvider } from './contexts/SucursalContext.tsx'; // Importa SucursalProvider
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider> {/* Envuelve App con AuthProvider */}
        <SucursalProvider> {/* Envuelve App con SucursalProvider */}
          <App />
        </SucursalProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
