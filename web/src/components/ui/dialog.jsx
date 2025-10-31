import React from "react"
export function Dialog({ open, onOpenChange, children }){ return open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={()=>onOpenChange?.(false)}>{children}</div> : null }
export function DialogContent({ className="", children, ...p }){ return <div className={`bg-white rounded-lg shadow-lg max-w-lg w-full p-6 ${className}`} onClick={e=>e.stopPropagation()} {...p}>{children}</div> }
export function DialogHeader({ className="", children }){ return <div className={`mb-4 ${className}`}>{children}</div> }
export function DialogTitle({ className="", children }){ return <h3 className={`text-xl font-semibold ${className}`}>{children}</h3> }
export default Dialog
