import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

// 1. Define la interfaz para un ítem del carrito
export interface CartItem { // Añadido 'export' aquí
  id: number;
  name: string;
  price: number;
  quantity: number;
  imagen_url?: string;
}

// 2. Define la interfaz para el contexto del carrito
interface CartContextType {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addToCart: (item: CartItem) => void;
  removeItem: (itemId: number) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  clearCart: () => void;
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
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = useCallback((item: CartItem) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id);
      if (existingItem) {
        return prevItems.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i,
        );
      }
      return [...prevItems, { ...item, quantity: item.quantity || 1 }];
    });
  }, []);

  const removeItem = useCallback((itemId: number) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: number, quantity: number) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, quantity: Math.max(0, quantity) } : item,
      ).filter(item => item.quantity > 0), // Opcional: remover si la cantidad es 0
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const contextValue: CartContextType = {
    items,
    totalItems,
    totalPrice,
    addToCart,
    removeItem,
    updateQuantity,
    clearCart,
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};