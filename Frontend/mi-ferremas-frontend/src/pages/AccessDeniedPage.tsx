import React from 'react';
import { Link } from 'react-router-dom';

const AccessDeniedPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4 text-center">
      <h1 className="text-3xl font-bold text-red-600 mb-4">Acceso Denegado</h1>
      <p className="text-xl text-gray-700 mb-6">No tienes permiso para ver esta página.</p>
      <Link to="/" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">Volver al Inicio</Link>
    </div>
  );
};

export default AccessDeniedPage;