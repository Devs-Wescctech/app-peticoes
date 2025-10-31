// petitionlist-modern-1761079999 (revisado)
// Lista de petições com busca, filtros e paginação (sem cards coloridos) 
import React, { useMemo, useState } from "react";
import { api } from "@/api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Plus,
  Search,
  FileText,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Debounce simples para busca */
function useDebounced(value, delay = 400) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/** Padrões de botão centralizados */
const BTN = {
  primary:
    "rounded-xl bg-slate-900 hover:bg-slate-800 shadow text-white",
  outline:
    "rounded-xl border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors",
  ghost: "rounded-xl",
};

/** Badge de status */
const badgeClass = (status) =>
  (status === "published"
    ? "bg-emerald-100 text-emerald-700"
    : status === "draft"
    ? "bg-slate-100 text-slate-700"
    : status === "paused"
    ? "bg-amber-100 text-amber-700"
    : "bg-rose-100 text-rose-700") +
  " px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap";

/** Barra de progresso (só mostra se houver dados suficientes) */
function Progress({ current = 0, goal = 0 }) {
  if (!goal || goal <= 0) return null;
  const pct = Math.min(100, Math.max(0, Math.round((current / goal) * 100)));
  return (
    <div className="mt-2">
      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-2 bg-slate-900"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-slate-600">
        Progresso: <span className="font-medium">{pct}%</span>
      </div>
    </div>
  );
}

