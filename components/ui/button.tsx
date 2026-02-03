import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// NOTES:
// 1. Ensure you have imported a pixel font (like VT323) in your global CSS.
// 2. Add 'font-pixel' to your tailwind config or replace generic 'font-mono' below.

const buttonVariants = cva(
    "hover:cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap text-3xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 uppercase tracking-wider font-jungle",
    {
        variants: {
            variant: {
                // THE NEW MAIN STYLE (Matches the Logo)
                pixel:
                    "bg-[#8c6a46] text-[#ffeebb] border-2 border-[#1a2618] " +
                    // The 3D Block Shadow (Dark Green)
                    "shadow-[4px_4px_0px_0px_#1a2618] " +
                    // Hover: Pop up slightly
                    "hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#1a2618] hover:bg-[#9c7a56] " +
                    // Active: Press down flat
                    "active:translate-y-1 active:translate-x-1 active:shadow-none",

                // MODIFIED STANDARD VARIANTS (To fit the theme)
                default:
                    "bg-primary text-primary-foreground shadow hover:bg-primary/90 rounded-none",
                destructive:
                    "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 rounded-none",
                outline:
                    "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground rounded-none",
                secondary:
                    "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 rounded-none",
                ghost: "hover:bg-accent hover:text-accent-foreground rounded-none",
                link: "text-primary underline-offset-4 hover:underline rounded-none",
            },
            size: {
                default: "h-12 px-5 py-2", // Made slightly taller for pixel text
                xs: "h-7 px-2 text-xs",
                sm: "h-9 px-3",
                lg: "h-12 px-8 text-base",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "pixel", // Set the retro style as default
            size: "default",
        },
    },
);

function Button({
    className,
    variant,
    size,
    asChild = false,
    ...props
}: React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
    }) {
    const Comp = asChild ? Slot : "button";

    return (
        <Comp
            data-slot="button"
            data-variant={variant}
            data-size={size}
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    );
}

export { Button, buttonVariants };
