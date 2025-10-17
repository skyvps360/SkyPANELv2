import * as React from "react";
import { Drawer } from "vaul";

import { cn } from "@/lib/utils";

type SheetPortalProps = React.ComponentPropsWithoutRef<typeof Drawer.Portal>;

type SheetOverlayProps = React.ComponentPropsWithoutRef<typeof Drawer.Overlay>;

type SheetContentProps = React.ComponentPropsWithoutRef<typeof Drawer.Content> & {
  side?: "top" | "bottom" | "left" | "right";
};

type SheetHeaderProps = React.HTMLAttributes<HTMLDivElement>;

type SheetFooterProps = React.HTMLAttributes<HTMLDivElement>;

type SheetTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

type SheetDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

const Sheet = Drawer.Root;
const SheetTrigger = Drawer.Trigger;
const SheetClose = Drawer.Close;

const SheetPortal = ({ children, ...props }: SheetPortalProps) => (
  <Drawer.Portal {...props}>
    <div className="fixed inset-0 z-50 flex">
      {children}
    </div>
  </Drawer.Portal>
);
SheetPortal.displayName = "SheetPortal";

const SheetOverlay = React.forwardRef<React.ElementRef<typeof Drawer.Overlay>, SheetOverlayProps>(
  ({ className, ...props }, ref) => (
    <Drawer.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm",
        className
      )}
      {...props}
    />
  )
);
SheetOverlay.displayName = "SheetOverlay";

const SheetContent = React.forwardRef<React.ElementRef<typeof Drawer.Content>, SheetContentProps>(
  ({ className, children, side = "right", ...props }, ref) => (
    <SheetPortal>
      <SheetOverlay />
      <Drawer.Content
        ref={ref}
        className={cn(
          "fixed z-50 flex h-full w-full flex-col border border-border bg-background p-6 shadow-lg",
          side === "right" && "inset-y-0 right-0 max-w-lg",
          side === "left" && "inset-y-0 left-0 max-w-lg",
          side === "top" && "inset-x-0 top-0 max-h-[90vh]",
          side === "bottom" && "inset-x-0 bottom-0 max-h-[90vh]",
          className
        )}
        {...props}
      >
        {children}
      </Drawer.Content>
    </SheetPortal>
  )
);
SheetContent.displayName = "SheetContent";

const SheetHeader = ({ className, ...props }: SheetHeaderProps) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: SheetFooterProps) => (
  <div className={cn("mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = ({ className, ...props }: SheetTitleProps) => (
  <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
);
SheetTitle.displayName = "SheetTitle";

const SheetDescription = ({ className, ...props }: SheetDescriptionProps) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props} />
);
SheetDescription.displayName = "SheetDescription";

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
