import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PageIntroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  actions?: ReactNode;
}

export function PageIntro({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  actions,
}: PageIntroProps) {
  return (
    <div
      className={cn(
        "space-y-4",
        align === "center" && "text-center",
        className,
      )}
    >
      {eyebrow ? (
        <Badge
          variant="outline"
          className={cn(
            "w-fit uppercase tracking-wide text-xs",
            align === "center" && "mx-auto",
          )}
        >
          {eyebrow}
        </Badge>
      ) : null}
      <h1
        className={cn(
          "text-3xl font-semibold tracking-tight text-foreground sm:text-4xl",
          align === "center" && "mx-auto max-w-3xl",
        )}
      >
        {title}
      </h1>
      {description ? (
        <p
          className={cn(
            "text-base text-muted-foreground sm:text-lg",
            align === "center" && "mx-auto max-w-2xl",
          )}
        >
          {description}
        </p>
      ) : null}
      {actions ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-3",
            align === "center" && "justify-center",
          )}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}
