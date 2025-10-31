// PublicPetition.jsx — Banner + Card Único (KPIs + Form) em glassmorphism
import React, { useMemo, useRef, useState } from "react";
import { api } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Share2,
  CheckCircle,
  Loader2,
  MapPin,
  Calendar,
  ChevronDown,
  Megaphone,     // ⬅ adicionado para o chip do título
  ScrollText,    // ⬅ adicionado para "Sobre esta petição"
  Info           // ⬅ adicionado para chip de meta
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ===========================
   Helpers
   =========================== */
function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
function readableOn(hex = "#3B82F6") {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma < 140 ? "#FFFFFF" : "#0f172a"; // texto branco se cor escura
}

/* ===========================
   Componente
   =========================== */
export default function PublicPetition() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get("slug");
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    cpf: "",
    phone: "",
    city: "",
    state: "",
    terms_accepted: false,
  });
  const [showSuccess, setShowSuccess] = useState(false);

  /* 1) Carrega a petição (com fallback por slug) */
  const {
    data: petition,
    isLoading: loadingPetition,
    isError: errorPetition,
    error: petitionErr,
  } = useQuery({
    queryKey: ["public-petition", slug],
    enabled: !!slug,
    queryFn: async () => {
      try {
        const arr = await api.entities.Petition.filter({
          slug,
          status: "published",
        });
        if (Array.isArray(arr) && arr.length) return arr[0];
      } catch {}
      const list = await api.entities.Petition.list({
        status: "published",
        order: "-created_date",
      });
      return Array.isArray(list) ? list.find((p) => p.slug === slug) : null;
    },
  });

  /* 2) Assinaturas da petição */
  const {
    data: signatures = [],
    isLoading: loadingSignatures,
    isFetching: fetchingSignatures,
  } = useQuery({
    queryKey: ["public-petition-signatures", petition?.id],
    enabled: !!petition?.id,
    queryFn: () => api.entities.Signature.list("-created_date"),
    select: (all) => (all || []).filter((s) => s.petition_id === petition.id),
  });

  const progressPct = useMemo(() => {
    if (!petition) return 0;
    const pct = clamp01((signatures.length || 0) / (petition.goal || 1));
    return Math.round(pct * 100);
  }, [petition, signatures.length]);

  const createSignatureMutation = useMutation({
    mutationFn: async (data) => {
      if (!petition?.id) throw new Error("Petição não carregada.");
      const protocol = `${Math.random()
        .toString(36)
        .substring(2, 5)
        .toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const qp = new URLSearchParams(window.location.search);

      return api.entities.Signature.create({
        ...data,
        petition_id: petition.id,
        protocol,
        terms_accepted_at: new Date().toISOString(),
        utm_source: qp.get("utm_source") || null,
        utm_medium: qp.get("utm_medium") || null,
        utm_campaign: qp.get("utm_campaign") || null,
        verified: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["public-petition-signatures", petition?.id],
      });
      setShowSuccess(true);
      setFormData({
        full_name: "",
        email: "",
        cpf: "",
        phone: "",
        city: "",
        state: "",
        terms_accepted: false,
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!petition) return;
    if (!formData.terms_accepted) return;
    if (!formData.full_name.trim() || !formData.email.trim()) return;
    createSignatureMutation.mutate(formData);
  };

  const handleShare = (platform) => {
    if (!petition) return;
    const url = window.location.href;
    const text = `Assine a petição: ${petition.title}`;
    const shareUrls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        url
      )}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        text
      )}&url=${encodeURIComponent(url)}`,
    };
    window.open(shareUrls[platform], "_blank", "noopener,noreferrer");
  };

  /* Tema */
  const primaryColor = petition?.primary_color || "#3B82F6";
  const onPrimary = readableOn(primaryColor);

  /* Força https no banner para evitar mixed content */
  const bannerUrl = (petition?.image_url || "").replace(/^http:/i, "https:");

  /* Loading */
  if (loadingPetition) {
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="h-[50vh] bg-slate-900 animate-pulse" />
        <div className="max-w-5xl mx-auto px-4 py-10 space-y-4">
          <div className="h-8 w-2/3 bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-slate-800 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  /* 404 amigável */
  if (errorPetition || !petition) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center px-4">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
            Petição não encontrada
          </h1>
          <p className="text-slate-600">
            Esta petição não existe ou não está mais disponível.
          </p>
          {petitionErr?.message && (
            <p className="text-xs text-slate-400 mt-2">{petitionErr.message}</p>
          )}
        </div>
      </div>
    );
  }

  /* Scroll para o card (apenas por UX) */
  const scrollToForm = () => {
    try {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {}
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white relative">
      {/* Tema dinâmico + estilos glass */}
      <style>{`
        .primary-bg { background-color: ${primaryColor}; }
        .primary-text { color: ${primaryColor}; }
        .primary-border { border-color: ${primaryColor}; }
        .glass, .glass-light {
          border-radius: 1rem;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(255,255,255,0.14);
        }
        .glass {
          background: linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.05) 100%);
        }
        .glass-light {
          background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%);
        }
      `}</style>

      {/* HERO — banner ocupa o topo */}
      <section
        className="relative w-full min-h-[70vh] md:min-h-[78vh] flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: bannerUrl
            ? `linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.55)), url("${bannerUrl}")`
            : "radial-gradient(1200px 600px at 50% -10%, #0b1220 0%, #060b16 40%, #04080f 100%)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_55%_at_50%_20%,rgba(99,102,241,0.20),transparent_60%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-slate-950" />

        {/* Título e subtítulo */}
        <div className="relative z-10 w-full max-w-6xl px-4 md:px-8 text-center">
          {/* chip com ícone (apenas título no topo + ícone) */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-4">
            {/* ⬇️ NOVO: mostra a logo ao lado, se existir */}
            {petition.logo_url ? (
              <span className="inline-flex w-6 h-6 rounded-md overflow-hidden bg-white/10 border border-white/20">
                <img src={petition.logo_url} alt="Logo" className="w-full h-full object-cover" />
              </span>
            ) : null}
            <Megaphone className="w-5 h-5 text-white/90" />
            <span className="text-white/90 text-sm">Petição Pública</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.05] drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)]">
            {petition.title}
          </h1>
          {petition.summary && (
            <p className="mt-4 text-lg md:text-2xl text-white/90 max-w-3xl mx-auto">
              {petition.summary}
            </p>
          )}

          {/* chevron clicável */}
          <div className="mt-8 md:mt-10 flex flex-col items-center text-white/70">
            <button
              type="button"
              onClick={scrollToForm}
              aria-label="Ir para o formulário"
              className="rounded-full p-2 hover:bg-white/10 transition-colors"
            >
              <ChevronDown className="w-6 h-6 animate-bounce" />
            </button>
          </div>
        </div>
      </section>

      {/* CARD ÚNICO — KPIs + PROGRESSO + FORM (trazido mais pra cima) */}
      <section ref={formRef} className="relative z-10 -mt-20 md:-mt-28 pb-8">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <Card className="glass shadow-2xl primary-border" style={{ borderColor: `${primaryColor}55` }}>
            <CardContent className="p-6 md:p-10">
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 items-center">
                {/* Assinaturas */}
                <div className="text-center">
                  <div className="mx-auto w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2">
                    <Users className="w-5 h-5 text-white/90" />
                  </div>
                  <div className="text-3xl md:text-4xl font-extrabold">
                    {signatures.length}
                  </div>
                  <div className="text-xs md:text-sm text-white/70">
                    assinaturas
                  </div>
                </div>

                {/* % da meta */}
                <div className="text-center">
                  <div className="mx-auto w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2">
                    <svg
                      className="w-5 h-5 text-white/90"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M4 14l6-6 4 4 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="text-3xl md:text-4xl font-extrabold">
                    {progressPct}%
                  </div>
                  <div className="text-xs md:text-sm text-white/70">da meta</div>
                </div>

                {/* Prazo */}
                <div className="col-span-2 md:col-span-1 text-center md:text-right order-last md:order-none">
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10">
                    <Calendar className="w-4 h-4 text-white/90" />
                    <span className="text-sm font-medium">
                      {petition.deadline
                        ? format(new Date(petition.deadline), "dd/MM/yyyy", {
                            locale: ptBR,
                          })
                        : "Sem prazo"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progresso */}
              <div className="mt-6 space-y-1">
                <div className="flex items-center justify-between text-xs md:text-sm text-white/80">
                  <span>Meta: {petition.goal} assinaturas</span>
                  {petition.deadline && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      até{" "}
                      {format(new Date(petition.deadline), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </span>
                  )}
                </div>
                <div className="w-full h-3 bg-white/15 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${progressPct}%`,
                      background: primaryColor,
                    }}
                  />
                </div>
              </div>

              {/* Formulário */}
              <div className="mt-8">
                <div className="mb-4 text-center">
                  <h3 className="text-2xl md:text-3xl font-bold">
                    Assine esta petição
                  </h3>
                  <p className="text-white/80 mt-1">
                    Sua voz faz a diferença. Assine agora!
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="full_name" className="text-white/90">
                        Nome Completo *
                      </Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            full_name: e.target.value,
                          }))
                        }
                        placeholder="Seu nome completo"
                        required
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white/90">
                        Email *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        placeholder="seu@email.com"
                        required
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>

                    {petition.require_phone && (
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-white/90">
                          Telefone/WhatsApp *
                        </Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              phone: e.target.value,
                            }))
                          }
                          placeholder="(00) 00000-0000"
                          required={petition.require_phone}
                          className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
                        />
                      </div>
                    )}

                    {petition.require_cpf && (
                      <div className="space-y-2">
                        <Label htmlFor="cpf" className="text-white/90">
                          CPF *
                        </Label>
                        <Input
                          id="cpf"
                          value={formData.cpf}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, cpf: e.target.value }))
                          }
                          placeholder="000.000.000-00"
                          required={petition.require_cpf}
                          className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-white/90">
                        Cidade
                      </Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, city: e.target.value }))
                        }
                        placeholder="Sua cidade"
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-white/90">
                        Estado (UF)
                      </Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, state: e.target.value }))
                        }
                        placeholder="SP"
                        maxLength={2}
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg.white/5 border border-white/10"></div>
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                    <Checkbox
                      id="terms"
                      checked={formData.terms_accepted}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          terms_accepted: !!checked,
                        }))
                      }
                      required
                    />
                    <Label
                      htmlFor="terms"
                      className="text-sm text-white/85 leading-relaxed cursor-pointer"
                    >
                      {petition.terms_text}
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full rounded-xl text-base md:text-lg py-5 font-semibold shadow-xl hover:opacity-95"
                    style={{ backgroundColor: primaryColor, color: onPrimary }}
                    disabled={
                      createSignatureMutation.isPending ||
                      !formData.terms_accepted ||
                      !petition
                    }
                  >
                    {createSignatureMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Assinar Esta Petição
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Sobre */}
      {petition.description?.trim() ? (
        <section className="relative z-10 pb-4">
          <div className="max-w-5xl mx-auto px-4 md:px-8">
            <Card
              className="glass-light shadow-2xl primary-border"
              style={{ borderColor: `${primaryColor}55` }}
            >
              <CardContent className="p-6 md:p-10">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${primaryColor}22`, color: primaryColor }}
                  >
                    <ScrollText className="w-5 h-5" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold">
                    Sobre esta petição
                  </h3>
                </div>

                <div className="prose prose-invert prose-lg max-w-none text-white/90 whitespace-pre-wrap">
                  {petition.description}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
                  {petition.deadline && (
                    <span
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full border"
                      style={{ borderColor: `${primaryColor}66`, color: primaryColor, backgroundColor: `${primaryColor}14` }}
                    >
                      <Calendar className="w-4 h-4" />
                      Prazo: {format(new Date(petition.deadline), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  )}
                  <span
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full border"
                    style={{ borderColor: `${primaryColor}66`, color: primaryColor, backgroundColor: `${primaryColor}14` }}
                  >
                    <Info className="w-4 h-4" />
                    Meta: {petition.goal} assinaturas
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}

      {/* Compartilhar */}
      <section className="relative z-10 pb-10">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <Card
            className="glass-light shadow-2xl primary-border"
            style={{ borderColor: `${primaryColor}55` }}
          >
            <CardContent className="p-6 md:p-10 text-center">
              <Share2 className="w-12 h-12 mx-auto text-white/90 mb-4" />
              <h3 className="text-2xl md:text-3xl font-bold mb-2">
                Compartilhe esta causa
              </h3>
              <p className="text-white/80 mb-6">
                Quanto mais pessoas assinarem, maior será nosso impacto!
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  onClick={() => handleShare("whatsapp")}
                  className="rounded-xl px-5 py-5 bg-green-600 hover:bg-green-700 text-white"
                >
                  WhatsApp
                </Button>
                <Button
                  onClick={() => handleShare("facebook")}
                  className="rounded-xl px-5 py-5 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Facebook
                </Button>
                <Button
                  onClick={() => handleShare("twitter")}
                  className="rounded-xl px-5 py-5 bg-sky-500 hover:bg-sky-600 text-white"
                >
                  Twitter/X
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Assinaturas recentes — REMOVIDO conforme solicitado */}

      {/* Modal de sucesso */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: primaryColor, color: onPrimary }}
            >
              <CheckCircle className="w-10 h-10" />
            </div>
            <DialogTitle className="text-center text-2xl">
              Assinatura confirmada!
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <p className="text-slate-600">
              Obrigado por assinar esta petição. Sua voz foi ouvida!
            </p>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">
                Compartilhe com seus amigos:
              </p>
              <div className="flex justify-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    handleShare("whatsapp");
                    setShowSuccess(false);
                  }}
                >
                  WhatsApp
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    handleShare("facebook");
                    setShowSuccess(false);
                  }}
                >
                  Facebook
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    handleShare("twitter");
                    setShowSuccess(false);
                  }}
                >
                  Twitter/X
                </Button>
              </div>
            </div>
            <Button onClick={() => setShowSuccess(false)} variant="outline" className="w-full">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
