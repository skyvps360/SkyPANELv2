import React from 'react';
import { LogOut, User, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from './ErrorBoundary';

interface ImpersonationBannerProps {
  impersonatedUser: {
    id: string;
    name: string;
    email: string;
  };
  onExitImpersonation: () => void;
  isExiting?: boolean;
  error?: string | null;
}

export const ImpersonationBanner: React.FC<ImpersonationBannerProps> = ({
  impersonatedUser,
  onExitImpersonation,
  isExiting = false,
  error = null,
}) => {
  const handleExitClick = () => {
    try {
      onExitImpersonation();
    } catch (err) {
      console.error('Error during impersonation exit:', err);
    }
  };

  return (
    <ErrorBoundary
      fallback={
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white p-2 text-center text-sm">
          Impersonation banner error. Please refresh the page.
        </div>
      }
    >
      <div 
        className={cn(
          "fixed top-0 left-0 right-0 z-50",
          "animate-in slide-in-from-top-2 duration-300",
          error ? "bg-red-500 dark:bg-red-600" : "bg-amber-500 dark:bg-amber-600",
          error ? "border-b border-red-600 dark:border-red-700" : "border-b border-amber-600 dark:border-amber-700",
          "shadow-lg backdrop-blur-sm"
        )}
        role="banner"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 animate-in slide-in-from-left-2 duration-300 delay-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  error ? "text-red-900 dark:text-red-100 animate-pulse" : "text-amber-900 dark:text-amber-100",
                  !error && "animate-bounce"
                )} />
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "transition-all duration-200 animate-in zoom-in-95",
                    error 
                      ? "bg-red-600 dark:bg-red-700 text-red-100 dark:text-red-50 border-red-700 dark:border-red-800"
                      : "bg-amber-600 dark:bg-amber-700 text-amber-100 dark:text-amber-50 border-amber-700 dark:border-amber-800"
                  )}
                >
                  {error ? 'ERROR' : 'ADMIN MODE'}
                </Badge>
              </div>
              
              {error ? (
                <div className="text-red-900 dark:text-red-100 text-sm animate-in slide-in-from-right-2 duration-300 delay-200">
                  <span className="font-medium">Impersonation Error:</span> 
                  <span className="ml-1" role="alert">{error}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-100 animate-in slide-in-from-right-2 duration-300 delay-200">
                  <User className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
                  <span className="text-sm font-medium">
                    Acting as: 
                    <span className="font-semibold ml-1 transition-colors duration-200 hover:text-amber-800 dark:hover:text-amber-50">
                      {impersonatedUser.name}
                    </span>
                  </span>
                  <span className="text-xs opacity-75 transition-opacity duration-200 hover:opacity-100">
                    ({impersonatedUser.email})
                  </span>
                </div>
              )}
            </div>

            <Button
              onClick={handleExitClick}
              disabled={isExiting}
              size="sm"
              variant="secondary"
              className={cn(
                "transition-all duration-200 hover:scale-105 animate-in slide-in-from-right-2 duration-300 delay-300",
                "focus-visible:ring-2 focus-visible:ring-offset-2",
                error
                  ? "bg-red-600 dark:bg-red-700 text-red-100 dark:text-red-50 hover:bg-red-700 dark:hover:bg-red-800 border-red-700 dark:border-red-800 focus-visible:ring-red-500 dark:focus-visible:ring-red-400"
                  : "bg-amber-600 dark:bg-amber-700 text-amber-100 dark:text-amber-50 hover:bg-amber-700 dark:hover:bg-amber-800 border-amber-700 dark:border-amber-800 focus-visible:ring-amber-500 dark:focus-visible:ring-amber-400",
                isExiting && "opacity-75 cursor-not-allowed hover:scale-100"
              )}
              aria-label={isExiting ? "Exiting impersonation, please wait" : "Exit impersonation mode"}
              aria-describedby={isExiting ? "exit-status" : undefined}
            >
              {isExiting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span>Exiting...</span>
                  <span id="exit-status" className="sr-only">
                    Exiting impersonation mode, please wait
                  </span>
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
                  <span>Exit Impersonation</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};