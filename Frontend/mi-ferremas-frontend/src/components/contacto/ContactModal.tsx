import React from 'react';

// Una interfaz genérica para cualquier entidad que pueda ser contactada
export interface Contactable {
  nombre: string;
  email?: string | null;
  telefono?: string | null;
}

interface ContactModalProps {
  contactInfo: Contactable | null;
  onClose: () => void;
}

const ContactModal: React.FC<ContactModalProps> = ({ contactInfo, onClose }) => {
  if (!contactInfo) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-auto">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Contactar: {contactInfo.nombre}</h3>
        <div className="space-y-3">
          {contactInfo.email && (
            <p className="text-gray-700">
              <span className="font-medium">Email:</span>{' '}
              <a href={`mailto:${contactInfo.email}`} className="text-blue-600 hover:underline">{contactInfo.email}</a>
            </p>
          )}
          {contactInfo.telefono && (
            <p className="text-gray-700">
              <span className="font-medium">Teléfono:</span>{' '}
              <a href={`tel:${contactInfo.telefono}`} className="text-blue-600 hover:underline">{contactInfo.telefono}</a>
            </p>
          )}
          {!contactInfo.email && !contactInfo.telefono && (<p className="text-gray-500">No hay información de contacto disponible.</p>)}
        </div>
        <button onClick={onClose} className="mt-6 bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors">Cerrar</button>
      </div>
    </div>
  );
};

export default ContactModal;
