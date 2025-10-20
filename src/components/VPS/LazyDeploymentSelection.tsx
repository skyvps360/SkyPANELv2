import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface StackScript {
  id: string;
  label: string;
  description?: string;
  user_defined_fields?: any[];
  images?: string[];
}

interface LazyDeploymentSelectionProps {
  stackScripts: StackScript[];
  selectedStackScript: StackScript | null;
  onStackScriptSelect: (script: StackScript | null) => void;
}

export default function LazyDeploymentSelection({
  stackScripts,
  selectedStackScript,
  onStackScriptSelect
}: LazyDeploymentSelectionProps) {
  // Memoize filtered stack scripts to avoid recalculation
  const filteredStackScripts = useMemo(() => {
    return stackScripts.filter(script => {
      const isSshKeyScript = script.label === 'ssh-key' || 
        script.id === 'ssh-key' ||
        (script.label && script.label.toLowerCase().includes('ssh'));
      return !isSshKeyScript;
    });
  }, [stackScripts]);

  // Memoize SSH key script detection
  const sshKeyScript = useMemo(() => {
    return stackScripts.find(script => 
      script.label === 'ssh-key' || 
      script.id === 'ssh-key' ||
      (script.label && script.label.toLowerCase().includes('ssh'))
    );
  }, [stackScripts]);

  const isNoneSelected = selectedStackScript === null || 
    (selectedStackScript && (
      selectedStackScript.label === 'ssh-key' || 
      selectedStackScript.id === 'ssh-key' ||
      (selectedStackScript.label && selectedStackScript.label.toLowerCase().includes('ssh'))
    ));

  const handleNoneSelect = () => {
    onStackScriptSelect(sshKeyScript || null);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {/* None option */}
      <div
        onClick={handleNoneSelect}
        className={cn(
          "relative p-4 min-h-[80px] border rounded-lg cursor-pointer transition-all touch-manipulation",
          isNoneSelected
            ? 'border-primary bg-primary/10 dark:bg-primary/20 dark:border-primary'
            : 'border hover:border-input dark:hover:border-gray-500'
        )}
      >
        <div className="flex flex-col space-y-3">
          <div className="w-10 h-10 bg-gray-400 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">NO</span>
          </div>
          <h4 className="font-medium text-foreground text-base">None</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Provision base OS without a deployment
          </p>
        </div>
        {isNoneSelected && (
          <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Stack script options */}
      {filteredStackScripts.map((script) => {
        const isSelected = selectedStackScript?.id === script.id;
        
        return (
          <div
            key={script.id}
            onClick={() => onStackScriptSelect(script)}
            className={cn(
              "relative p-4 min-h-[80px] border rounded-lg cursor-pointer transition-all touch-manipulation",
              isSelected
                ? 'border-primary bg-primary/10 dark:bg-primary/20 dark:border-primary'
                : 'border hover:border-input dark:hover:border-gray-500'
            )}
          >
            <div className="flex flex-col space-y-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {String(script.label || '').substring(0, 2).toUpperCase()}
                </span>
              </div>
              <h4 className="font-medium text-foreground text-base truncate">
                {script.label}
              </h4>
              <p 
                className="text-sm text-muted-foreground leading-relaxed overflow-hidden" 
                style={{ 
                  display: '-webkit-box', 
                  WebkitLineClamp: 2, 
                  WebkitBoxOrient: 'vertical' 
                }}
              >
                {script.description || 'Automated setup script'}
              </p>
            </div>
            {isSelected && (
              <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}