import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"
import { cn } from "@/lib/utils"

// Pill tag (50px). Status is carried by colour AND an icon/word at the call site, never colour alone.
const badgeVariants = cva("inline-flex items-center gap-1 rounded-[50px] border px-2 py-px text-[12px] font-medium leading-[1.5] whitespace-nowrap [&_svg]:size-3", {
  variants: {
    variant: {
      default: "border-iris bg-iris text-white",
      secondary: "border-iris bg-iris text-white",
      outline: "border-line bg-white text-soft",
      ok: "border-ok/30 bg-ok-bg text-ok",
      danger: "border-danger/30 bg-danger-bg text-danger",
      destructive: "border-danger/30 bg-danger-bg text-danger",
      warn: "border-warn/30 bg-warn-bg text-warn",
      pending: "border-warn/30 bg-warn-bg text-warn",
      info: "border-iris/25 bg-iris-100 text-iris",
      ghost: "border-line bg-white text-soft",
      link: "border-line bg-white text-soft",
    },
  },
  defaultVariants: { variant: "outline" },
})

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
