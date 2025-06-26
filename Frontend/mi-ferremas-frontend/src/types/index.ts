// src/types/index.ts

export interface Region {
    id: number;
    nombre: string;
    // Si tu API devuelve más campos para Región, añádelos aquí.
    // Ejemplo:
    // numero_romano?: string; // Opcional si no siempre viene
}

export interface Comuna {
    id: number;
    nombre: string;
    region: number; // Generalmente el ID de la región a la que pertenece
    // Si tu API devuelve más campos para Comuna, añádelos aquí.
}

// Aquí puedes añadir otras interfaces o tipos que uses en tu aplicación.
// Por ejemplo: export interface UserProfile { ... }