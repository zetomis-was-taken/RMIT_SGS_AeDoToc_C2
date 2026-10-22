import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Light-mode button system: Electric Iris (#2727e6) primary on white canvas.
// Pill-shaped (rounded-full) per SuperHi Basic Income; Studio.Design tight tracking.
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 font-semibold whitespace-nowrap outline-none select-none transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-blue-500/25 bg-gradient-to-r from-[#2727e6] via-[#334beb] to-[#3b5bf5] text-white shadow-[0_2px_12px_rgba(39,39,230,0.28)] hover:shadow-[0_4px_20px_rgba(39,39,230,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
        electric:
          "border border-blue-500/30 bg-[#2727e6] text-white shadow-[0_2px_14px_rgba(39,39,230,0.30)] hover:bg-[#2020cc] hover:shadow-[0_4px_22px_rgba(39,39,230,0.50)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
        outline:
          "border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
        secondary:
          "border border-gray-200 bg-gray-50 text-gray-700 hover:bg-white hover:border-gray-300 hover:-translate-y-0.5 active:translate-y-0",
        destructive:
          "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 hover:shadow-[0_2px_12px_rgba(220,38,38,0.15)] hover:-translate-y-0.5 active:translate-y-0",
        ghost:
          "border border-transparent bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100",
        link:
          "border-transparent bg-transparent text-[#2727e6] hover:text-[#1a1db8] underline underline-offset-4",
        inverse:
          "border border-gray-900 bg-gray-900 text-white font-bold hover:bg-gray-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
      },
      size: {
        default: "rounded-full px-5 py-2 text-[14px] tracking-[-0.02em]",
        sm:      "rounded-full px-3.5 py-1.5 text-[13px] tracking-[-0.01em]",
        lg:      "rounded-full px-7 py-3 text-[16px] tracking-[-0.03em]",
        xs:      "rounded-full px-2.5 py-0.5 text-[12px]",
        icon:    "size-9 rounded-full",
        "icon-sm":  "size-7 rounded-full",
        "icon-xs":  "size-6 rounded-full",
        "icon-lg":  "size-11 rounded-full",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
