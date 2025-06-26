import React from 'react';
import AlertasInconsistencias from '../../../components/Personal/Contador/AlertasInconsistencias';
import ConciliacionBancaria from '../../../components/Personal/Contador/ConciliacionBancaria';
import FacturacionElectronica from '../../../components/Personal/Contador/FacturacionElectronica';
import PagosPorConfirmar from '../../../components/Personal/Contador/PagosPorConfirmar';
import ReportesContables from '../../../components/Personal/Contador/ReportesContables';
import ResumenIngresos from '../../../components/Personal/Contador/ResumenIngresos';

const ContadorDashboardPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard del Contador</h1>
        <p className="text-gray-600">Bienvenido al panel de contabilidad. Aquí tienes un resumen de la actividad financiera.</p>
      </div>

      {/* Grid principal del dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna principal (más ancha) */}
        <div className="lg:col-span-2 space-y-8">
          <ResumenIngresos />
          <PagosPorConfirmar />
          <FacturacionElectronica />
        </div>

        {/* Columna lateral (más estrecha) */}
        <div className="lg:col-span-1 space-y-8">
          <ReportesContables />
          <ConciliacionBancaria />
          <AlertasInconsistencias />
          {/* Aquí se podrían agregar más componentes "extra" como Notificaciones o Control de Documentos */}
        </div>

      </div>
      </div>
  );
};

export default ContadorDashboardPage;
