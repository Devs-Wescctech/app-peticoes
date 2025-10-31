import React from "react"
export function Card({ className="", children, ...p }){ return <div className={`rounded-lg border ${className}`} {...p}>{children}</div> }
export function CardHeader({ className="", children, ...p }){ return <div className={`p-4 border-b ${className}`} {...p}>{children}</div> }
export function CardTitle({ className="", children, ...p }){ return <h3 className={`text-lg font-semibold ${className}`} {...p}>{children}</h3> }
export function CardContent({ className="", children, ...p }){ return <div className={`p-4 ${className}`} {...p}>{children}</div> }
export default Card
