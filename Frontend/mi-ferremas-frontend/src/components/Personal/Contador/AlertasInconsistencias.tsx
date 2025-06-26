import React from 'react';

const AlertasInconsistencias: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-yellow-600">📌 Alertas de Inconsistencias</h2>
      <ul className="space-y-2 text-gray-700">
        <li className="p-2 bg-yellow-50 rounded-md">Transacción #10515 sin boleta asociada.</li>
        <li className="p-2 bg-yellow-50 rounded-md">Pago duplicado detectado para pedido #10499.</li>
        <li className="p-2 bg-yellow-50 rounded-md">Venta registrada fuera de horario: Pedido #10520 a las 23:45.</li>
      </ul>
    </div>
  );
};

export default AlertasInconsistencias;

