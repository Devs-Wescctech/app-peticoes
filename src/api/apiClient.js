const API_BASE = "/peticoes/api";

async function http(path, opts={}) {
  const res = await fetch(API_BASE + path, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  entities: {
    Petition: {
      list: async (order='-created_date') =>
        (await http(`/petitions?order=${encodeURIComponent(order)}`)).items,
      filter: async (params) => {
        const q = new URLSearchParams(params).toString();
        return (await http(`/petitions?${q}`)).items;
      },
      create: (payload) => http(`/petitions`, { method: "POST", body: JSON.stringify(payload) }),
      update: (id, payload) => http(`/petitions/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
      get: (id_or_slug) => http(`/petitions/${id_or_slug}`),
      stats: (id_or_slug) => http(`/signatures/stats/${id_or_slug}`),
    },
    Signature: {
      byPetition: (id_or_slug, params={}) => {
        const q = new URLSearchParams(params).toString();
        return http(`/signatures/by-petition/${id_or_slug}?${q}`).then(r => r.items);
      },
      sign: (id_or_slug, payload) =>
        http(`/signatures/by-petition/${id_or_slug}`, { method: "POST", body: JSON.stringify(payload) }),
      list: async () => [], // implemente endpoint admin se precisar
    },
  },
  auth: {
    me: async () => ({ full_name: "Usuário", email: "user@example.com" }),
    logout: async () => {},
  }
};
