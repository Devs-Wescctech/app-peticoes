import React from "react"
const TabsCtx = React.createContext({})
export function Tabs({ value, onValueChange, children }){ return <TabsCtx.Provider value={{value,onValueChange}}>{children}</TabsCtx.Provider> }
export function TabsList({ className="", children }){ return <div className={`inline-flex gap-1 rounded-md border p-1 ${className}`}>{children}</div> }
export function TabsTrigger({ value, children }){
  const { value:cur, onValueChange } = React.useContext(TabsCtx)
  const active = cur===value
  return (
    <button onClick={()=>onValueChange?.(value)} className={`px-3 py-1.5 text-sm rounded ${active?'bg-blue-600 text-white':'bg-white text-gray-700 hover:bg-gray-100'}`}>
      {children}
    </button>
  )
}
export default Tabs
