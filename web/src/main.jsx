import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "@/index.css";

import Layout from "@/pages/Layout.jsx";
import Dashboard from "@/pages/Dashboard.jsx";
import PetitionList from "@/pages/PetitionList.jsx";
import CreatePetition from "@/pages/CreatePetition.jsx";
import PetitionDetail from "@/pages/PetitionDetail.jsx";
import PublicPetition from "@/pages/PublicPetition.jsx";

// ⬇️ Novas páginas do Link Hub
import LinkHubManage from "@/pages/LinkHubManage.jsx";
import LinkHubPublic from "@/pages/LinkHubPublic.jsx"; // certifique-se de criar esta página pública

const queryClient = new QueryClient();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/peticoes">
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/Dashboard" replace />} />
            <Route path="/Dashboard" element={<Dashboard />} />
            <Route path="/PetitionList" element={<PetitionList />} />
            <Route path="/CreatePetition" element={<CreatePetition />} />
            <Route path="/PetitionDetail" element={<PetitionDetail />} />
            <Route path="/PublicPetition" element={<PublicPetition />} />

            {/* ⬇️ Link Hub (gerenciador no painel) */}
            <Route path="/LinkHubManage" element={<LinkHubManage />} />

            {/* ⬇️ Link Hub público (ex.: /peticoes/hub/meu-handle) */}
            <Route path="/hub/:handle" element={<LinkHubPublic />} />

            {/* fallback */}
            <Route path="*" element={<Navigate to="/Dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
