import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// DESIGN_2: filled charcoal (8px), white inverse (8px), compact 4px. Hover lift is the only shadow in the system.
// "destructive" = a deliberately risky demo action: dashed outline, never a warning colour.
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 border font-semibold whitespace-nowrap outline-none select-none transition-[box-shadow,background-color,color] duration-150 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-ink bg-ink text-white hover:shadow-lift",
        outline: "border-ink bg-white text-graphite hover:shadow-lift",
        secondary: "border-ink bg-white text-graphite hover:shadow-lift",
        destructive: "border-dashed border-ink bg-canvas text-ink hover:bg-white hover:shadow-lift",
        ghost: "border-transparent bg-transparent text-ink hover:bg-black/5",
        link: "border-transparent bg-transparent text-ink underline underline-offset-4",
        inverse: "border-white bg-white text-graphite hover:shadow-lift",
      },
      size: {
        default: "rounded-[8px] px-4 py-2 text-[14px] tracking-[-0.02em]",
        sm: "rounded-[4px] px-3 py-1.5 text-[13px]",
        lg: "rounded-[8px] px-6 py-3 text-[16px] tracking-[-0.04em]",
        xs: "rounded-[4px] px-2 py-0.5 text-[12px]",
        icon: "size-9 rounded-[8px]", "icon-sm": "size-7 rounded-[4px]", "icon-xs": "size-6 rounded-[4px]", "icon-lg": "size-11 rounded-[8px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({ className, variant = "default", size = "default", ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
