const baseURL = "/peticoes/api";

async function http(method, path, { params, body, headers } = {}) {
  const url = new URL(baseURL + path, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} - ${txt}`);
  }
  return res.json();
}

/* =========================
 * Fallback helpers (localStorage)
 * ========================= */

// LinkHub – guardamos uma única página por enquanto
const LS_LINKPAGE_KEY = "linkhub:page";

function lsGetLinkPage() {
  try {
    const raw = localStorage.getItem(LS_LINKPAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function lsSetLinkPage(obj) {
  try {
    localStorage.setItem(LS_LINKPAGE_KEY, JSON.stringify(obj));
  } catch {}
}

// Assinaturas – guardamos um array para não quebrar métricas
const LS_SIGNATURES_KEY = "peticoes:signatures";

function lsGetSignatures() {
  try {
    const raw = localStorage.getItem(LS_SIGNATURES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function lsPushSignature(sig) {
  try {
    const arr = lsGetSignatures();
    arr.unshift(sig);
    localStorage.setItem(LS_SIGNATURES_KEY, JSON.stringify(arr));
  } catch {}
}

/* =========================
 * Util: resolve a "key" da petição (id numérico OU slug)
 * ========================= */
function resolvePetitionKeyFromArg(arg) {
  if (!arg) return null;
  if (arg.petition_key) return String(arg.petition_key);
  if (arg.slug) return String(arg.slug);
  if (arg.petition_id) return String(arg.petition_id);
  if (arg.id) return String(arg.id);
  return null;
}
function resolvePetitionKeyFromPayload(payload) {
  if (!payload) return null;
  if (payload.petition_key) return String(payload.petition_key);
  if (payload.slug) return String(payload.slug);
  if (payload.petition_id) return String(payload.petition_id);
  if (payload.id) return String(payload.id);
  return null;
}

/* =========================
 * API
 * ========================= */

export const api = {
  entities: {
    Petition: {
      // aceita string (order) ou objeto de params
      list: (arg) => {
        const params = typeof arg === "string" ? { order: arg } : (arg || {});
        if (!params.order) params.order = "-created_date";
        return http("GET", "/petitions", { params });
      },
      get: (key) => http("GET", `/petitions/${encodeURIComponent(key)}`),
      create: (payload) => http("POST", "/petitions", { body: payload }),
      update: (id, payload) => http("PATCH", `/petitions/${id}`, { body: payload }),
    },

    /* =========================
     * Signatures (por petição)
     * =========================
     * Backend oficial:
     *  - GET  /signatures/by-petition/{key}
     *  - POST /signatures/by-petition/{key}
     *  - GET  /signatures/stats/{key}
     *
     * Mantemos .list(arg) e .create(payload) por compat,
     * resolvendo automaticamente o 'key' (id ou slug).
     */
    Signature: {
      // Novo: chama direto com key (id ou slug)
      listByPetition: async (key, params = {}) => {
        const q = { ...params };
        // suporte a paginação básica (page, page_size, since, until)
        return await http("GET", `/signatures/by-petition/${encodeURIComponent(key)}`, {
          params: q,
        });
      },

      createByPetition: async (key, payload) => {
        // payload esperado: { full_name, email?, cpf?, phone?, city?, state?, terms_accepted, utm_*? }
        return await http("POST", `/signatures/by-petition/${encodeURIComponent(key)}`, {
          body: payload,
        });
      },

      stats: async (key) => {
        return await http("GET", `/signatures/stats/${encodeURIComponent(key)}`);
      },

      // Compat: antiga .list(arg)
      list: async (arg = {}) => {
        try {
          const key = resolvePetitionKeyFromArg(arg);
          if (!key) {
            // sem key não faz sentido listar por petição — cai no fallback para não quebrar telas antigas
            let arr = lsGetSignatures();
            if (arg && arg.petition_id) {
              arr = arr.filter((s) => String(s.petition_id) === String(arg.petition_id));
            }
            return { items: arr, page: 1, page_size: arr.length, total: arr.length };
          }
          const params = {};
          if (arg.since) params.since = arg.since;
          if (arg.until) params.until = arg.until;
          if (arg.page) params.page = arg.page;
          if (arg.page_size) params.page_size = arg.page_size;
          return await api.entities.Signature.listByPetition(key, params);
        } catch {
          // fallback localStorage
          let arr = lsGetSignatures();
          if (arg && arg.petition_id) {
            arr = arr.filter((s) => String(s.petition_id) === String(arg.petition_id));
          }
          return { items: arr, page: 1, page_size: arr.length, total: arr.length };
        }
      },

      // Compat: antiga .create(payload)
      create: async (payload) => {
        try {
          const key = resolvePetitionKeyFromPayload(payload);
          if (!key) throw new Error("petition key (id/slug) é obrigatório");
          // Monta body conforme o backend
          const body = {
            full_name: payload.full_name,
            email: payload.email ?? null,
            cpf: payload.cpf ?? null,
            phone: payload.phone ?? null,
            city: payload.city ?? null,
            state: payload.state ?? null,
            terms_accepted: !!payload.terms_accepted,
            utm_source: payload.utm_source ?? null,
            utm_medium: payload.utm_medium ?? null,
            utm_campaign: payload.utm_campaign ?? null,
          };
          return await api.entities.Signature.createByPetition(key, body);
        } catch {
          // fallback localStorage
          const now = new Date().toISOString();
          const sig = {
            id: `ls_${Math.random().toString(36).slice(2)}`,
            created_date: now,
            ...payload,
          };
          lsPushSignature(sig);
          return sig;
        }
      },
    },

    /* =========================
     * LinkPage (Link Hub)
     * =========================
     * Implementa list/get/create/update. Se endpoints não existirem,
     * usa localStorage (uma única página).
     */
    LinkPage: {
      list: async (arg = {}) => {
        try {
          const params = typeof arg === "string" ? { order: arg } : (arg || {});
          if (!params.order) params.order = "-created_date";
          const arr = await http("GET", "/link-pages", { params });
          if (Array.isArray(arr)) return arr;
          return [];
        } catch {
          const one = lsGetLinkPage();
          return one ? [one] : [];
        }
      },

      filter: async (params = {}) => {
        try {
          const arr = await http("GET", "/link-pages", { params });
          if (Array.isArray(arr)) return arr;
          return [];
        } catch {
          const one = lsGetLinkPage();
          if (!one) return [];
          if (params.slug) {
            const norm = String(params.slug).toLowerCase();
            const slug = String(one.slug || "").toLowerCase();
            return norm === slug ? [one] : [];
          }
          return [one];
        }
      },

      get: async (idOrSlug) => {
        try {
          return await http("GET", `/link-pages/${encodeURIComponent(idOrSlug)}`);
        } catch {
          const one = lsGetLinkPage();
          if (!one) return null;
          if (
            String(one.id) === String(idOrSlug) ||
            String(one.slug || "").toLowerCase() === String(idOrSlug).toLowerCase()
          ) {
            return one;
          }
          return null;
        }
      },

      create: async (payload) => {
        try {
          return await http("POST", "/link-pages", { body: payload });
        } catch {
          const obj = { ...payload, id: "local" };
          lsSetLinkPage(obj);
          return obj;
        }
      },

      update: async (id, payload) => {
        try {
          return await http("PATCH", `/link-pages/${encodeURIComponent(id)}`, { body: payload });
        } catch {
          const obj = { ...(lsGetLinkPage() || {}), ...payload, id: id || "local" };
          lsSetLinkPage(obj);
          return obj;
        }
      },
    },
  },

  /* =========================
   * (Opcional) auth helpers
   * ========================= */
  auth: {
    async me() {
      try {
        return await http("GET", "/auth/me");
      } catch {
        return null;
      }
    },
    async logout() {
      try {
        await http("POST", "/auth/logout");
      } catch {}
      window.location.href = "/peticoes/";
    },
  },
};

export const base44 = api;
