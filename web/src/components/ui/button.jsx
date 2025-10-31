import React from "react"
export function Button({ className="", variant, size, children, ...p }){
  const base="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium"
  const tone= variant==="outline" ? "bg-white text-gray-900 border-gray-300" : "bg-blue-600 text-white border-transparent"
  return <button className={`${base} ${tone} ${className}`} {...p}>{children}</button>
}
export default Button
