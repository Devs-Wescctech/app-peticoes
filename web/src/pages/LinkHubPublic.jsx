// src/pages/LinkHubPublic.jsx
import React from "react";
import { useSearchParams, useParams } from "react-router-dom";
import { api } from "@/api/apiClient";

/**
 * Página pública do Link Hub.
 * Funciona com:
 *  - /peticoes/LinkHubPublic?slug=meu-hub   (formato com query)
 *  - /peticoes/hub/meu-hub                  (formato amigável)
 * Fallback: se nenhum slug/handle vier, tenta carregar a primeira LinkPage do backend
 * ou a versão do localStorage (para não quebrar).
 */

function normalizeSlug(v) {
  return (v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function LinkHubPublic() {
  const [search] = useSearchParams();
  const { handle } = useParams(); // para /hub/:handle
  const querySlug = search.get("slug");
  const resolvedSlug = normalizeSlug(querySlug || handle || "");

  const [state, setState] = React.useState({
    loading: true,
    page: null,
    petitions: [],
  });

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // 1) Carrega LinkPage
        let page = null;

        if (resolvedSlug) {
          // Buscar por slug/handle específico
          if (api.entities?.LinkPage?.filter) {
            try {
              const arr = await api.entities.LinkPage.filter({ slug: resolvedSlug });
              if (Array.isArray(arr) && arr.length) page = arr[0];
            } catch {}
          }
          // Fallback quando API não tem dado OU retorna vazio
          if (!page) {
            try {
              const ls = localStorage.getItem("linkhub:page");
              if (ls) {
                const parsed = JSON.parse(ls);
                if (normalizeSlug(parsed?.slug) === resolvedSlug) page = parsed;
              }
            } catch {}
          }
        } else {
          // Sem slug/handle: tenta pegar a primeira do backend
          if (api.entities?.LinkPage?.list) {
            try {
              const list = await api.entities.LinkPage.list({ order: "-created_date" });
              if (Array.isArray(list) && list.length) page = list[0];
            } catch {}
          }
          // Fallback também quando API retorna lista vazia
          if (!page) {
            try {
              const ls = localStorage.getItem("linkhub:page");
              if (ls) page = JSON.parse(ls);
            } catch {}
          }
        }

        // 2) Carrega Petitions para montar os botões
        let petitions = [];
        try {
          petitions = await api.entities.Petition.list({ order: "-created_date" });
        } catch {
          petitions = [];
        }

        if (!cancelled) {
          setState({ loading: false, page, petitions });
        }
      } catch {
        if (!cancelled) setState({ loading: false, page: null, petitions: [] });
      }
    }

    load();
    return () => { cancelled = true; };
  }, [resolvedSlug]);

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0b1220", color: "#fff" }}>
        <div className="text-center opacity-80">Carregando…</div>
      </div>
    );
  }

  if (!state.page) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#0b1220", color: "#fff" }}>
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">Página não encontrada</h1>
          <p className="mt-2 opacity-70">
            Este hub de links não existe ou não está disponível.
          </p>
        </div>
      </div>
    );
  }

  const {
    title = "Meu hub de links",
    bio = "",
    avatar_url = "",
    primary_color = "#0f172a",       // mantém compatibilidade
    bg_color = "#0b1220",            // novo
    header_color = "#ffffff",        // novo
    button_bg_color = "#ffffff",     // novo
    button_text_color = "#0f172a",   // novo
    button_border_color = "#e5e7eb", // novo
    show_counters = true,
    items = [],
  } = state.page;

  // Mapa de petitions
  const pmap = React.useMemo(() => {
    const m = new Map();
    for (const p of state.petitions || []) m.set(p.id, p);
    return m;
  }, [state.petitions]);

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: bg_color }}>
      {/* highlight sutil que não bloqueia clique */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(75% 55% at 50% 20%, rgba(99,102,241,0.15), transparent 60%)",
        }}
      />

      <main className="relative z-10 max-w-xl mx-auto px-6 py-12" style={{ color: header_color }}>
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          {avatar_url ? (
            <img
              src={avatar_url}
              alt="avatar"
              className="w-24 h-24 rounded-full border object-cover shadow-lg"
              style={{ borderColor: "rgba(255,255,255,0.25)" }}
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full border border-dashed flex items-center justify-center"
              style={{ borderColor: "rgba(255,255,255,0.35)", color: "rgba(255,255,255,0.6)" }}
            >
              <span className="text-sm">avatar</span>
            </div>
          )}
          <h1 className="mt-4 text-2xl font-bold" style={{ color: header_color }}>{title}</h1>
          {bio ? (
            <p className="mt-2 whitespace-pre-wrap" style={{ color: header_color, opacity: 0.85 }}>
              {bio}
            </p>
          ) : null}
        </div>

        {/* Links */}
        <div className="mt-8 space-y-3">
          {Array.isArray(items) && items.length > 0 ? (
            items.map((it) => {
              const pet = pmap.get(it.petition_id);
              if (!pet) return null;
              const label = (it.custom_label || pet.title || "Abrir").trim();
              const href = pet.slug
                ? `${window.location.origin}/peticoes/PublicPetition?slug=${encodeURIComponent(
                    pet.slug
                  )}`
                : "#";

              return (
                <a
                  key={it.petition_id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  {/* Botão padrão do sistema (outline clean) */}
                  <div
                    className="w-full rounded-xl border px-4 py-3 text-center font-medium transition-colors hover:bg-slate-50/40"
                    style={{
                      backgroundColor: button_bg_color,
                      color: button_text_color,
                      borderColor: button_border_color || "rgba(255,255,255,0.15)",
                    }}
                  >
                    <span>{label}</span>
                    {show_counters && pet.goal ? (
                      <span className="ml-2 text-xs" style={{ opacity: 0.8 }}>
                        meta {pet.goal}
                      </span>
                    ) : null}
                  </div>
                </a>
              );
            })
          ) : (
            <div className="text-center text-sm" style={{ color: header_color, opacity: 0.6 }}>
              Nenhum link configurado ainda.
            </div>
          )}
        </div>

        <div className="mt-10 text-center text-xs" style={{ color: header_color, opacity: 0.5 }}>
          Link Hub • PetiçõesBR
        </div>
      </main>
    </div>
  );
}
