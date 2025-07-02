export interface Pedido {
  id: number;
  cliente_nombre: string;
  estado: string;
  total_pedido: number;
  fecha_pedido: string;
  cliente_email?: string;
  cliente_telefono?: string;
}


