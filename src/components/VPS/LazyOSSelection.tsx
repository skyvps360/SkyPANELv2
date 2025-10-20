import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface OSGroup {
  name: string;
  key: string;
  versions: Array<{ id: string; label: string }>;
}

interface LazyOSSelectionProps {
  osGroups: Record<string, OSGroup>;
  selectedOSGroup: string | null;
  selectedOSVersion: Record<string, string>;
  onOSGroupSelect: (key: string) => void;
  onOSVersionSelect: (key: string, version: string) => void;
  onImageSelect: (imageId: string) => void;
}

export default function LazyOSSelection({
  osGroups,
  selectedOSGroup,
  selectedOSVersion,
  onOSGroupSelect,
  onOSVersionSelect,
  onImageSelect
}: LazyOSSelectionProps) {
  // Memoize the color mapping to avoid recalculation
  const colorMap = useMemo(() => ({
    ubuntu: 'from-orange-500 to-red-600',
    debian: 'from-red-500 to-gray-600',
    centos: 'from-emerald-500 to-emerald-600',
    rockylinux: 'from-green-600 to-emerald-700',
    almalinux: 'from-rose-500 to-pink-600',
    fedora: 'from-blue-600 to-indigo-700',
    alpine: 'from-cyan-500 to-sky-600',
    arch: 'from-sky-500 to-blue-700',
    opensuse: 'from-lime-500 to-green-600',
    gentoo: 'from-purple-500 to-violet-600',
    slackware: 'from-gray-500 to-gray-700'
  }), []);

  // Memoize the filtered and sorted OS groups
  const sortedOSKeys = useMemo(() => {
    return ['ubuntu','debian','centos','rockylinux','almalinux','fedora','alpine','arch','opensuse','gentoo','slackware']
      .filter(key => osGroups[key] && osGroups[key].versions.length > 0);
  }, [osGroups]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedOSKeys.map(key => {
        const group = osGroups[key];
        const selectedVersionId = selectedOSVersion[key] || group.versions[0]?.id;
        const isSelected = selectedOSGroup === key;
        const colors = colorMap[key as keyof typeof colorMap] || 'from-blue-500 to-purple-600';
        
        return (
          <div
            key={key}
            className={cn(
              "p-4 min-h-[120px] border-2 rounded-lg transition-all cursor-pointer hover:shadow-md touch-manipulation",
              isSelected 
                ? 'border-primary bg-primary/10 dark:bg-primary/20 dark:border-primary' 
                : 'border hover:border-input dark:hover:border-gray-500'
            )}
            onClick={() => {
              onOSGroupSelect(key);
              const idToUse = selectedVersionId || group.versions[0]?.id;
              if (idToUse) onImageSelect(idToUse);
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className={cn(
                  "w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-md",
                  colors
                )}>
                  <span className="text-white font-bold text-sm">
                    {group.name.slice(0,2).toUpperCase()}
                  </span>
                </div>
                <h3 className="font-medium text-foreground text-base lowercase truncate">
                  {group.name}
                </h3>
              </div>
              <div className="flex-shrink-0 ml-2">
                {isSelected ? (
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-6 h-6 border-2 border-muted-foreground/30 rounded-full"></div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Select Version
              </label>
              <select
                value={selectedVersionId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onOSVersionSelect(key, val);
                  onImageSelect(val);
                  onOSGroupSelect(key);
                }}
                className="w-full px-3 py-3 min-h-[44px] text-sm rounded-md border bg-secondary text-foreground shadow-sm focus:border-primary focus:ring-primary focus:outline-none focus:ring-2 touch-manipulation"
                onClick={(e) => e.stopPropagation()}
              >
                <option value="" disabled>SELECT VERSION</option>
                {group.versions.map(v => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
        );
      })}
    </div>
  );
}