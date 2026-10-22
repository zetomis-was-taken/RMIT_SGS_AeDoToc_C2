import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"
import { cn } from "@/lib/utils"

// Status without semantic colour: filled black = blocked, outlined = allowed, dashed = pending, flat grey = informational.
const badgeVariants = cva("inline-flex items-center gap-1 rounded-[4px] border px-1.5 py-px text-[12px] font-semibold leading-[1.5] whitespace-nowrap [&_svg]:size-3", {
  variants: {
    variant: {
      default: "border-ink bg-ink text-white",
      secondary: "border-ink bg-ink text-white",
      outline: "border-rule bg-white text-ash",
      ok: "border-ink bg-white text-ink",
      danger: "border-black bg-black text-white",
      destructive: "border-black bg-black text-white",
      warn: "border-dashed border-ink bg-canvas text-ink",
      pending: "border-dashed border-ink bg-canvas text-ink",
      info: "border-transparent bg-canvas text-ash",
      ghost: "border-transparent bg-canvas text-ash",
      link: "border-transparent bg-canvas text-ash",
    },
  },
  defaultVariants: { variant: "outline" },
})

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
