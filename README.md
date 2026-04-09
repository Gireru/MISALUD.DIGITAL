# MISALUD — SD-NEXUS

Sistema digital de gestión de flujo de pacientes para clínicas de estudios clínicos.

## Descripción

MISALUD permite a los pacientes registrarse en kiosko, obtener un QR de seguimiento y visualizar su trayecto en tiempo real a través de los distintos módulos de estudio (Laboratorio, Rayos X, Ultrasonido, ECG, Densitometría, etc.). El personal médico cuenta con un panel de control para gestionar el flujo de pacientes y emitir alertas de emergencia.

## Requisitos

- Node.js 18+
- npm 9+

## Instalación

```bash
npm install
```

## Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```
VITE_API_BASE_URL=http://localhost:3001
```

## Ejecución en desarrollo

Primero, inicia el servidor de API local:

```bash
npm run server
```

Luego, en otra terminal, inicia el frontend:

```bash
npm run dev
```

La app estará disponible en `http://localhost:5173`.

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo Vite |
| `npm run server` | Inicia el servidor REST local (json-server) |
| `npm run build` | Genera el bundle de producción |
| `npm run preview` | Previsualiza el build de producción |

## Credenciales de acceso por defecto (desarrollo)

- **Panel admin**: `/admin-login?key=sdnexus2026`
- **Usuario**: Admin SD
- **Teléfono**: 5500000000
- **Contraseña**: admin2026
