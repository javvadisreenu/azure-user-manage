import { cn } from "@/lib/utils";

export function Separator({ className, orientation = "horizontal", ...props }) {
  return (
    <div
      data-slot="separator"
      role="none"
      className={cn(
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      )}
      data-orientation={orientation}
      {...props}
    />
  );
}
