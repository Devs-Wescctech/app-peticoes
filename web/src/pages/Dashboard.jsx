import React, { useMemo } from "react";
import { api } from "@/api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  FileText,
  Users,
  TrendingUp,
  CheckCircle,
  Plus,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Helpers */
const fmt = new Intl.NumberFormat("pt-BR");
const clampPct = (n) =>
  Number.isFinite(n) ? Math.max(-999, Math.min(999, Math.round(n))) : 0;

export default function Dashboard() {
  const {
    data: petitions = [],
    isLoading: loadingPetitions,
    isFetching: fetchingPetitions,
    error: petitionsError,
  } = useQuery({
    queryKey: ["petitions"],
    queryFn: () => api.entities.Petition.list("-created_date"),
  });

  const {
    data: signatures = [],
    isLoading: loadingSignatures,
    isFetching: fetchingSignatures,
    error: signaturesError,
  } = useQuery({
    queryKey: ["signatures"],
    queryFn: () => api.entities.Signature.list("-created_date"),
  });

  /** Métricas principais (memo p/ evitar recálculos) */
  const stats = useMemo(() => {
    const totalPetitions = petitions.length;
    const activePetitions = petitions.filter(
      (p) => p.status === "published"
    ).length;
    const totalSignatures = signatures.length;

    const todayStr = startOfDay(new Date()).toDateString();
    const signaturesToday = signatures.filter(
      (s) => startOfDay(new Date(s.created_date)).toDateString() === todayStr
    ).length;

    return {
      totalPetitions,
      activePetitions,
      totalSignatures,
      signaturesToday,
    };
  }, [petitions, signatures]);

  /** Série de 7 dias e comparação com 7 dias anteriores */
  const { chartData, change7dPct } = useMemo(() => {
    // últimos 7 dias (D-6 ... D0)
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(startOfDay(new Date()), 6 - i);
      const dateStr = date.toDateString();
      const count = signatures.filter(
        (s) => startOfDay(new Date(s.created_date)).toDateString() === dateStr
      ).length;
      return {
        date,
        label: format(date, "dd/MM", { locale: ptBR }),
        assinaturas: count,
      };
    });

    // 7 dias anteriores (D-13 ... D-7)
    const prev7 = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(startOfDay(new Date()), 13 - i);
      const dateStr = date.toDateString();
      const count = signatures.filter(
        (s) => startOfDay(new Date(s.created_date)).toDateString() === dateStr
      ).length;
      return { date, assinaturas: count };
    });

    const sum = (arr) => arr.reduce((acc, d) => acc + (d.assinaturas || 0), 0);
    const last7Sum = sum(last7);
    const prev7Sum = sum(prev7);
    const change =
      prev7Sum > 0 ? ((last7Sum - prev7Sum) / prev7Sum) * 100 : last7Sum > 0 ? 100 : 0;

    return {
      chartData: last7.map((d) => ({ date: d.label, assinaturas: d.assinaturas })),
      change7dPct: clampPct(change),
    };
  }, [signatures]);

  /** Petições recentes (robustas à falta de created_date) */
  const recentPetitions = useMemo(() => {
    const safe = [...petitions].sort((a, b) => {
      const da = a?.created_date ? new Date(a.created_date).getTime() : 0;
      const db = b?.created_date ? new Date(b.created_date).getTime() : 0;
      return db - da;
    });
    return safe.slice(0, 3);
  }, [petitions]);

  const anyLoading =
    loadingPetitions || loadingSignatures || fetchingPetitions || fetchingSignatures;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Topbar espaçado + CTA consistente */}
      <div className="mx-auto max-w-7xl px-4 pt-8 pb-2">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500">
              Visão geral
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
              Dashboard
            </h1>
            <p className="text-slate-600 mt-2">Visão geral das suas petições</p>
          </div>
          <Link to={createPageUrl("CreatePetition")}>
            <Button className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg px-4">
              <Plus className="w-5 h-5 mr-2" />
              Nova Petição
            </Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-10 space-y-8">
        {/* Cards coloridos modernos (mantidos) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total de Petições */}
          <Card className="relative overflow-hidden border-0 rounded-2xl shadow-xl transition-transform hover:-translate-y-0.5">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600" />
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <CardContent className="relative p-5 text-white">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium opacity-95">
                  Total de Petições
                </span>
                <FileText className="w-5 h-5 opacity-90" />
              </div>
              <div className="text-4xl font-extrabold leading-none">
                {anyLoading ? "—" : fmt.format(stats.totalPetitions)}
              </div>
              <p className="text-xs opacity-95 mt-2">Todas as petições</p>
            </CardContent>
          </Card>

          {/* Ativas */}
          <Card className="relative overflow-hidden border-0 rounded-2xl shadow-xl transition-transform hover:-translate-y-0.5">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-600" />
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <CardContent className="relative p-5 text-white">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium opacity-95">Ativas</span>
                <CheckCircle className="w-5 h-5 opacity-90" />
              </div>
              <div className="text-4xl font-extrabold leading-none">
                {anyLoading ? "—" : fmt.format(stats.activePetitions)}
              </div>
              <p className="text-xs opacity-95 mt-2">Publicadas agora</p>
            </CardContent>
          </Card>

          {/* Total de Assinaturas */}
          <Card className="relative overflow-hidden border-0 rounded-2xl shadow-xl transition-transform hover:-translate-y-0.5">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600" />
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <CardContent className="relative p-5 text-white">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium opacity-95">
                  Total de Assinaturas
                </span>
                <Users className="w-5 h-5 opacity-90" />
              </div>
              <div className="text-4xl font-extrabold leading-none">
                {anyLoading ? "—" : fmt.format(stats.totalSignatures)}
              </div>
              <p className="text-xs opacity-95 mt-2">Todas as assinaturas</p>
            </CardContent>
          </Card>

          {/* Hoje */}
          <Card className="relative overflow-hidden border-0 rounded-2xl shadow-xl transition-transform hover:-translate-y-0.5">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600" />
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <CardContent className="relative p-5 text-white">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium opacity-95">Hoje</span>
                <TrendingUp className="w-5 h-5 opacity-90" />
              </div>
              <div className="text-4xl font-extrabold leading-none">
                {anyLoading ? "—" : fmt.format(stats.signaturesToday)}
              </div>
              <p className="text-xs opacity-95 mt-2">Novas assinaturas</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico em card moderno (mantido) + comparativo 7d */}
        <Card className="rounded-2xl border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500">
                  Métricas
                </div>
                <div className="text-lg font-semibold text-slate-900">
                  Assinaturas nos Últimos 7 Dias
                </div>
                {!anyLoading && (
                  <div
                    className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                      change7dPct >= 0
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {change7dPct >= 0 ? "▲" : "▼"} {Math.abs(change7dPct)}% vs. 7 dias anteriores
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4">
              {anyLoading ? (
                <div className="h-[300px] rounded-xl bg-slate-100 animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                    <XAxis dataKey="date" stroke="#8b99a5" />
                    <YAxis stroke="#8b99a5" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "10px",
                        boxShadow: "0 10px 30px rgba(2,6,23,.08)",
                      }}
                      formatter={(value) => [fmt.format(value), "Assinaturas"]}
                      labelFormatter={(label) => `Dia ${label}`}
                    />
                    <Bar dataKey="assinaturas" fill="#6366F1" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recentes com visual clean e botão padrão (mantido) + placeholders de loading + tratamento de erro */}
        <Card className="rounded-2xl border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500">
                  Atalhos
                </div>
                <div className="text-lg font-semibold text-slate-900">
                  Petições Recentes
                </div>
              </div>
              <Link to={createPageUrl("PetitionList")}>
                <Button variant="ghost" size="sm" className="rounded-lg">
                  Ver todas <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Erros de carregamento visíveis mas discretos */}
            {(petitionsError || signaturesError) && (
              <div className="mb-4 text-sm text-red-600">
                {petitionsError ? "Falha ao carregar petições. " : ""}
                {signaturesError ? "Falha ao carregar assinaturas." : ""}
              </div>
            )}

            {anyLoading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-slate-200 bg-white"
                  >
                    <div className="h-4 bg-slate-100 rounded w-1/2 animate-pulse" />
                    <div className="h-4 bg-slate-100 rounded w-3/4 mt-3 animate-pulse" />
                    <div className="h-4 bg-slate-100 rounded w-1/3 mt-3 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : recentPetitions.length > 0 ? (
              <div className="space-y-4">
                {recentPetitions.map((petition) => {
                  const petitionSignatures = signatures.filter(
                    (s) => s.petition_id === petition.id
                  );
                  const progress =
                    petition.goal > 0
                      ? Math.round((petitionSignatures.length / petition.goal) * 100)
                      : 0;

                  return (
                    <Link
                      key={petition.id}
                      to={createPageUrl(`PetitionDetail?id=${petition.id}`)}
                      className="block group"
                    >
                      <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-500/60 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 mb-1 truncate">
                              {petition.title}
                            </h3>
                            {petition.summary ? (
                              <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                                {petition.summary}
                              </p>
                            ) : null}
                            <div className="flex items-center gap-4 text-sm">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  petition.status === "published"
                                    ? "bg-green-100 text-green-700"
                                    : petition.status === "draft"
                                    ? "bg-gray-100 text-gray-700"
                                    : petition.status === "paused"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
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
                              <span className="text-slate-600">
                                {fmt.format(petitionSignatures.length)} /{" "}
                                {fmt.format(petition.goal || 0)} assinaturas
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">
                              {fmt.format(progress)}%
                            </div>
                            <div className="text-xs text-slate-500">progresso</div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-600 mb-4">Nenhuma petição criada ainda</p>
                <Link to={createPageUrl("CreatePetition")}>
                  <Button className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeira Petição
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
