import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// default = filled iris (the one primary action per context); outline = iris border; destructive = danger outline.
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] border-[1.5px] font-medium whitespace-nowrap outline-none select-none transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-iris bg-iris text-white hover:bg-[#1c1cc4]",
        outline: "border-iris bg-white text-iris hover:bg-iris-50",
        secondary: "border-iris bg-white text-iris hover:bg-iris-50",
        destructive: "border-danger bg-white text-danger hover:bg-danger-bg",
        ghost: "border-transparent bg-transparent text-iris hover:bg-iris-50",
        link: "border-transparent bg-transparent text-iris underline underline-offset-4",
      },
      size: { default: "px-3.5 py-1.5 text-[13px]", sm: "px-2.5 py-1 text-[12px]", lg: "px-5 py-2.5 text-[14px]", xs: "px-2 py-0.5 text-[12px]", icon: "size-9", "icon-sm": "size-7", "icon-xs": "size-6", "icon-lg": "size-11" },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({ className, variant = "default", size = "default", ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
