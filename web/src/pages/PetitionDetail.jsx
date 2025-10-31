import React, { useState } from "react";
import { api } from "@/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Users,
  TrendingUp,
  Download,
  Edit,
  ExternalLink,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Copy,
  Check,
  Image as ImageIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function PetitionDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const petitionId = urlParams.get("id");

  const { data: petitions = [] } = useQuery({
    queryKey: ["petitions"],
    queryFn: () => api.entities.Petition.list(),
  });

  const { data: signatures = [] } = useQuery({
    queryKey: ["signatures"],
    queryFn: () => api.entities.Signature.list("-created_date"),
  });

  const petition = petitions.find((p) => p.id === petitionId);
  const petitionSignatures = signatures.filter((s) => s.petition_id === petitionId);

  const [copied, setCopied] = useState(false);

  const exportToCSV = () => {
    if (petitionSignatures.length === 0) return;

    const headers = [
      "Nome Completo",
      "Email",
      "CPF",
      "Telefone",
      "Cidade",
      "Estado",
      "Data/Hora",
      "Origem",
    ];
    const rows = petitionSignatures.map((sig) => [
      sig.full_name,
      sig.email,
      sig.cpf || "",
      sig.phone || "",
      sig.city || "",
      sig.state || "",
      format(new Date(sig.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      sig.utm_source || "Direto",
    ]);

    const csvContent = [headers.join(";"), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";"))].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `assinaturas-${petition?.slug || petitionId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!petition) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-8 text-center">
        <p className="text-slate-600">Petição não encontrada</p>
        <Button
          onClick={() => navigate(createPageUrl("PetitionList"))}
          className="mt-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white"
        >
          Voltar para Lista
        </Button>
      </div>
    );
  }

  const progress = petition.goal > 0 ? (petitionSignatures.length / petition.goal) * 100 : 0;

  const getSignaturesByDay = () => {
    const groupedByDay = {};
    petitionSignatures.forEach((sig) => {
      const day = format(new Date(sig.created_date), "dd/MM", { locale: ptBR });
      groupedByDay[day] = (groupedByDay[day] || 0) + 1;
    });
    return Object.entries(groupedByDay).map(([day, assinaturas]) => ({ day, assinaturas }));
  };

  const getSignaturesByState = () => {
    const groupedByState = {};
    petitionSignatures.forEach((sig) => {
      const state = sig.state || "Não informado";
      groupedByState[state] = (groupedByState[state] || 0) + 1;
    });
    return Object.entries(groupedByState)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const getSignaturesBySource = () => {
    const groupedBySource = {};
    petitionSignatures.forEach((sig) => {
      const source = sig.utm_source || "Direto";
      groupedBySource[source] = (groupedBySource[source] || 0) + 1;
    });
    return Object.entries(groupedBySource).map(([name, value]) => ({ name, value }));
  };

  const COLORS = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981"];

  /** 🔗 Monta URL ABSOLUTA da página pública (fora do router do dashboard) */
  const publicUrl = petition.slug
    ? `${window.location.origin}/peticoes/PublicPetition?slug=${encodeURIComponent(petition.slug)}`
    : null;

  const copyPublicUrl = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1300);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Topbar */}
      <div className="mx-auto max-w-7xl px-4 pt-8 pb-2">
        <div className="flex items-start md:items-center justify-between gap-4 flex-col md:flex-row">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(createPageUrl("PetitionList"))}
              className="rounded-xl border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900"
              title="Voltar"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Detalhes</div>
              <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">{petition.title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {petition.slug && (
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                    slug: {petition.slug}
                  </span>
                )}
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    petition.status === "published"
                      ? "bg-emerald-100 text-emerald-700"
                      : petition.status === "draft"
                      ? "bg-slate-100 text-slate-700"
                      : petition.status === "paused"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {petition.status === "published"
                    ? "Publicada"
                    : petition.status === "draft"
                    ? "Rascunho"
                    : petition.status === "paused"
                    ? "Pausada"
                    : "Encerrada"}
                </span>
                {petition.deadline && (
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                    até {format(new Date(petition.deadline), "dd/MM/yyyy")}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl(`CreatePetition?id=${petition.id}`))}
              className="rounded-xl border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900"
              title="Editar"
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>

            {petition.status === "published" && publicUrl && (
              <>
                <Button
                  variant="outline"
                  onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")}
                  className="rounded-xl border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900"
                  title="Ver página pública"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver Página Pública
                </Button>

                <Button
                  variant="outline"
                  onClick={copyPublicUrl}
                  className="rounded-xl border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900"
                  title="Copiar link público"
                >
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  Copiar link público
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-10 space-y-8">
        {/* Capa / Thumb + infos rápidas */}
        <Card className="rounded-2xl border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="flex flex-col md:flex-row gap-5 items-start">
              <div className="w-full md:w-80 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                {petition.image_url ? (
                  <img
                    src={petition.image_url}
                    alt={petition.title}
                    className="w-full h-48 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-48 flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                )}
              </div>
              <div className="flex-1 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs text-slate-500">Criada em</div>
                  <div className="text-slate-900 font-medium">
                    {format(new Date(petition.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs text-slate-500">Meta</div>
                  <div className="text-slate-900 font-medium">{petition.goal} assinaturas</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs text-slate-500">Assinaturas</div>
                  <div className="text-slate-900 font-medium">{petitionSignatures.length}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs text-slate-500">Progresso</div>
                  <div className="text-slate-900 font-medium">{Math.round(progress)}%</div>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-2 bg-slate-900"
                      style={{ width: `${Math.min(100, Math.max(0, Math.round(progress)))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards coloridos (sem linha) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total de Assinaturas */}
          <Card className="relative overflow-hidden border-0 rounded-2xl shadow-xl transition-transform hover:-translate-y-0.5">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600" />
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <CardContent className="relative p-5 text-white">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium opacity-95">Total de Assinaturas</span>
                <Users className="w-5 h-5 opacity-90" />
              </div>
              <div className="text-4xl font-extrabold leading-none">{petitionSignatures.length}</div>
              <p className="text-xs opacity-95 mt-2">de {petition.goal} meta</p>
            </CardContent>
          </Card>

          {/* Progresso */}
          <Card className="relative overflow-hidden border-0 rounded-2xl shadow-xl transition-transform hover:-translate-y-0.5">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600" />
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <CardContent className="relative p-5 text-white">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium opacity-95">Progresso</span>
                <TrendingUp className="w-5 h-5 opacity-90" />
              </div>
              <div className="text-4xl font-extrabold leading-none">{Math.round(progress)}%</div>
              <p className="text-xs opacity-95 mt-2">da meta atingida</p>
            </CardContent>
          </Card>

          {/* Hoje */}
          <Card className="relative overflow-hidden border-0 rounded-2xl shadow-xl transition-transform hover:-translate-y-0.5">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-600" />
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <CardContent className="relative p-5 text-white">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium opacity-95">Hoje</span>
                <Calendar className="w-5 h-5 opacity-90" />
              </div>
              <div className="text-4xl font-extrabold leading-none">
                {
                  petitionSignatures.filter((s) => {
                    const today = new Date().toDateString();
                    return new Date(s.created_date).toDateString() === today;
                  }).length
                }
              </div>
              <p className="text-xs opacity-95 mt-2">novas assinaturas</p>
            </CardContent>
          </Card>

          {/* Status */}
          <Card className="relative overflow-hidden border-0 rounded-2xl shadow-xl transition-transform hover:-translate-y-0.5">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600" />
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <CardContent className="relative p-5 text-white">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium opacity-95">Status</span>
              </div>
              <div className="text-3xl font-extrabold leading-none">
                {petition.status === "published"
                  ? "Ativa"
                  : petition.status === "draft"
                  ? "Rascunho"
                  : petition.status === "paused"
                  ? "Pausada"
                  : "Encerrada"}
              </div>
              {petition.deadline && (
                <p className="text-xs opacity-95 mt-2">até {format(new Date(petition.deadline), "dd/MM/yyyy")}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="rounded-2xl border-0 shadow-lg">
            <CardContent className="p-5">
              <div className="text-lg font-semibold text-slate-900">Assinaturas ao Longo do Tempo</div>
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getSignaturesByDay()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                    <XAxis dataKey="day" stroke="#8b99a5" />
                    <YAxis stroke="#8b99a5" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "10px",
                        boxShadow: "0 10px 30px rgba(2,6,23,.08)",
                      }}
                    />
                    <Bar dataKey="assinaturas" fill="#6366F1" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-lg">
            <CardContent className="p-5">
              <div className="text-lg font-semibold text-slate-900">Origem das Assinaturas</div>
              <div className="mt-2">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getSignaturesBySource()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={105}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getSignaturesBySource().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "10px",
                        boxShadow: "0 10px 30px rgba(2,6,23,.08)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top estados */}
        <Card className="rounded-2xl border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="text-lg font-semibold text-slate-900 mb-4">Top 5 Estados</div>
            <div className="space-y-4">
              {getSignaturesByState().map((item, index) => (
                <div key={item.state} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-800">{item.state}</span>
                      <span className="text-sm text-slate-600">{item.count} assinaturas</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${(item.count / petitionSignatures.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Assinaturas recentes + export */}
        <Card className="rounded-2xl border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold text-slate-900">Assinaturas Recentes</div>
              <Button
                onClick={exportToCSV}
                variant="outline"
                disabled={petitionSignatures.length === 0}
                className="rounded-xl border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900"
                title="Exportar CSV"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>

            {petitionSignatures.length > 0 ? (
              <div className="space-y-3">
                {petitionSignatures.slice(0, 10).map((signature) => (
                  <div
                    key={signature.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900">{signature.full_name}</h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 mt-1">
                          {signature.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {signature.email}
                            </span>
                          )}
                          {signature.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {signature.phone}
                            </span>
                          )}
                          {(signature.city || signature.state) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {[signature.city, signature.state].filter(Boolean).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm text-slate-500 whitespace-nowrap">
                        {format(new Date(signature.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500">Nenhuma assinatura ainda</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
