import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"
import { cn } from "@/lib/utils"

// Pill tag: iris fill, white text, 50px radius. "outline" inverts it so denials read differently without a third colour.
const badgeVariants = cva("inline-flex items-center gap-1 rounded-[50px] border-[1.5px] border-iris px-2 py-0.5 text-[13px] font-medium leading-[1.46] whitespace-nowrap", {
  variants: {
    variant: {
      default: "bg-iris text-white",
      secondary: "bg-iris text-white",
      outline: "bg-white text-iris",
      destructive: "bg-white text-iris line-through decoration-1",
      pending: "bg-white text-iris border-dashed",
      ghost: "bg-white text-iris",
      link: "bg-white text-iris",
    },
  },
  defaultVariants: { variant: "default" },
})

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
