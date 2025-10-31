import React from "react"
export const Input = React.forwardRef(function Input({ className="", ...p }, ref){
  return <input ref={ref} className={`w-full rounded-md border px-3 py-2 text-sm ${className}`} {...p}/>
})
export default Input
