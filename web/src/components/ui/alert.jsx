import React from "react"
export function Alert({ className="", children }){ return <div className={`rounded-md border border-yellow-300 bg-yellow-50 p-4 ${className}`}>{children}</div> }
export function AlertDescription({ children }){ return <div className="text-sm text-yellow-800">{children}</div> }
export default Alert
