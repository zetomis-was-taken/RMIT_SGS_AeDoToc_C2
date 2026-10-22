import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"
import { cn } from "@/lib/utils"

// Light-mode badges: SuperHi pill shape (rounded-full), color only for status signals.
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-[11px] font-semibold tracking-[0.04em] uppercase leading-[1.6] whitespace-nowrap transition-all duration-180 [&_svg]:size-3.5",
  {
    variants: {
      variant: {
        default:
          "border-blue-200 bg-gradient-to-r from-[#2727e6] to-[#3b5bf5] text-white shadow-[0_0_10px_rgba(39,39,230,0.22)]",
        electric:
          "border-blue-300/60 bg-[#2727e6] text-white",
        secondary:
          "border-gray-200 bg-gray-100 text-gray-600",
        outline:
          "border-gray-200 bg-white text-gray-500",
        ok:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        danger:
          "border-red-200 bg-red-50 text-red-700",
        destructive:
          "border-red-300 bg-red-100 text-red-800",
        warn:
          "border-amber-200 bg-amber-50 text-amber-700",
        pending:
          "border-blue-200 bg-blue-50 text-blue-700 animate-pulse",
        info:
          "border-cyan-200 bg-cyan-50 text-cyan-700",
        ghost:
          "border-transparent bg-gray-50 text-gray-500",
        link:
          "border-transparent bg-transparent text-[#2727e6] underline",
      },
    },
    defaultVariants: { variant: "outline" },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
