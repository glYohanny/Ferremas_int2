import React from 'react';
import { Link } from 'react-router-dom';

const GenerarReportesPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <Link to="/personal/admin/dashboard" className="text-blue-600 hover:underline mb-4 inline-block">&larr; Volver al Dashboard de Admin</Link>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Generar Reportes</h2>
        <p className="text-sm text-gray-600 mb-4">Aquí podrás generar diferentes reportes del sistema.</p>
        <div className="space-y-2">
          <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded mr-2">Reporte de Ventas</button>
          <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded mr-2">Reporte de Inventario</button>
          {/* Añadir más botones de reportes según sea necesario */}
        </div>
        {/* Aquí podría ir un área para mostrar resultados de reportes o enlaces de descarga */}
      </div>
    </div>
  );
};

export default GenerarReportesPage;