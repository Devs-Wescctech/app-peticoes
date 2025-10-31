import React from "react"
export function Checkbox({ checked, onCheckedChange, ...p }){
  return <input type="checkbox" checked={!!checked} onChange={e=>onCheckedChange?.(e.target.checked)} {...p}/>
}
export default Checkbox
