import React from "react"
export function Switch({ checked, onCheckedChange }) {
  return (
    <label className="inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only" checked={!!checked} onChange={e=>onCheckedChange?.(e.target.checked)}/>
      <span className={`w-10 h-6 flex items-center rounded-full px-1 transition ${checked?'bg-blue-600':'bg-gray-300'}`}>
        <span className={`bg-white w-4 h-4 rounded-full transform transition ${checked?'translate-x-4':''}`} />
      </span>
    </label>
  )
}
export default Switch
