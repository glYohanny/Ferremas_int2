import React, { useState, useEffect } from 'react';
import apiClient from '../../../services/api';

interface ResumenIngresosData {
  total_ingresos_confirmados_ultimo_mes: number;
  // Puedes añadir más métricas aquí si tu backend las proporciona
}

const ResumenIngresos: React.FC = () => {
  const [data, setData] = useState<ResumenIngresosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResumenIngresos = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<ResumenIngresosData>('/finanzas/resumen-ingresos/');
        setData(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Error al cargar el resumen de ingresos.');
      } finally {
        setLoading(false);
      }
    };

    fetchResumenIngresos();
  }, []);

  if (loading) return <div className="bg-white p-6 rounded-lg shadow-md"><p>Cargando resumen de ingresos...</p></div>;
  if (error) return <div className="bg-white p-6 rounded-lg shadow-md"><p className="text-red-500">{error}</p></div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">📊 Resumen de Ingresos</h2>
      {data ? (
        <div>
          <p className="text-gray-600 text-lg">
            Total de ingresos confirmados (último mes):{' '}
            <span className="font-bold text-green-600">${data.total_ingresos_confirmados_ultimo_mes.toLocaleString()}</span>
          </p>
          {/* Aquí puedes añadir más detalles si tu backend los proporciona */}
        </div>
      ) : (
        <p className="text-gray-500">No hay datos de resumen de ingresos disponibles.</p>
      )}
    </div>
  );
};

export default ResumenIngresos;