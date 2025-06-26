import React, { createContext, useContext, useState, ReactNode } from 'react';

// 1. Define la interfaz para un ítem del carrito
interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

// 2. Define la interfaz para el contexto del carrito
interface CartContextType {
  cartItems: CartItem[];
  totalItems: number;
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: number) => void; // Puedes implementar esto más tarde
  updateQuantity: (itemId: number, quantity: number) => void; // Puedes implementar esto más tarde
  clearCart: () => void; // Puedes implementar esto más tarde
}

// Crea el contexto con un valor inicial undefined
const CartContext = createContext<CartContextType | undefined>(undefined);

// Hook personalizado para usar el carrito
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// Proveedor del contexto del carrito
export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = (item: CartItem) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id);
      if (existingItem) {
        return prevItems.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...prevItems, item];
    });
  };

  const removeFromCart = (itemId: number) => { /* Implementar lógica para remover */ };
  const updateQuantity = (itemId: number, quantity: number) => { /* Implementar lógica para actualizar cantidad */ };
  const clearCart = () => { /* Implementar lógica para limpiar carrito */ };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const contextValue: CartContextType = {
    cartItems,
    totalItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};