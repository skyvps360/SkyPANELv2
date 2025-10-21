/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { LoaderCircle } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface MobileLoadingProps {
  isLoading: boolean
  title?: string
  description?: string
  progress?: number
  className?: string
  onCancel?: () => void
}

/**
 * Mobile-optimized loading overlay with progress feedback
 */
export function MobileLoading({
  isLoading,
  title = "Processing...",
  description,
  progress,
  className,
  onCancel
}: MobileLoadingProps) {
  const isMobile = useIsMobile()

  if (!isLoading) return null

  if (!isMobile) {
    // Simple loading for desktop
    return (
      <div className="flex items-center gap-2">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">{title}</span>
      </div>
    )
  }

  return (
    <div className="mobile-loading-overlay">
      <div className={cn("mobile-loading-content", className)}>
        <div className="mobile-loading-spinner">
          <LoaderCircle className="h-10 w-10 animate-spin text-primary mx-auto" />
        </div>
        
        <div className="mobile-loading-text">
          {title}
        </div>
        
        {description && (
          <div className="mobile-loading-subtext">
            {description}
          </div>
        )}

        {progress !== undefined && (
          <div className="mt-4">
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {Math.round(progress)}% complete
            </div>
          </div>
        )}

        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-4 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Hook for managing mobile loading states
 */
export function useMobileLoading() {
  const [loadingState, setLoadingState] = React.useState<{
    isLoading: boolean
    title?: string
    description?: string
    progress?: number
  }>({
    isLoading: false
  })

  const showLoading = React.useCallback((
    title?: string, 
    description?: string,
    progress?: number
  ) => {
    setLoadingState({
      isLoading: true,
      title,
      description,
      progress
    })
  }, [])

  const updateProgress = React.useCallback((progress: number, description?: string) => {
    setLoadingState(prev => ({
      ...prev,
      progress,
      description: description || prev.description
    }))
  }, [])

  const hideLoading = React.useCallback(() => {
    setLoadingState({ isLoading: false })
  }, [])

  return {
    ...loadingState,
    showLoading,
    updateProgress,
    hideLoading
  }
}

/**
 * Mobile-optimized loading button component
 */
interface MobileLoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading: boolean
  loadingText?: string
  children: React.ReactNode
}

export function MobileLoadingButton({
  isLoading,
  loadingText = "Loading...",
  children,
  className,
  disabled,
  ...props
}: MobileLoadingButtonProps) {
  const isMobile = useIsMobile()

  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center gap-2",
        isMobile && "min-h-[48px] px-6 text-base",
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        // show loader and text when loading
        <>
          <LoaderCircle className={cn(
            "animate-spin",
            isMobile ? "h-5 w-5" : "h-4 w-4"
          )} />
          <span className="opacity-70">
            {loadingText}
          </span>
        </>
      ) : (
        // render children directly to preserve flex layout
        <>
          {children}
        </>
      )}
    </button>
  )
}

/**
 * Mobile-optimized step progress indicator for multi-step forms
 */
interface MobileStepProgressProps {
  currentStep: number
  totalSteps: number
  stepLabels?: string[]
  className?: string
}

export function MobileStepProgress({
  currentStep,
  totalSteps,
  stepLabels,
  className
}: MobileStepProgressProps) {
  const isMobile = useIsMobile()
  const progress = (currentStep / totalSteps) * 100

  if (!isMobile) {
    return null // Use desktop step indicator
  }

  return (
    <div className={cn("mb-6", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm text-muted-foreground">
          {Math.round(progress)}%
        </span>
      </div>
      
      <div className="w-full bg-muted rounded-full h-2">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {stepLabels && stepLabels[currentStep - 1] && (
        <div className="mt-2 text-sm text-muted-foreground">
          {stepLabels[currentStep - 1]}
        </div>
      )}
    </div>
  )
}