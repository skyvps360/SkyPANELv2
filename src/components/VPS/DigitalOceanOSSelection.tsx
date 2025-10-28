import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ProviderErrorDisplay } from './ProviderErrorDisplay';
import { getUserFriendlyErrorMessage } from '@/lib/providerErrors';

interface DigitalOceanImage {
  id: number;
  slug: string;
  name: string;
  distribution: string;
  description?: string;
  type: string;
  public: boolean;
  min_disk_size?: number;
  size_gigabytes?: number;
  created_at?: string;
}

interface DigitalOceanOSSelectionProps {
  selectedImage: string | null;
  onSelect: (imageSlug: string) => void;
  compatibleWith?: string[]; // For marketplace app compatibility
  token: string;
}

export default function DigitalOceanOSSelection({
  selectedImage,
  onSelect,
  compatibleWith,
  token
}: DigitalOceanOSSelectionProps) {
  const [images, setImages] = useState<DigitalOceanImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch OS images on mount
  const fetchImages = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/vps/digitalocean/images?type=distribution', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw data.error || { message: 'Failed to fetch OS images' };
      }

      setImages(data.images || []);
    } catch (err: any) {
      console.error('Failed to fetch OS images:', err);
      setError(err);
      const errorMessage = getUserFriendlyErrorMessage(err, 'digitalocean');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Filter images based on search term and compatibility
  const filteredImages = useMemo(() => {
    let filtered = images;

    // Filter by marketplace app compatibility if specified
    if (compatibleWith && compatibleWith.length > 0) {
      filtered = filtered.filter(img => 
        compatibleWith.includes(img.slug) || 
        compatibleWith.some(compat => img.slug.includes(compat))
      );
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(img =>
        img.name.toLowerCase().includes(term) ||
        img.distribution.toLowerCase().includes(term) ||
        img.slug.toLowerCase().includes(term) ||
        (img.description && img.description.toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [images, searchTerm, compatibleWith]);

  // Group filtered images by distribution family
  const groupedImages = useMemo(() => {
    const grouped: Record<string, DigitalOceanImage[]> = {};
    
    filteredImages.forEach(image => {
      const distribution = image.distribution || 'Other';
      if (!grouped[distribution]) {
        grouped[distribution] = [];
      }
      grouped[distribution].push(image);
    });

    // Sort images within each group by name
    Object.keys(grouped).forEach(dist => {
      grouped[dist].sort((a, b) => a.name.localeCompare(b.name));
    });

    return grouped;
  }, [filteredImages]);

  // Color mapping for distribution families
  const colorMap: Record<string, string> = {
    'Ubuntu': 'from-orange-500 to-red-600',
    'Debian': 'from-red-500 to-gray-600',
    'CentOS': 'from-emerald-500 to-emerald-600',
    'Rocky Linux': 'from-green-600 to-emerald-700',
    'AlmaLinux': 'from-rose-500 to-pink-600',
    'Fedora': 'from-blue-600 to-indigo-700',
    'Alpine': 'from-cyan-500 to-sky-600',
    'Arch Linux': 'from-sky-500 to-blue-700',
    'openSUSE': 'from-lime-500 to-green-600',
    'Gentoo': 'from-purple-500 to-violet-600',
    'FreeBSD': 'from-red-600 to-orange-700',
  };

  const handleImageSelect = (image: DigitalOceanImage) => {
    onSelect(image.slug);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading operating systems...</p>
      </div>
    );
  }

  if (error) {
    return (
      <ProviderErrorDisplay
        error={error}
        provider="digitalocean"
        onRetry={fetchImages}
      />
    );
  }

  const distributions = Object.keys(groupedImages).sort();

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search operating systems..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Compatibility notice */}
      {compatibleWith && compatibleWith.length > 0 && (
        <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-3">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Showing images compatible with selected marketplace app
          </p>
        </div>
      )}

      {/* Images grouped by distribution */}
      {distributions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No operating systems found</p>
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
        distributions.map(distribution => {
          const distImages = groupedImages[distribution];
          const colors = colorMap[distribution] || 'from-blue-500 to-purple-600';
          const iconText = distribution.substring(0, 2).toUpperCase();

          return (
            <div key={distribution} className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">{distribution}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {distImages.map(image => {
                  const isSelected = selectedImage === image.slug;
                  
                  return (
                    <div
                      key={image.id}
                      onClick={() => handleImageSelect(image)}
                      className={cn(
                        "relative p-3 min-h-[75px] border rounded-lg cursor-pointer transition-all touch-manipulation",
                        isSelected
                          ? 'border-primary bg-primary/10 dark:bg-primary/20 dark:border-primary'
                          : 'border hover:border-input dark:hover:border-gray-500'
                      )}
                    >
                      <div className="flex flex-col space-y-2">
                        <div className={cn(
                          "w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center",
                          colors
                        )}>
                          <span className="text-white font-bold text-xs">
                            {iconText}
                          </span>
                        </div>
                        <h4 className="font-medium text-foreground text-sm truncate">
                          {image.name}
                        </h4>
                        <p 
                          className="text-xs text-muted-foreground leading-relaxed overflow-hidden" 
                          style={{ 
                            display: '-webkit-box', 
                            WebkitLineClamp: 2, 
                            WebkitBoxOrient: 'vertical' 
                          }}
                        >
                          {image.description || `${distribution} operating system`}
                        </p>
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
          );
        })
      )}
    </div>
  );
}
