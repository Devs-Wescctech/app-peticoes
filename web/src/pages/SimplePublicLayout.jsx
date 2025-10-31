// layouts/SimplePublicLayout.jsx
import React from "react";

export default function SimplePublicLayout({ children }) {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-white">
      {/* se quiser um header minimalista, coloca aqui */}
      {children}
    </div>
  );
}
