/**
 * apiClient.js
 * Cliente REST propio que reemplaza el SDK de terceros.
 * Expone la misma interfaz que se usaba previamente, por lo que
 * todos los imports existentes siguen funcionando sin cambios.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// ── Utilidades ────────────────────────────────────────────────────────────────

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    const err = new Error(text || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

// ── Entity builder ────────────────────────────────────────────────────────────

/**
 * Mapea el nombre de entidad (PascalCase) al path REST en json-server.
 * json-server usa kebab-case y pluraliza automáticamente.
 */
const ENTITY_PATHS = {
  Patient:          '/patients',
  ClinicalJourney:  '/clinicalJourneys',
  ClinicalModule:   '/clinicalModules',
  JourneyComment:   '/journeyComments',
  AdminCredential:  '/adminCredentials',
  EmergencyCode:    '/emergencyCodes',
  User:             '/users',
};

function buildEntityClient(entityName) {
  const path = ENTITY_PATHS[entityName];
  if (!path) throw new Error(`Entity not registered: ${entityName}`);

  // Subscriptions implemented as polling
  const subscribers = new Set();
  let pollingTimer = null;

  function startPolling() {
    if (pollingTimer) return;
    pollingTimer = setInterval(async () => {
      try {
        const data = await request('GET', path);
        subscribers.forEach(cb => cb(data));
      } catch { /* ignore polling errors */ }
    }, 5000); // every 5 seconds
  }

  return {
    /** List all records. order & limit are ignored by json-server but kept for API compatibility. */
    async list(_order, _limit) {
      return request('GET', path);
    },

    /**
     * Filter records by matching all key/value pairs in query object.
     * json-server supports ?key=value query params.
     */
    async filter(query = {}, _order, _limit) {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params.set(k, v);
      });
      const qs = params.toString() ? `?${params.toString()}` : '';
      return request('GET', `${path}${qs}`);
    },

    async create(data) {
      return request('POST', path, data);
    },

    async update(id, data) {
      return request('PATCH', `${path}/${id}`, data);
    },

    async delete(id) {
      return request('DELETE', `${path}/${id}`);
    },

    /**
     * Subscribe to changes. Returns unsubscribe function.
     * Implemented as polling; fires callback with latest data.
     */
    subscribe(callback) {
      subscribers.add(callback);
      startPolling();
      return () => {
        subscribers.delete(callback);
        if (subscribers.size === 0 && pollingTimer) {
          clearInterval(pollingTimer);
          pollingTimer = null;
        }
      };
    },
  };
}

// ── Functions client ──────────────────────────────────────────────────────────

const functionsClient = {
  async invoke(functionName, payload) {
    const res = await request('POST', `/functions/${functionName}`, payload);
    return { data: res };
  },
};

// ── Auth client ───────────────────────────────────────────────────────────────

const authClient = {
  async me() {
    const raw = localStorage.getItem('sd_admin_session');
    if (!raw) throw Object.assign(new Error('Not authenticated'), { status: 401 });
    const session = JSON.parse(raw);
    if (Date.now() > session.expires) {
      localStorage.removeItem('sd_admin_session');
      throw Object.assign(new Error('Session expired'), { status: 401 });
    }
    return session;
  },
  logout() {
    localStorage.removeItem('sd_admin_session');
  },
  redirectToLogin() {
    window.location.href = '/admin-login?key=sdnexus2026';
  },
};

// ── Integrations stub ─────────────────────────────────────────────────────────

const integrationsClient = {
  Core: {
    async InvokeLLM({ prompt, response_json_schema } = {}) {
      // Stub: forward to local backend if available, otherwise return placeholder
      try {
        const res = await request('POST', '/integrations/llm', { prompt, response_json_schema });
        return res;
      } catch {
        return { result: 'El asistente no está disponible en este momento.' };
      }
    },
    async SendEmail(payload) {
      return request('POST', '/integrations/email', payload).catch(() => null);
    },
    async UploadFile(payload) {
      return request('POST', '/integrations/upload', payload).catch(() => ({ url: '' }));
    },
  },
};

// ── Main export ───────────────────────────────────────────────────────────────

export const appClient = {
  entities: new Proxy({}, {
    get(_, entityName) {
      return buildEntityClient(entityName);
    },
  }),
  functions: functionsClient,
  auth: authClient,
  integrations: integrationsClient,
};
