import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Search, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ProviderErrorDisplay } from './ProviderErrorDisplay';
import { getUserFriendlyErrorMessage } from '@/lib/providerErrors';
import { validateMarketplaceApp } from '@/lib/validation';

interface MarketplaceApp {
  slug: string;
  name: string;
  description: string;
  category: string;
  image_slug: string;
  compatible_images?: string[];
  type: string;
}

interface DigitalOceanMarketplaceProps {
  selectedApp: string | null;
  onSelect: (appSlug: string | null, appData: MarketplaceApp | null) => void;
  token: string;
  region?: string; // Current selected region for validation
}

export default function DigitalOceanMarketplace({
  selectedApp,
  onSelect,
  token,
  region
}: DigitalOceanMarketplaceProps) {
  const [apps, setApps] = useState<MarketplaceApp[]>([]);
  const [_categorized, _setCategorized] = useState<Record<string, MarketplaceApp[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch marketplace apps on mount
  const fetchApps = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/vps/digitalocean/marketplace', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw data.error || { message: 'Failed to fetch marketplace apps' };
      }

      setApps(data.apps || []);
      _setCategorized(data.categorized || {});
    } catch (err: any) {
      console.error('Failed to fetch marketplace apps:', err);
      setError(err);
      const errorMessage = getUserFriendlyErrorMessage(err, 'digitalocean');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Filter apps based on search term
  const filteredApps = useMemo(() => {
    if (!searchTerm.trim()) return apps;

    const term = searchTerm.toLowerCase();
    return apps.filter(app =>
      app.name.toLowerCase().includes(term) ||
      app.description.toLowerCase().includes(term) ||
      app.category.toLowerCase().includes(term)
    );
  }, [apps, searchTerm]);

  // Group filtered apps by category
  const filteredCategorized = useMemo(() => {
    const grouped: Record<string, MarketplaceApp[]> = {};
    filteredApps.forEach(app => {
      const category = app.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(app);
    });
    return grouped;
  }, [filteredApps]);

  const handleNoneSelect = () => {
    onSelect(null, null);
  };

  const handleAppSelect = (app: MarketplaceApp) => {
    // Validate marketplace app selection if region is provided
    if (region) {
      const validation = validateMarketplaceApp(app.slug, region, apps);
      if (!validation.valid) {
        toast.error(validation.error || 'Invalid marketplace app selection');
        return;
      }
    }
    
    onSelect(app.slug, app);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading marketplace apps...</p>
      </div>
    );
  }

  if (error) {
    return (
      <ProviderErrorDisplay
        error={error}
        provider="digitalocean"
        onRetry={fetchApps}
      />
    );
  }

  const isNoneSelected = selectedApp === null;
  const categories = Object.keys(filteredCategorized).sort();

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search marketplace apps..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* None option */}
      <div
        onClick={handleNoneSelect}
        className={cn(
          "relative p-3 min-h-[75px] border rounded-lg cursor-pointer transition-all touch-manipulation",
          isNoneSelected
            ? 'border-primary bg-primary/10 dark:bg-primary/20 dark:border-primary'
            : 'border hover:border-input dark:hover:border-gray-500'
        )}
      >
        <div className="flex flex-col space-y-2">
          <div className="w-9 h-9 bg-gray-400 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">NO</span>
          </div>
          <h4 className="font-medium text-foreground text-sm">None</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Provision base OS without a marketplace app
          </p>
        </div>
        {isNoneSelected && (
          <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Apps grouped by category */}
      {categories.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No marketplace apps found</p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        categories.map(category => (
          <div key={category} className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">{category}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategorized[category].map(app => {
                const isSelected = selectedApp === app.slug;
                
                // Generate icon from app name
                const iconText = app.name.substring(0, 2).toUpperCase();
                
                // Check if app is compatible with selected region
                const validation = region ? validateMarketplaceApp(app.slug, region, apps) : { valid: true };
                const isIncompatible = !validation.valid && validation.errorCode === 'REGION_INCOMPATIBLE';
                
                return (
                  <div
                    key={app.slug}
                    onClick={() => handleAppSelect(app)}
                    className={cn(
                      "relative p-3 min-h-[75px] border rounded-lg cursor-pointer transition-all touch-manipulation",
                      isSelected
                        ? 'border-primary bg-primary/10 dark:bg-primary/20 dark:border-primary'
                        : isIncompatible
                        ? 'border-amber-500/50 bg-amber-500/5 opacity-60 cursor-not-allowed'
                        : 'border hover:border-input dark:hover:border-gray-500'
                    )}
                  >
                    <div className="flex flex-col space-y-2">
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xs">
                          {iconText}
                        </span>
                      </div>
                      <h4 className="font-medium text-foreground text-sm truncate">
                        {app.name}
                      </h4>
                      <p 
                        className="text-xs text-muted-foreground leading-relaxed overflow-hidden" 
                        style={{ 
                          display: '-webkit-box', 
                          WebkitLineClamp: 2, 
                          WebkitBoxOrient: 'vertical' 
                        }}
                      >
                        {app.description || 'Marketplace application'}
                      </p>
                      {isIncompatible && (
                        <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Not available in selected region</span>
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
