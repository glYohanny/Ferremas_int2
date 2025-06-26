import React from 'react';

const facturas = [
    { folio: 1123, monto: 150000, estado: 'Aceptada', color: 'green' },
    { folio: 1124, monto: 75000, estado: 'Aceptada', color: 'green' },
    { folio: 1125, monto: 23000, estado: 'Pendiente', color: 'yellow' },
    { folio: 1126, monto: 45000, estado: 'Rechazada', color: 'red' },
];

const FacturacionElectronica: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-700">🧾 Resumen de Facturación Electrónica</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left py-2 px-4">Folio</th>
              <th className="text-left py-2 px-4">Monto</th>
              <th className="text-left py-2 px-4">Estado SII</th>
              <th className="text-center py-2 px-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {facturas.map((factura) => (
              <tr key={factura.folio} className="border-b">
                <td className="py-2 px-4">{factura.folio}</td>
                <td className="py-2 px-4">${factura.monto.toLocaleString('es-CL')}</td>
                <td className="py-2 px-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${factura.color}-100 text-${factura.color}-800`}>
                        {factura.estado}
                    </span>
                </td>
                <td className="py-2 px-4 text-center">
                  <button className="text-indigo-600 hover:text-indigo-900">Ver Factura</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FacturacionElectronica;

