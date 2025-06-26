import React from 'react';

const ConciliacionBancaria: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-700">🔄 Conciliación Bancaria</h2>
      <p className="text-gray-600 mb-4">Carga el archivo de movimientos de tu banco para cruzarlo con los registros del sistema.</p>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <p className="mb-2">Arrastra y suelta tu archivo CSV o Excel aquí</p>
        <p className="text-sm text-gray-500 mb-4">o</p>
        <button className="bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600">
          Seleccionar Archivo
        </button>
      </div>
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-600">Resultados de la última conciliación:</h3>
        <p className="text-gray-500">[Aquí se mostrarán las alertas de diferencias o faltantes]</p>
      </div>
    </div>
  );
};

export default ConciliacionBancaria;

