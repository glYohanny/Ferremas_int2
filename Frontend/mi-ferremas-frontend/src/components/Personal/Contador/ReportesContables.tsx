import React from 'react';

const ReportesContables: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-700">🧮 Reportes Contables</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="report-type" className="block text-sm font-medium text-gray-700">Tipo de Reporte</label>
          <select id="report-type" className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
            <option>Reporte de Ventas</option>
            <option>Registro de Boletas/Facturas</option>
            <option>Libro de Compras</option>
            <option>Libro de Ventas</option>
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">Fecha Inicio</label>
            <input type="date" id="start-date" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">Fecha Fin</label>
            <input type="date" id="end-date" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
          </div>
        </div>
        <div className="flex justify-end space-x-3">
            <button className="bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700">Generar PDF</button>
            <button className="bg-green-700 text-white font-bold py-2 px-4 rounded-md hover:bg-green-800">Exportar a Excel</button>
        </div>
      </div>
    </div>
  );
};

export default ReportesContables;

