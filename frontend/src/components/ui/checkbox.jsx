import { cn } from "@/lib/utils";

// Minimal checkbox matching the shadcn look without pulling in another Radix package.
export function Checkbox({ className, checked, onCheckedChange, ...props }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/40 size-4.5 shrink-0 cursor-pointer rounded-[5px] border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {checked && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex size-full items-center justify-center p-0.5"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </button>
  );
}