export default function PetitionList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  const debouncedQ = useDebounced(searchTerm, 400);

  const { data: petitions = [], isLoading, isFetching } = useQuery({
    queryKey: ["petitions", { q: debouncedQ, status: statusFilter }],
    queryFn: () =>
      api.entities.Petition.list({
        order: "-created_date",
        q: debouncedQ || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
  });

  /** Contadores por status para mostrar no cabeçalho das abas */
  const counts = useMemo(() => {
    const base = { all: petitions.length, published: 0, draft: 0, paused: 0, closed: 0 };
    for (const p of petitions) {
      if (p.status && base[p.status] !== undefined) base[p.status] += 1;
    }
    return base;
  }, [petitions]);

  /** Paginação client-side */
  const totalItems = petitions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const sliceStart = (pageSafe - 1) * PAGE_SIZE;
  const sliceEnd = sliceStart + PAGE_SIZE;
  const pageItems = petitions.slice(sliceStart, sliceEnd);

  React.useEffect(() => {
    // Sempre que filtros/busca mudarem, volta para página 1
    setPage(1);
  }, [debouncedQ, statusFilter]);

  /** Abrir página pública (corrigido) */
  const openPublicPage = (slug) => {
    if (!slug) return;
    const origin = window.location.origin;              // ex: https://dev.wescctech.com.br
    const publicPath = "/peticoes/PublicPetition";      // caminho público
    const url = `${origin}${publicPath}?slug=${encodeURIComponent(slug)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
              Minhas Petições
            </h1>
            <p className="text-slate-600 mt-1">
              Gerencie todas as suas petições
            </p>
          </div>

          <Link to={createPageUrl("CreatePetition")}>
            <Button className={`${BTN.primary} px-4 h-10`}>
              <Plus className="w-5 h-5 mr-2" />
              Nova Petição
            </Button>
          </Link>
        </div>

        {/* Toolbar: busca + tabs */}
        <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 items-stretch">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Buscar petições..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-white border-slate-200 focus:border-slate-400"
            />
          </div>

          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="h-11 rounded-xl bg-white border border-slate-200">
              <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-slate-100">
                Todas
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {counts.all}
                </span>
              </TabsTrigger>
              <TabsTrigger value="published" className="rounded-lg data-[state=active]:bg-slate-100">
                Publicadas
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {counts.published}
                </span>
              </TabsTrigger>
              <TabsTrigger value="draft" className="rounded-lg data-[state=active]:bg-slate-100">
                Rascunhos
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {counts.draft}
                </span>
              </TabsTrigger>
              <TabsTrigger value="paused" className="rounded-lg data-[state=active]:bg-slate-100">
                Pausadas
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {counts.paused}
                </span>
              </TabsTrigger>
              <TabsTrigger value="closed" className="rounded-lg data-[state=active]:bg-slate-100">
                Encerradas
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {counts.closed}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Lista / Loading / Empty */}
        {isLoading || isFetching ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="h-44 bg-slate-100 animate-pulse" />
                <CardContent className="p-6 space-y-3">
                  <div className="h-6 bg-slate-100 rounded animate-pulse" />
                  <div className="h-4 bg-slate-100 rounded animate-pulse w-2/3" />
                  <div className="h-9 bg-slate-100 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : petitions.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pageItems.map((p) => {
                const deadline = p.deadline
                  ? format(new Date(p.deadline), "dd 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })
                  : null;

                const currentSig =
                  p.current_signatures ??
                  p.signatures_count ??
                  p.signed_count ??
                  0;

                return (
                  <Card
                    key={p.id}
                    className="overflow-hidden hover:shadow-md transition-shadow rounded-2xl border border-slate-200 bg-white"
                  >
                    {p.image_url ? (
                      <div className="h-44 bg-slate-50 overflow-hidden">
                        <img
                          src={p.image_url}
                          alt={p.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="h-2 bg-slate-900" />
                    )}

                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-[17px] text-slate-900 line-clamp-2 flex-1">
                          {p.title}
                        </h3>
                        <span className={badgeClass(p.status)}>
                          {p.status === "published"
                            ? "Publicada"
                            : p.status === "draft"
                            ? "Rascunho"
                            : p.status === "paused"
                            ? "Pausada"
                            : p.status === "closed"
                            ? "Encerrada"
                            : p.status}
                        </span>
                      </div>

                      {p.summary && (
                        <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                          {p.summary}
                        </p>
                      )}

                      {/* Meta, prazo, criado em */}
                      <div className="grid grid-cols-1 gap-1 text-sm text-slate-700">
                        <div>
                          Meta:{" "}
                          <span className="font-semibold">
                            {p.goal ?? 0}
                          </span>{" "}
                          assinaturas
                        </div>
                        {deadline && (
                          <div className="text-slate-600">Prazo: {deadline}</div>
                        )}
                        <div className="text-slate-500">
                          Criada em{" "}
                          {format(new Date(p.created_date), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </div>
                      </div>

                      {/* Progresso */}
                      <Progress current={currentSig} goal={p.goal ?? 0} />

                      {/* Ações */}
                      <div className="flex gap-2 mt-5">
                        <Link
                          to={createPageUrl(`PetitionDetail?id=${p.id}`)}
                          className="flex-1"
                        >
                          <Button
                            variant="outline"
                            className={`${BTN.outline} w-full`}
                          >
                            Ver Detalhes
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>

                        {p.status === "published" && p.slug && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className={BTN.ghost}
                            title="Abrir página pública"
                            onClick={() => openPublicPage(p.slug)} // ⬅️ CORRIGIDO
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Paginação */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Mostrando{" "}
                <span className="font-medium">
                  {Math.min(sliceEnd, totalItems)}
                </span>{" "}
                de <span className="font-medium">{totalItems}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className={BTN.outline}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pageSafe <= 1}
                >
                  Anterior
                </Button>
                <span className="text-sm text-slate-700">
                  Página <span className="font-medium">{pageSafe}</span> de{" "}
                  <span className="font-medium">{totalPages}</span>
                </span>
                <Button
                  variant="outline"
                  className={BTN.outline}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={pageSafe >= totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </>
        ) : (
          <Card className="rounded-2xl border-slate-200">
            <CardContent className="py-16 text-center">
              <FileText className="w-16 h-16 mx-auto text-slate-300 mb-3" />
              <h3 className="text-xl font-semibold text-slate-900 mb-1">
                {searchTerm || statusFilter !== "all"
                  ? "Nenhuma petição encontrada"
                  : "Nenhuma petição criada"}
              </h3>
              <p className="text-slate-600 mb-6">
                {searchTerm || statusFilter !== "all"
                  ? "Tente ajustar seus filtros de busca."
                  : "Comece criando sua primeira petição."}
              </p>

              {!searchTerm && statusFilter === "all" && (
                <Link to={createPageUrl("CreatePetition")}>
                  <Button className={BTN.primary}>
                    <Plus className="w-5 h-5 mr-2" />
                    Criar Primeira Petição
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
