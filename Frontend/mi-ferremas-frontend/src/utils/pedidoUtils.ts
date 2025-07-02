export const getStatusColor = (estado: string) => {
  switch (estado) {
    case 'POR_CONFIRMAR':
      return 'bg-yellow-200 text-yellow-800';
    case 'PREPARADO':
      return 'bg-blue-200 text-blue-800';
    case 'EN_ESPERA_DE_PAGO':
      return 'bg-orange-200 text-orange-800';
    case 'ENTREGADO':
      return 'bg-green-200 text-green-800';
    case 'CANCELADO':
      return 'bg-red-200 text-red-800';
    default:
      return 'bg-gray-200 text-gray-800';
  }
};
