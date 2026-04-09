/**
 * Capa de compatibilidad: re-exporta el cliente REST propio.
 * Todos los módulos importan `api` desde este archivo.
 */
export { appClient as api } from './apiClient';
