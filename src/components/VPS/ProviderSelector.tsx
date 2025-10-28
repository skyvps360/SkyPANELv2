/**
 * Provider Selector Component
 * Allows users to select from active cloud providers
 */

import React, { useState, useEffect } from 'react';
import { Server, ChevronDown, AlertTriangle, RefreshCw } from 'lucide-react';
import type { Provider, ProviderType } from '@/types/provider';
import { toast } from 'sonner';
import { getUserFriendlyErrorMessage, isCredentialError } from '@/lib/providerErrors';

interface ProviderSelectorProps {
  value: string | null;
  onChange: (providerId: string, providerType: ProviderType) => void;
  disabled?: boolean;
  token: string;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  token
}) => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/vps/providers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw data.error || { message: 'Failed to fetch providers' };
      }

      const data = await response.json();
      // Providers are already filtered for active=true and ordered by display_order on the backend
      const activeProviders = data.providers || [];
      
      setProviders(activeProviders);

      // Auto-select Linode if no provider is selected and Linode is available
      if (!value && activeProviders.length > 0) {
        const linodeProvider = activeProviders.find((p: Provider) => p.type === 'linode');
        if (linodeProvider) {
          onChange(linodeProvider.id, linodeProvider.type);
        } else {
          // If no Linode, select the first active provider
          onChange(activeProviders[0].id, activeProviders[0].type);
        }
      }
    } catch (err) {
      console.error('Failed to fetch providers:', err);
      setError(err);
      const errorMessage = getUserFriendlyErrorMessage(err);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedProvider = providers.find(p => p.id === value);

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-muted-foreground">
          Provider *
        </label>
        <div className="w-full px-4 py-3 min-h-[48px] border rounded-md bg-secondary text-muted-foreground animate-pulse flex items-center gap-2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Loading providers...</span>
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage = getUserFriendlyErrorMessage(error);
    const isCredError = isCredentialError(error);
    
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-muted-foreground">
          Provider *
        </label>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-destructive">{errorMessage}</p>
              {isCredError && (
                <p className="text-xs text-muted-foreground">
                  Please contact your administrator to configure provider credentials.
                </p>
              )}
              {!isCredError && (
                <button
                  onClick={fetchProviders}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-muted-foreground">
          Provider *
        </label>
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                No active providers available
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please contact your administrator to enable cloud providers.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-muted-foreground">
        Provider *
      </label>
      <div className="relative">
        <select
          value={value || ''}
          onChange={(e) => {
            const provider = providers.find(p => p.id === e.target.value);
            if (provider) {
              onChange(provider.id, provider.type);
            }
          }}
          disabled={disabled}
          className="w-full px-4 py-3 min-h-[48px] border border-rounded-md bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-base appearance-none pr-10 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          aria-label="Select cloud provider"
        >
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
      </div>
      {selectedProvider && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Server className="h-4 w-4" />
          <span>Selected: {selectedProvider.name}</span>
        </div>
      )}
    </div>
  );
};
