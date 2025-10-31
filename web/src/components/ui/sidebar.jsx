import { NavLink } from "react-router-dom";

const items = [
  { to: "/Dashboard", label: "Dashboard", icon: "📊" },
  { to: "/PetitionList", label: "Minhas Petições", icon: "📄" },
  { to: "/CreatePetition", label: "Nova Petição", icon: "➕" },
];

export default function Sidebar() {
  const base = "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition";
  const active = "bg-slate-900 text-white shadow-sm hover:bg-slate-900";
  const inactive = "text-slate-600 hover:bg-slate-100";

  return (
    <nav className="p-3">
      <div className="mb-3 px-2">
        <div className="text-lg font-semibold text-slate-900">PetiçõesBR</div>
        <div className="text-xs text-slate-500">Sistema de Petições</div>
      </div>

      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.to}>
            <NavLink
              to={it.to}
              className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
              end
            >
              <span aria-hidden>{it.icon}</span>
              <span>{it.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
