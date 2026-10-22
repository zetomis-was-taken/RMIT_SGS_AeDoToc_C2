import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// The design system has ONE button: white fill, 1.5px iris border, 16px radius. No filled variant.
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[16px] border-[1.5px] border-iris bg-white font-medium text-iris whitespace-nowrap outline-none select-none focus-visible:underline disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: { default: "", outline: "", ghost: "", secondary: "", destructive: "", link: "" },
      size: { default: "px-4 py-2 text-[14px]", sm: "px-3 py-1 text-[13px]", lg: "px-8 py-4 text-[16px]", xs: "px-2 py-0.5 text-[13px]", icon: "size-9", "icon-sm": "size-7", "icon-xs": "size-6", "icon-lg": "size-11" },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({ className, variant = "default", size = "default", ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
