import React from "react"
export function Label({ className="", children, ...p }){ return <label className={`text-sm font-medium ${className}`} {...p}>{children}</label> }
export default Label
