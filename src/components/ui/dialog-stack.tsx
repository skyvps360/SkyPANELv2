import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReactNode, useMemo } from "react";

export interface DialogStackStep {
  id: string;
  title: string;
  description?: string;
  content: ReactNode;
  footer?: ReactNode;
}

interface DialogStackProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: DialogStackStep[];
  activeStep: number;
  onStepChange?: (index: number) => void;
  title?: string;
  description?: string;
  footer?: ReactNode;
}

export function DialogStack({
  open,
  onOpenChange,
  steps,
  activeStep,
  onStepChange,
  title,
  description,
  footer,
}: DialogStackProps) {
  const clampedIndex = useMemo(() => {
    if (steps.length === 0) return 0;
    return Math.min(Math.max(activeStep, 0), steps.length - 1);
  }, [activeStep, steps.length]);

  const currentStep = steps[clampedIndex];
  const upcoming = steps.slice(clampedIndex + 1, clampedIndex + 3);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border-none bg-transparent p-0 shadow-none sm:rounded-[32px]">
        <div className="rounded-[28px] border border-border/70 bg-background/95 p-4 shadow-xl backdrop-blur-md sm:p-8">
          <div className="grid gap-6 sm:grid-cols-[250px,1fr] sm:gap-10">
            <aside className="space-y-6">
              {(title || description) && (
                <div className="space-y-1">
                  {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
                  {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                  )}
                </div>
              )}
              <nav className="relative flex flex-col gap-3">
                {steps.map((step, index) => {
                  const isActive = index === clampedIndex;
                  const isCompleted = index < clampedIndex;
                  const indicator = isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1;
                  const offset = Math.max(0, index - clampedIndex);

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => onStepChange?.(index)}
                      className={cn(
                        "relative text-left transition-all",
                        isActive ? "z-20" : "z-10",
                        !isActive && "hover:z-20"
                      )}
                      style={{ transform: `translateY(${offset * 4}px)` }}
                    >
                      <Card
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border bg-card/70 p-3 backdrop-blur transition-all",
                          isActive && "border-primary shadow-lg ring-2 ring-primary/20",
                          isCompleted && !isActive && "border-primary/40",
                          !isActive && !isCompleted && "border-border hover:border-primary/40"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
                            isActive && "border-primary bg-primary text-primary-foreground",
                            isCompleted && !isActive && "border-emerald-500 bg-emerald-500 text-white",
                            !isActive && !isCompleted && "border-border bg-muted text-muted-foreground"
                          )}
                        >
                          {indicator}
                        </div>
                        <div className="space-y-1">
                          <p className={cn(
                            "text-sm font-medium",
                            isActive ? "text-foreground" : "text-muted-foreground"
                          )}
                          >
                            {step.title}
                          </p>
                          {step.description && (
                            <p className="text-xs text-muted-foreground/80">
                              {step.description}
                            </p>
                          )}
                        </div>
                      </Card>
                    </button>
                  );
                })}
              </nav>
            </aside>

            <section className="relative">
              {upcoming.map((step, index) => (
                <div
                  key={step.id}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-[26px] border border-border/40 bg-card/70"
                  style={{
                    transform: `translate(${(index + 1) * 14}px, ${(index + 1) * 14}px)` ,
                    zIndex: index,
                    opacity: 0.6 - index * 0.2,
                  }}
                />
              ))}
              {currentStep && (
                <Card className="relative z-20 rounded-[26px] border border-border/80 bg-card/95 shadow-2xl">
                  <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <CardTitle>{currentStep.title}</CardTitle>
                      {currentStep.description && (
                        <CardDescription>{currentStep.description}</CardDescription>
                      )}
                    </div>
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Step {clampedIndex + 1} of {steps.length}
                    </span>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {currentStep.content}
                  </CardContent>
                  {currentStep.footer && (
                    <CardFooter className="border-t border-border/60 bg-card/60 py-4">
                      {currentStep.footer}
                    </CardFooter>
                  )}
                </Card>
              )}
            </section>
          </div>
          {footer && (
            <div className="mt-6 border-t border-border/70 pt-4">
              {footer}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
