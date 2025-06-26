import React from 'react';
import { useCart, CartItem } from '../../contexts/CartContext';
import { Link } from 'react-router-dom';

const CartPage: React.FC = () => {
  const { items, totalItems, totalPrice, removeItem, updateQuantity, clearCart } = useCart();

  const handleUpdateQuantity = (item: CartItem, quantity: number) => {
    updateQuantity(item.id, quantity);
  };

  const handleRemoveItem = (item: CartItem) => {
    removeItem(item.id);
  };

  const handleClearCart = () => {
    clearCart();
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Tu Carrito está Vacío</h2>
        <p className="text-gray-600">Parece que aún no has añadido ningún producto.</p>
        <Link to="/" className="mt-4 inline-block px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">
          Explorar Productos
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-3xl font-bold mb-6 text-gray-900">Carrito de Compras</h2>

      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="border-b border-gray-200 pb-4 mb-4">
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between py-4 border-t border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-4">
                {/* Imagen del producto (si está disponible) */}
                {item.imagen_url ? (
                  <img src={item.imagen_url} alt={item.nombre} className="w-16 h-16 object-cover rounded" />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 flex items-center justify-center rounded text-gray-500 text-xs">No Img</div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{item.nombre}</h3>
                  <p className="text-gray-600">${item.precio.toLocaleString('es-CL')}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* Selector de Cantidad */}
                <input
                  type="number"
                  value={item.cantidad}
                  onChange={(e) => handleUpdateQuantity(item, parseInt(e.target.value, 10) || 0)}
                  min="0"
                  className="w-16 px-2 py-1 border border-gray-300 rounded-md text-center"
                />

                {/* Subtotal */}
                <p className="text-lg font-semibold text-gray-800 w-24 text-right">
                  ${(item.precio * item.cantidad).toLocaleString('es-CL')}
                </p>

                {/* Botón Eliminar */}
                <button
                  onClick={() => handleRemoveItem(item)}
                  className="text-red-600 hover:text-red-800"
                  aria-label={`Eliminar ${item.nombre}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Resumen del Carrito */}
        <div className="flex justify-end items-center space-x-4 text-xl font-bold text-gray-900 mt-6">
          <span>Total ({totalItems} items):</span>
          <span>${totalPrice.toLocaleString('es-CL')}</span>
        </div>

        {/* Botones de Acción */}
        <div className="flex justify-end space-x-4 mt-6">
          <button
            onClick={handleClearCart}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
          >
            Vaciar Carrito
          </button>
          <Link
            to="/checkout" 
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700"
          >
            Proceder al Pago
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CartPage;