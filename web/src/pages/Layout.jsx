import React from "react";
import { Link as RouterLink, useLocation, Outlet } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  FileText,
  LayoutDashboard,
  Plus,
  FileSignature,
  LogOut,
  Link2 as HubIcon, // ⬅️ ícone do Link Hub
} from "lucide-react";
import { api } from "@/api/apiClient";

const navigationItems = [
  { title: "Dashboard",       url: createPageUrl("Dashboard"),       icon: LayoutDashboard },
  { title: "Minhas Petições", url: createPageUrl("PetitionList"),    icon: FileText },
  { title: "Nova Petição",    url: createPageUrl("CreatePetition"),  icon: Plus },
  { title: "Link Hub",        url: createPageUrl("LinkHubManage"),   icon: HubIcon }, // ⬅️ novo item
];

export default function Layout() {
  const location = useLocation();
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    api.auth?.me().then(setUser).catch(() => {});
  }, []);

  const handleLogout = () => api.auth.logout();
  const isActive = (url) =>
    location.pathname === url || location.pathname === url + "/";

  // 🔎 Rotas públicas (sem sidebar): PublicPetition e Link Hub público (/hub/:handle)
  const isPublicPetition =
    /PublicPetition/i.test(location.pathname) ||
    location.pathname.includes("PublicPetition");

  const isPublicLinkHub =
    /\/hub\//i.test(location.pathname); // qualquer coisa que contenha /hub/ (ex.: /peticoes/hub/meu-handle)

  if (isPublicPetition || isPublicLinkHub) {
    return (
      <main className="min-h-screen w-full overflow-x-hidden bg-slate-950">
        <Outlet />
      </main>
    );
  }

  // 🧭 Layout padrão (com sidebar)
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-blue-50 flex">
      {/* Sidebar */}
      <aside className="w-72 min-h-screen border-r border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 h-screen flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileSignature className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">PetiçõesBR</h2>
              <p className="text-xs text-gray-500">Sistema de Petições</p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <div className="p-3">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
            Menu
          </div>

          <nav className="space-y-1">
            {navigationItems.map((item) => {
              const active = isActive(item.url);
              return (
                <RouterLink
                  key={item.title}
                  to={item.url}
                  className={[
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-blue-50 hover:text-blue-700 text-gray-700",
                  ].join(" ")}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.title}</span>
                </RouterLink>
              );
            })}
          </nav>
        </div>

        {/* Footer / usuário */}
        <div className="mt-auto border-t border-gray-200 p-4">
          {user && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user.full_name?.[0]?.toUpperCase() || "U"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {user.full_name || "Usuário"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 overflow-x-hidden">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
