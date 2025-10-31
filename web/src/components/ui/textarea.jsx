import React from "react"
export const Textarea = React.forwardRef(function Textarea({ className="", ...p }, ref){
  return <textarea ref={ref} className={`w-full rounded-md border px-3 py-2 text-sm ${className}`} {...p}/>
})
export default Textarea
