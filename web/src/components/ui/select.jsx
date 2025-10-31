import React from "react"
const Ctx = React.createContext({})
export function Select({ value, onValueChange, children }){ return <Ctx.Provider value={{value,onValueChange}}>{children}</Ctx.Provider> }
export function SelectTrigger({ className="", children, ...p }){ return <div className={`inline-flex items-center rounded-md border px-3 py-2 text-sm ${className}`} {...p}>{children}</div> }
export function SelectValue({ children }){ return <span>{children}</span> }
export function SelectContent({ className="", children }){ return <div className={`mt-2 rounded-md border bg-white p-2 shadow ${className}`}>{children}</div> }
export function SelectItem({ value, children }){
  const { onValueChange } = React.useContext(Ctx)
  return <div role="option" tabIndex={0} onClick={()=>onValueChange?.(value)} className="px-3 py-2 cursor-pointer hover:bg-gray-100 rounded">{children}</div>
}
export default Select
