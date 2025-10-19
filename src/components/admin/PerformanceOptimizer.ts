import React from 'react';

/**
 * Hook for debouncing values to improve performance
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook for throttling function calls
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastRun = React.useRef(Date.now());

  return React.useCallback(
    ((...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [callback, delay]
  );
};

/**
 * Hook for virtual scrolling large lists
 */
export const useVirtualScroll = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 5
) => {
  const [scrollTop, setScrollTop] = React.useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = React.useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      offsetY: (startIndex + index) * itemHeight,
    }));
  }, [items, startIndex, endIndex, itemHeight]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    handleScroll,
    startIndex,
    endIndex,
  };
};

/**
 * Hook for memoizing expensive calculations
 */
export const useMemoizedCalculation = <T, R>(
  calculation: (input: T) => R,
  input: T,
  deps: React.DependencyList = []
): R => {
  return React.useMemo(() => calculation(input), [input, ...deps]);
};

/**
 * Hook for lazy loading components
 */
export const useLazyComponent = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) => {
  const [Component, setComponent] = React.useState<T | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    importFunc()
      .then((module) => {
        if (isMounted) {
          setComponent(() => module.default);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [importFunc]);

  const LazyComponent = React.useMemo(() => {
    if (error) {
      return () => React.createElement('div', {
        className: 'p-4 text-center text-red-600'
      }, `Failed to load component: ${error.message}`);
    }

    if (isLoading) {
      return fallback || (() => React.createElement('div', {
        className: 'p-4 text-center'
      }, React.createElement('div', {
        className: 'animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto'
      })));
    }

    return Component;
  }, [Component, isLoading, error, fallback]);

  return { Component: LazyComponent, isLoading, error };
};

/**
 * Hook for intersection observer (for lazy loading images, etc.)
 */
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [entry, setEntry] = React.useState<IntersectionObserverEntry | null>(null);
  const elementRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        setEntry(entry);
      },
      options
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options]);

  return { elementRef, isIntersecting, entry };
};

/**
 * Hook for optimizing re-renders with shallow comparison
 */
export const useShallowMemo = <T extends Record<string, any>>(obj: T): T => {
  const ref = React.useRef<T>(obj);

  return React.useMemo(() => {
    const keys = Object.keys(obj);
    const prevKeys = Object.keys(ref.current);

    if (keys.length !== prevKeys.length) {
      ref.current = obj;
      return obj;
    }

    for (const key of keys) {
      if (obj[key] !== ref.current[key]) {
        ref.current = obj;
        return obj;
      }
    }

    return ref.current;
  }, [obj]);
};

/**
 * Hook for batch state updates
 */
export const useBatchedState = <T>(initialState: T) => {
  const [state, setState] = React.useState<T>(initialState);
  const batchedUpdates = React.useRef<Partial<T>[]>([]);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const batchUpdate = React.useCallback((update: Partial<T>) => {
    batchedUpdates.current.push(update);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setState((prevState) => {
        const newState = { ...prevState };
        batchedUpdates.current.forEach((update) => {
          Object.assign(newState, update);
        });
        batchedUpdates.current = [];
        return newState;
      });
    }, 0);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, batchUpdate] as const;
};