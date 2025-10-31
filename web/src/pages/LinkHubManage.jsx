// src/pages/LinkHubManage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  Save,
  ExternalLink,
  Copy,
  Check,
  Image as ImageIcon,
  Eye,
  Plus,
} from "lucide-react";

/**
 * Estrutura sugerida para entidade no backend:
 * LinkPage = {
 *   id, slug, title, bio, avatar_url,
 *   primary_color,
 *   bg_color, header_color, button_bg_color, button_text_color, button_border_color,
 *   show_counters:boolean,
 *   items: [{ petition_id, custom_label? }]
 * }
 * Salvamos via api.entities.LinkPage.* (se existir).
 * Caso não exista, fallback em localStorage.
 */

const normalizeSlug = (v) =>
  (v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function LinkHubManage() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [copiedPretty, setCopiedPretty] = useState(false);
  const avatarRef = useRef(null);

  // Carrega petições para seleção
  const { data: petitions = [] } = useQuery({
    queryKey: ["petitions"],
    queryFn: () => api.entities.Petition.list({ order: "-created_date" }),
  });

  // Tenta buscar uma LinkPage atual (opcional: você pode amarrar por usuário logado)
  const { data: linkPages = [] } = useQuery({
    queryKey: ["link-pages"],
    queryFn: async () => {
      let arr = [];
      if (api.entities?.LinkPage?.list) {
        try {
          arr = await api.entities.LinkPage.list({ order: "-created_date" });
        } catch {}
      }
      // ✅ Fallback também quando a API retorna lista vazia
      if (!arr || arr.length === 0) {
        try {
          const ls = localStorage.getItem("linkhub:page");
          if (ls) arr = [JSON.parse(ls)];
        } catch {}
      }
      return arr || [];
    },
  });

  const current = linkPages[0] || null;

  const [form, setForm] = useState({
    slug: current?.slug || "",
    title: current?.title || "Meu hub de links",
    bio: current?.bio || "Escolha uma causa e ajude agora mesmo.",
    avatar_url: current?.avatar_url || "",
    primary_color: current?.primary_color || "#0f172a",
    // 🎨 Novas cores por seção (mantém compatibilidade com primary_color)
    bg_color: current?.bg_color || "#0b1220", // fundo da página pública
    header_color: current?.header_color || "#ffffff", // textos do cabeçalho
    button_bg_color: current?.button_bg_color || "#ffffff", // fundo dos botões
    button_text_color: current?.button_text_color || "#0f172a", // texto dos botões
    button_border_color: current?.button_border_color || "#e5e7eb", // borda dos botões
    show_counters: current?.show_counters ?? true,
    items: current?.items || [], // { petition_id, custom_label? }
  });

  useEffect(() => {
    if (current) {
      setForm({
        slug: current.slug || "",
        title: current.title || "Meu hub de links",
        bio: current.bio || "Escolha uma causa e ajude agora mesmo.",
        avatar_url: current.avatar_url || "",
        primary_color: current.primary_color || "#0f172a",
        bg_color: current.bg_color || "#0b1220",
        header_color: current.header_color || "#ffffff",
        button_bg_color: current.button_bg_color || "#ffffff",
        button_text_color: current.button_text_color || "#0f172a",
        button_border_color: current.button_border_color || "#e5e7eb",
        show_counters: current.show_counters ?? true,
        items: Array.isArray(current.items) ? current.items : [],
      });
    }
  }, [current?.id]); // eslint-disable-line

  // URL no formato com query (?slug=…)
  const publicUrl = useMemo(() => {
    if (!form.slug) return "";
    return `${window.location.origin}/peticoes/LinkHubPublic?slug=${encodeURIComponent(
      form.slug
    )}`;
  }, [form.slug]);

  // URL amigável (/hub/:handle)
  const prettyUrl = useMemo(() => {
    if (!form.slug) return "";
    return `${window.location.origin}/peticoes/hub/${encodeURIComponent(form.slug)}`;
  }, [form.slug]);

  const copyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  const copyPretty = async () => {
    if (!prettyUrl) return;
    try {
      await navigator.clipboard.writeText(prettyUrl);
      setCopiedPretty(true);
      setTimeout(() => setCopiedPretty(false), 1200);
    } catch {}
  };

  // Upload de avatar (reutiliza a sua API de upload)
  const [uploading, setUploading] = useState(false);
  const uploadAvatar = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/peticoes/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      const base = window.location.origin.replace(/\/peticoes.*/, "");
      const fullUrl = json.file_url.startsWith("http")
        ? json.file_url
        : `${base}${json.file_url}`;
      setForm((p) => ({ ...p, avatar_url: fullUrl }));
    } catch (e) {
      console.error("Falha upload avatar:", e);
    } finally {
      setUploading(false);
    }
  };

  const handleAddItem = (petitionId) => {
    if (!petitionId || form.items.some((it) => it.petition_id === petitionId)) return;
    setForm((p) => ({
      ...p,
      items: [...p.items, { petition_id: petitionId, custom_label: "" }],
    }));
  };

  const handleRemoveItem = (petitionId) => {
    setForm((p) => ({
      ...p,
      items: p.items.filter((it) => it.petition_id !== petitionId),
    }));
  };

  // Persistência
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const data = {
        ...payload,
        slug: normalizeSlug(payload.slug || "meu-hub"),
      };
      if (api.entities?.LinkPage?.list) {
        // backend disponível (se não houver update/create, cai no fallback logo abaixo)
        if (current?.id && api.entities.LinkPage.update) {
          return api.entities.LinkPage.update(current.id, data);
        }
        if (api.entities.LinkPage.create) {
          return api.entities.LinkPage.create(data);
        }
      }
      // ✅ Fallback localStorage SEMPRE funcional
      localStorage.setItem("linkhub:page", JSON.stringify({ ...data, id: "local" }));
      return { ...data, id: "local" };
    },
    onSuccess: (saved) => {
      // ✅ Atualiza cache e estado local para refletir imediatamente
      queryClient.setQueryData(["link-pages"], (prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        if (saved?.id === "local") return [saved];
        // se back-end respondeu, garante único
        return [saved, ...arr.filter((p) => p.id !== saved.id)];
      });
      setForm((p) => ({ ...p, slug: saved.slug })); // garante slug normalizado
      queryClient.invalidateQueries({ queryKey: ["link-pages"] });
    },
  });

  // Dados auxiliares
  const petitionMap = useMemo(() => {
    const m = new Map();
    for (const p of petitions) m.set(p.id, p);
    return m;
  }, [petitions]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-7xl px-4 pt-8 pb-2">
        <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500">
              Link-in-bio
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
              Gerenciar Hub de Links
            </h1>
            <p className="text-slate-600 mt-2">
              Crie uma página única com seus links de petições para compartilhar em redes sociais.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {publicUrl && (
              <>
                <Button variant="outline" onClick={copyLink} className="rounded-xl">
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  Copiar (query)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")}
                  className="rounded-xl"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir (query)
                </Button>
              </>
            )}
            {prettyUrl && (
              <>
                <Button variant="outline" onClick={copyPretty} className="rounded-xl">
                  {copiedPretty ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  Copiar /hub/
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(prettyUrl, "_blank", "noopener,noreferrer")}
                  className="rounded-xl"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir /hub/
                </Button>
              </>
            )}
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-10 grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Configurações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Slug (link)</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-slate-500">
                  {window.location.origin}/peticoes/LinkHubPublic?slug=
                </span>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((p) => ({ ...p, slug: normalizeSlug(e.target.value) }))}
                  placeholder="meu-hub"
                  className="rounded-xl"
                />
                {/* Dica do formato amigável (não removi nada do seu layout, apenas adicionei a info) */}
                <div className="text-xs text-slate-500 w-full">
                  Também disponível como: {window.location.origin}/peticoes/hub/<b>{form.slug || "meu-hub"}</b>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Ex: Apoie estas causas"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Bio/Descrição</Label>
              <Textarea
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                rows={4}
                className="rounded-xl"
              />
            </div>

            {/* 🎨 BLOCO DE CORES POR SEÇÃO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fundo da página</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={form.bg_color}
                    onChange={(e) => setForm((p) => ({ ...p, bg_color: e.target.value }))}
                    className="w-20 h-10 rounded-lg"
                  />
                  <Input
                    value={form.bg_color}
                    onChange={(e) => setForm((p) => ({ ...p, bg_color: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cor do cabeçalho</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={form.header_color}
                    onChange={(e) => setForm((p) => ({ ...p, header_color: e.target.value }))}
                    className="w-20 h-10 rounded-lg"
                  />
                  <Input
                    value={form.header_color}
                    onChange={(e) => setForm((p) => ({ ...p, header_color: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fundo do botão</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={form.button_bg_color}
                    onChange={(e) => setForm((p) => ({ ...p, button_bg_color: e.target.value }))}
                    className="w-20 h-10 rounded-lg"
                  />
                  <Input
                    value={form.button_bg_color}
                    onChange={(e) => setForm((p) => ({ ...p, button_bg_color: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Texto do botão</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={form.button_text_color}
                    onChange={(e) => setForm((p) => ({ ...p, button_text_color: e.target.value }))}
                    className="w-20 h-10 rounded-lg"
                  />
                  <Input
                    value={form.button_text_color}
                    onChange={(e) => setForm((p) => ({ ...p, button_text_color: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Borda do botão</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={form.button_border_color}
                    onChange={(e) => setForm((p) => ({ ...p, button_border_color: e.target.value }))}
                    className="w-20 h-10 rounded-lg"
                  />
                  <Input
                    value={form.button_border_color}
                    onChange={(e) => setForm((p) => ({ ...p, button_border_color: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  A cor primária antiga continua ativa como destaque geral: <span className="font-mono">{form.primary_color}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border px-3 py-3">
              <div>
                <Label className="block">Mostrar contadores</Label>
                <p className="text-xs text-slate-500">Exibir progresso/assinaturas nos botões</p>
              </div>
              <Switch
                checked={!!form.show_counters}
                onCheckedChange={(checked) => setForm((p) => ({ ...p, show_counters: !!checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Avatar</Label>
              {form.avatar_url ? (
                <div className="flex items-center gap-3">
                  <img
                    src={form.avatar_url}
                    alt="avatar"
                    className="w-16 h-16 rounded-full border border-slate-200 object-cover"
                  />
                  <Button variant="outline" onClick={() => setForm((p) => ({ ...p, avatar_url: "" }))}>
                    Remover
                  </Button>
                  <Button variant="outline" onClick={() => window.open(form.avatar_url, "_blank")}>
                    <Eye className="w-4 h-4 mr-2" />
                    Abrir
                  </Button>
                </div>
              ) : null}
              <div className="flex items-center gap-3">
                <Input
                  placeholder="https://…/avatar.png"
                  value={form.avatar_url}
                  onChange={(e) => setForm((p) => ({ ...p, avatar_url: e.target.value }))}
                  className="rounded-xl"
                />
                <Button variant="outline" onClick={() => avatarRef.current?.click()}>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Enviar
                </Button>
                <input
                  ref={avatarRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => uploadAvatar(e.target.files?.[0])}
                />
                {uploading && <span className="text-sm text-slate-500">Enviando…</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seleção de petições + Preview */}
        <div className="space-y-8">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Selecione as petições</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <select
                  className="block w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
                  onChange={(e) => handleAddItem(e.target.value)}
                  value=""
                >
                  <option value="" disabled>
                    — escolher petição —
                  </option>
                  {petitions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  onClick={() => {}}
                  className="rounded-xl"
                  title="Use o seletor ao lado para adicionar"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {form.items.length > 0 ? (
                <div className="space-y-3">
                  {form.items.map((it) => {
                    const pet = petitionMap.get(it.petition_id);
                    if (!pet) return null;
                    return (
                      <div
                        key={it.petition_id}
                        className="p-3 rounded-xl border border-slate-200 bg-white flex items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 truncate">{pet.title}</div>
                          <div className="text-xs text-slate-500 truncate">
                            {pet.slug ? `Slug: ${pet.slug}` : "Sem slug"}
                          </div>
                          <div className="mt-2">
                            <Input
                              value={it.custom_label || ""}
                              onChange={(e) =>
                                setForm((p) => ({
                                  ...p,
                                  items: p.items.map((x) =>
                                    x.petition_id === it.petition_id
                                      ? { ...x, custom_label: e.target.value }
                                      : x
                                  ),
                                }))
                              }
                              placeholder="Texto do botão (opcional)"
                              className="rounded-lg"
                            />
                          </div>
                        </div>
                        <Button variant="outline" onClick={() => handleRemoveItem(it.petition_id)}>
                          Remover
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-slate-500">Nenhuma petição selecionada ainda.</div>
              )}
            </CardContent>
          </Card>

          {/* Preview público */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="mx-auto max-w-md rounded-3xl border border-slate-200 p-6"
                style={{ backgroundColor: "#ffffff" }}
              >
                <div className="flex flex-col items-center text-center" style={{ color: form.header_color }}>
                  {form.avatar_url ? (
                    <img
                      src={form.avatar_url}
                      alt="avatar"
                      className="w-20 h-20 rounded-full border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <h2 className="mt-3 text-xl font-semibold" style={{ color: form.header_color }}>
                    {form.title}
                  </h2>
                  <p className="mt-1 text-sm whitespace-pre-wrap" style={{ color: form.header_color, opacity: 0.85 }}>
                    {form.bio}
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  {form.items.map((it) => {
                    const pet = petitionMap.get(it.petition_id);
                    if (!pet) return null;
                    const label = (it.custom_label || pet.title).trim();
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
                        className="block w-full"
                      >
                        {/* Botão padrão do sistema (outline clean) */}
                        <div
                          className="w-full rounded-xl border px-4 py-3 text-center font-medium transition-colors hover:bg-slate-50"
                          style={{
                            backgroundColor: form.button_bg_color,
                            color: form.button_text_color,
                            borderColor: form.button_border_color,
                          }}
                        >
                          <span>{label}</span>
                          {form.show_counters && pet.goal ? (
                            <span className="ml-2 text-xs" style={{ opacity: 0.7 }}>
                              meta {pet.goal}
                            </span>
                          ) : null}
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
