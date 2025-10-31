// createpetition-marker-1761011381
import React, { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/api/apiClient";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Save,
  Loader2,
  Image as ImageIcon,
  Link2,
  Palette,
  ShieldCheck,
  Eye,
  Copy,
  Check,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

/* ===== Helpers de UI (padronizam botões/cores) ===== */
const btnPrimary =
  "rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 " +
  "text-white shadow-lg focus:ring-2 focus:ring-blue-300 transition-colors";
const btnSecondary =
  "rounded-xl border border-slate-300 text-slate-700 hover:border-blue-500 hover:text-blue-600 " +
  "bg-white shadow-sm focus:ring-2 focus:ring-blue-200 transition-colors";
const btnGhostDanger =
  "rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 focus:ring-2 focus:ring-red-200 transition-colors";

const normalizeSlug = (v) =>
  (v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function randColor() {
  const palette = [
    "#3B82F6",
    "#6366F1",
    "#8B5CF6",
    "#22C55E",
    "#06B6D4",
    "#F59E0B",
    "#EF4444",
    "#14B8A6",
  ];
  return palette[Math.floor(Math.random() * palette.length)];
}

export default function CreatePetition() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get("id");

  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  // ⬇️ NOVOS refs/estados para LOGO (mantendo o padrão do banner)
  const fileInputLogoRef = useRef(null);
  const dropLogoRef = useRef(null);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    summary: "",
    description: "",
    image_url: "",
    logo_url: "",            // ⬅️ NOVO: campo para logo
    goal: 1000,
    deadline: "",
    status: "draft",
    require_cpf: false,
    require_phone: false,
    primary_color: "#3B82F6",
    terms_text:
      "Ao assinar esta petição, você concorda em compartilhar seus dados conforme nossa política de privacidade.",
  });

  const [errorMsg, setErrorMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  // ⬇️ NOVOS estados para LOGO
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [copiedLogo, setCopiedLogo] = useState(false);

  const { data: existingPetition } = useQuery({
    queryKey: ["petition", editId],
    queryFn: () => (editId ? api.entities.Petition.get(editId) : null),
    enabled: !!editId,
  });

  useEffect(() => {
    if (existingPetition) {
      setFormData((prev) => ({
        ...prev,
        ...existingPetition,
        deadline: existingPetition.deadline || "",
        logo_url: existingPetition.logo_url || "", // ⬅️ garantir preenchimento da logo
      }));
    }
  }, [existingPetition]);

  const createOrUpdate = useMutation({
    mutationFn: async (data) => {
      const payload = {
        title: (data.title || "").trim(),
        slug: normalizeSlug(data.slug || data.title),
        summary: data.summary ?? "",
        description: data.description ?? "",
        image_url: data.image_url ?? "",
        logo_url: data.logo_url ?? "",    // ⬅️ incluir no payload
        goal: Number.isFinite(Number(data.goal)) ? Number(data.goal) : 1,
        deadline: data.deadline || null,
        status: data.status,
        require_cpf: !!data.require_cpf,
        require_phone: !!data.require_phone,
        primary_color: data.primary_color || "#3B82F6",
        terms_text: data.terms_text ?? "",
      };
      if (editId) return api.entities.Petition.update(editId, payload);
      return api.entities.Petition.create(payload);
    },
    onSuccess: () => {
      setErrorMsg("");
      queryClient.invalidateQueries({ queryKey: ["petitions"] });
      navigate(createPageUrl("PetitionList"));
    },
    onError: (err) => {
      console.error("Falha ao salvar petição:", err);
      setErrorMsg(
        err?.response?.data?.message ||
          err?.message ||
          "Não foi possível salvar. Verifique os campos e tente novamente."
      );
    },
  });

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "title" && !editId) next.slug = normalizeSlug(value);
      if (field === "goal") {
        const n = Number(value);
        next.goal = Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
      }
      return next;
    });
  };

  /* ===== Upload & Preview (BANNER) ===== */
  const uploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setErrorMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/peticoes/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Falha no upload (${res.status})`);
      }
      const json = await res.json();
      if (!json?.file_url) throw new Error("Resposta sem file_url");

      const base = window.location.origin.replace(/\/peticoes.*/, "");
      const fullUrl = json.file_url.startsWith("http") ? json.file_url : `${base}${json.file_url}`;
      setFormData((prev) => ({ ...prev, image_url: fullUrl }));
    } catch (e) {
      console.error("Upload falhou:", e);
      setErrorMsg("Falha ao enviar imagem. Use JPG/PNG e tente novamente.");
    } finally {
      setUploading(false);
      try {
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch {}
    }
  };

  const handleFileChange = (e) => uploadFile(e.target.files?.[0]);

  const onDrop = useCallback((ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const f = ev.dataTransfer?.files?.[0];
    if (f) uploadFile(f);
    if (dropRef.current) dropRef.current.classList.remove("ring-2", "ring-blue-500");
  }, []);

  const onDragOver = (ev) => {
    ev.preventDefault();
    if (dropRef.current) dropRef.current.classList.add("ring-2", "ring-blue-500");
  };
  const onDragLeave = () => {
    if (dropRef.current) dropRef.current.classList.remove("ring-2", "ring-blue-500");
  };

  /* ===== Upload & Preview (LOGO) — usa a MESMA API ===== */
  const uploadLogoFile = async (file) => {
    if (!file) return;
    setUploadingLogo(true);
    setErrorMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/peticoes/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Falha no upload (${res.status})`);
      }
      const json = await res.json();
      if (!json?.file_url) throw new Error("Resposta sem file_url");

      const base = window.location.origin.replace(/\/peticoes.*/, "");
      const fullUrl = json.file_url.startsWith("http") ? json.file_url : `${base}${json.file_url}`;
      setFormData((prev) => ({ ...prev, logo_url: fullUrl }));
    } catch (e) {
      console.error("Upload da logo falhou:", e);
      setErrorMsg("Falha ao enviar LOGO. Use PNG/JPG e tente novamente.");
    } finally {
      setUploadingLogo(false);
      try {
        if (fileInputLogoRef.current) fileInputLogoRef.current.value = "";
      } catch {}
    }
  };

  const handleLogoFileChange = (e) => uploadLogoFile(e.target.files?.[0]);

  const onDropLogo = useCallback((ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const f = ev.dataTransfer?.files?.[0];
    if (f) uploadLogoFile(f);
    if (dropLogoRef.current) dropLogoRef.current.classList.remove("ring-2", "ring-blue-500");
  }, []);

  const onDragOverLogo = (ev) => {
    ev.preventDefault();
    if (dropLogoRef.current) dropLogoRef.current.classList.add("ring-2", "ring-blue-500");
  };
  const onDragLeaveLogo = () => {
    if (dropLogoRef.current) dropLogoRef.current.classList.remove("ring-2", "ring-blue-500");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    createOrUpdate.mutate(formData);
  };

  const canPreview = !!(formData.slug || formData.title);

  const copyToClipboard = async (text, which) => {
    try {
      await navigator.clipboard.writeText(text);
      if (which === "slug") {
        setCopiedSlug(true);
        setTimeout(() => setCopiedSlug(false), 1500);
      } else if (which === "image") {
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 1500);
      } else if (which === "logo") {
        setCopiedLogo(true);
        setTimeout(() => setCopiedLogo(false), 1500);
      }
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_40%)]">
      {/* Topbar com leve sombra e fundo translúcido */}
      <div className="sticky top-0 z-20 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={() => navigate(createPageUrl("PetitionList"))}
              className={btnSecondary + " !p-0 w-9 h-9 flex items-center justify-center"}
              title="Voltar"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">
                {editId ? "Editar" : "Nova"} petição
              </div>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900">
                {formData.title?.trim() || (editId ? "Editar Petição" : "Nova Petição")}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canPreview && (
              <Button
                type="button"
                variant="outline"
                className={btnSecondary}
                onClick={() => {
                  const slug = formData.slug || normalizeSlug(formData.title);
                  const base = window.location.origin.replace(/\/peticoes.*/, "");
                  window.open(`${base}/peticoes/p/${slug}`, "_blank");
                }}
                title="Pré-visualizar página pública"
              >
                <Eye className="w-4 h-4 mr-2" />
                Pré-visualizar
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className={btnSecondary}
              onClick={() => handleChange("primary_color", randColor())}
              title="Cor aleatória"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Cor
            </Button>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={createOrUpdate.isPending || (formData.status === "published" && !formData.slug)}
              className={btnPrimary + " px-5"}
              title="Salvar"
            >
              {createOrUpdate.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editId ? "Atualizar" : "Criar"} Petição
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {errorMsg && (
          <Alert variant="destructive">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Básico */}
            <Card className="border-slate-200 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-slate-700">
                    Título da Petição *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    placeholder="Ex: Pela criação de mais áreas verdes na cidade"
                    required
                    className="h-11 rounded-xl"
                  />
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <Link2 className="w-3.5 h-3.5" />
                    <span className="truncate">{`peticoesbr.com/p/${formData.slug || normalizeSlug(formData.title)}`}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 rounded-lg text-slate-600 hover:text-blue-600"
                      onClick={() =>
                        copyToClipboard(
                          `peticoesbr.com/p/${formData.slug || normalizeSlug(formData.title)}`,
                          "slug"
                        )
                      }
                      title="Copiar link"
                    >
                      {copiedSlug ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug" className="text-slate-700">
                    URL Amigável *
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">peticoesbr.com/p/</span>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => handleChange("slug", normalizeSlug(e.target.value))}
                      placeholder="areas-verdes-cidade"
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summary" className="text-slate-700">
                    Resumo Curto
                  </Label>
                  <Input
                    id="summary"
                    value={formData.summary}
                    onChange={(e) => handleChange("summary", e.target.value)}
                    placeholder="Breve descrição que aparece nos cards"
                    maxLength={150}
                    className="h-11 rounded-xl"
                  />
                </div>

                {/* Descrição completa */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-slate-700">
                    Descrição Completa
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    placeholder="Descreva em detalhes o objetivo da petição, os motivos e o impacto esperado..."
                    rows={8}
                    className="rounded-xl"
                  />
                  <p className="text-xs text-slate-500">
                    Este texto será exibido na página pública da petição.
                  </p>
                </div>

                {/* Upload/Preview BANNER */}
                <div className="space-y-3">
                  <Label className="text-slate-700">Imagem Principal (banner)</Label>

                  {formData.image_url ? (
                    <div className="relative">
                      <img
                        src={formData.image_url}
                        alt="Pré-visualização do banner"
                        className="w-full max-h-60 object-cover rounded-2xl border border-slate-200 shadow-sm"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={btnSecondary + " rounded-lg py-1.5"}
                          onClick={() => copyToClipboard(formData.image_url, "image")}
                          title="Copiar URL da imagem"
                        >
                          {copiedImage ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                          Copiar URL
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={btnSecondary + " rounded-lg py-1.5"}
                          onClick={() => window.open(formData.image_url, "_blank")}
                          title="Abrir imagem"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Abrir
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={btnGhostDanger + " rounded-lg py-1.5"}
                          onClick={() => handleChange("image_url", "")}
                          title="Remover imagem"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div
                    ref={dropRef}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    className="rounded-2xl border border-dashed border-slate-300 p-6 md:p-8 text-center bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <div className="text-sm text-slate-700 text-center">
                      <span>Arraste e solte uma imagem aqui,</span>{" "}
                      <span className="hidden md:inline">ou </span>
                      <br className="md:hidden" />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        title="Selecionar arquivo"
                        className={btnPrimary + " inline-flex w-auto h-8 px-3 rounded-lg whitespace-nowrap align-middle"}
                      >
                        clique para enviar
                      </Button>
                    </div>

                    <p className="text-xs text-slate-500 mt-2">
                      JPG/PNG. O arquivo será hospedado e o link preenchido automaticamente.
                    </p>

                    <input
                      ref={fileInputRef}
                      type="file"
                      id="banner_file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    {uploading && (
                      <div className="mt-3 inline-flex items-center text-sm text-slate-600">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => handleChange("image_url", e.target.value)}
                      placeholder="https://exemplo.com/imagem.jpg (ou use o botão Enviar imagem)"
                      className="rounded-xl"
                    />
                  </div>
                </div>

                {/* Upload/Preview LOGO — usa MESMA API */}
                <div className="space-y-3">
                  <Label className="text-slate-700">Logo (quadrado, PNG com transparência recomendado)</Label>

                  {formData.logo_url ? (
                    <div className="relative">
                      <div className="w-32 h-32 rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white">
                        <img
                          src={formData.logo_url}
                          alt="Pré-visualização da logo"
                          className="w-full h-full object-contain p-2"
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={btnSecondary + " rounded-lg py-1.5"}
                          onClick={() => copyToClipboard(formData.logo_url, "logo")}
                          title="Copiar URL da logo"
                        >
                          {copiedLogo ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                          Copiar URL
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={btnSecondary + " rounded-lg py-1.5"}
                          onClick={() => window.open(formData.logo_url, "_blank")}
                          title="Abrir logo"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Abrir
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={btnGhostDanger + " rounded-lg py-1.5"}
                          onClick={() => handleChange("logo_url", "")}
                          title="Remover logo"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div
                    ref={dropLogoRef}
                    onDrop={onDropLogo}
                    onDragOver={onDragOverLogo}
                    onDragLeave={onDragLeaveLogo}
                    className="rounded-2xl border border-dashed border-slate-300 p-6 md:p-8 text-center bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <div className="text-sm text-slate-700 text-center">
                      <span>Arraste e solte a logo aqui,</span>{" "}
                      <span className="hidden md:inline">ou </span>
                      <br className="md:hidden" />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => fileInputLogoRef.current?.click()}
                        title="Selecionar arquivo"
                        className={btnPrimary + " inline-flex w-auto h-8 px-3 rounded-lg whitespace-nowrap align-middle"}
                      >
                        enviar logo
                      </Button>
                    </div>

                    <p className="text-xs text-slate-500 mt-2">
                      PNG/JPG. Ideal 512×512px com fundo transparente.
                    </p>

                    <input
                      ref={fileInputLogoRef}
                      type="file"
                      id="logo_file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoFileChange}
                    />
                    {uploadingLogo && (
                      <div className="mt-3 inline-flex items-center text-sm text-slate-600">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando logo...
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                    <Input
                      id="logo_url"
                      value={formData.logo_url}
                      onChange={(e) => handleChange("logo_url", e.target.value)}
                      placeholder="https://exemplo.com/logo.png (ou use o botão Enviar logo)"
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metas e prazos */}
            <Card className="border-slate-200 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Metas e Prazos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="goal">Meta de Assinaturas *</Label>
                    <Input
                      id="goal"
                      type="number"
                      min="1"
                      value={formData.goal}
                      onChange={(e) => handleChange("goal", e.target.value)}
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deadline">Prazo Final</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={formData.deadline || ""}
                      onChange={(e) => handleChange("deadline", e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <select
                    id="status"
                    className="block w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
                    value={formData.status}
                    onChange={(e) => handleChange("status", e.target.value)}
                  >
                    <option value="draft">Rascunho</option>
                    <option value="published">Publicada</option>
                    <option value="paused">Pausada</option>
                    <option value="closed">Encerrada</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna lateral */}
          <div className="space-y-6">
            <Card className="border-slate-200 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Aparência</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="primary_color" className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-slate-500" />
                    Cor Primária
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="primary_color"
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => handleChange("primary_color", e.target.value)}
                      className="w-20 h-10 rounded-lg"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => handleChange("primary_color", e.target.value)}
                      placeholder="#3B82F6"
                      className="rounded-xl"
                    />
                    <span
                      className="inline-flex h-8 w-8 rounded-full border border-slate-200"
                      style={{ backgroundColor: formData.primary_color }}
                      title={formData.primary_color}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="terms" className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-slate-500" />
                    Texto dos Termos
                  </Label>
                  <Textarea
                    id="terms"
                    value={formData.terms_text}
                    onChange={(e) => handleChange("terms_text", e.target.value)}
                    rows={6}
                    className="rounded-xl"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Coleta de Dados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border px-3 py-3">
                  <div>
                    <Label className="block">Exigir CPF</Label>
                    <p className="text-xs text-slate-500">Tornar o campo CPF obrigatório</p>
                  </div>
                  <Switch
                    checked={!!formData.require_cpf}
                    onCheckedChange={(checked) => handleChange("require_cpf", !!checked)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border px-3 py-3">
                  <div>
                    <Label className="block">Exigir Telefone</Label>
                    <p className="text-xs text-slate-500">Tornar o campo telefone obrigatório</p>
                  </div>
                  <Switch
                    checked={!!formData.require_phone}
                    onCheckedChange={(checked) => handleChange("require_phone", !!checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {formData.status === "published" && !formData.slug && (
              <Alert>
                <AlertDescription>
                  É necessário definir uma URL amigável antes de publicar a petição.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </form>
      </div>

      <h4 style={{ textAlign: "center", color: "#888", fontSize: 12, marginTop: 20 }}>
        ⚙️ Build atualizado às {new Date().toLocaleString()}
      </h4>
    </div>
  );
}
// rebuild-1761009423
// build-force-1761009556
// build-force-1761009871
// build-force-1761011931
// build-force-1761012031
// build-force-1761012152
// build-force-1761012385
// build-force-1761012444
// build-force-1761012480
// build-force-1761051718
// build-force-1761051718
// build-force-1761051718
// build-force-1761051718
// build-force-1761051718
// build-force-1761051718
// build-force-1761051718
// build-force-1761051718
// build-force-1761051718
// build-force-1761051718
// build-force-1761051718
// build-force-1761071107
// build-force-1761071836
// build-force-1761075689
// build-force-1761075790
// build-force-1761076339
// build-force-1761076703
// build-force-1761076808
// build-force-1761076815
// build-force-1761076823
// build-force-1761076916
// build-force-1761076927
// build-force-1761077001
// build-force-1761079213
// build-force-1761079723
// build-force-1761080192
// build-force-1761080457
// build-force-1761080813
// build-force-1761081072
// build-force-1761081522
// build-force-1761081850
// build-force-1761083376
// build-force-1761083534
// build-force-1761083920
// build-force-1761084493
// build-force-1761084934
// build-force-1761085029
// build-force-1761085323
// build-force-1761085940
// build-force-1761085994
// build-force-1761086073
// build-force-1761086825
// build-force-1761087500
// build-force-1761087949
// build-force-1761088057
// build-force-1761137379
// build-force-1761140408
// build-force-1761145924
// build-force-1761146665
// build-force-1761147921
// build-force-1761148089
// build-force-1761148358
// build-force-1761157306
// build-force-1761163148
// build-force-1761163607
// build-force-1761163844
// build-force-1761164177
// build-force-1761164486
// build-force-1761165325
// build-force-1761166334
// build-force-1761166959
// build-force-1761167186
// build-force-1761167406
// build-force-1761169832
// build-force-1761258743
// build-force-1761423907
// build-force-1761423916
