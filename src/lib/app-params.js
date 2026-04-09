/**
 * app-params.js
 * Expone parámetros de configuración de la aplicación.
 * Se leen desde variables de entorno (archivo .env.local).
 */

export const appParams = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
};
