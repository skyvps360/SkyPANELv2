import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Eye, EyeOff, Key, Shield, Globe, Network as NetworkIcon, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CreateVPSForm } from '@/types/vps';
import { getUserFriendlyErrorMessage } from '@/lib/providerErrors';

interface SSHKey {
  id: number;
  name: string;
  fingerprint: string;
  public_key: string;
}

interface VPC {
  id: string;
  name: string;
  region: string;
  ip_range: string;
}

interface DigitalOceanConfigurationProps {
  formData: Partial<CreateVPSForm>;
  onChange: (updates: Partial<CreateVPSForm>) => void;
  token: string;
  region?: string; // Current selected region to filter VPCs
}

export default function DigitalOceanConfiguration({
  formData,
  onChange,
  token,
  region
}: DigitalOceanConfigurationProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [sshKeys, setSshKeys] = useState<SSHKey[]>([]);
  const [vpcs, setVpcs] = useState<VPC[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [loadingVpcs, setLoadingVpcs] = useState(false);
  const [keysError, setKeysError] = useState<any>(null);
  const [vpcsError, setVpcsError] = useState<any>(null);
  const [passwordError, setPasswordError] = useState<string>('');

  // Fetch SSH keys on mount
  useEffect(() => {
    const fetchSSHKeys = async () => {
      try {
        setLoadingKeys(true);
        setKeysError(null);
        const response = await fetch('/api/vps/digitalocean/ssh-keys', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw data.error || { message: 'Failed to fetch SSH keys' };
        }

        setSshKeys(data.ssh_keys || []);
      } catch (err: any) {
        console.error('Failed to fetch SSH keys:', err);
        setKeysError(err);
        // Don't show toast for SSH keys as they're optional
      } finally {
        setLoadingKeys(false);
      }
    };

    fetchSSHKeys();
  }, [token]);

  // Fetch VPCs when region changes
  useEffect(() => {
    if (!region) return;

    const fetchVPCs = async () => {
      try {
        setLoadingVpcs(true);
        setVpcsError(null);
        const response = await fetch(`/api/vps/digitalocean/vpcs?region=${region}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw data.error || { message: 'Failed to fetch VPCs' };
        }

        setVpcs(data.vpcs || []);
      } catch (err: any) {
        console.error('Failed to fetch VPCs:', err);
        setVpcsError(err);
        // Don't show toast for VPCs as they're optional
      } finally {
        setLoadingVpcs(false);
      }
    };

    fetchVPCs();
  }, [token, region]);

  // Validate password strength
  const validatePassword = (password: string): string => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return '';
  };

  const handlePasswordChange = (password: string) => {
    onChange({ rootPassword: password });
    const error = validatePassword(password);
    setPasswordError(error);
  };

  const handleSSHKeyToggle = (keyId: number) => {
    const currentKeys = formData.sshKeys || [];
    const keyIdStr = String(keyId);
    
    if (currentKeys.includes(keyIdStr)) {
      onChange({ sshKeys: currentKeys.filter(k => k !== keyIdStr) });
    } else {
      onChange({ sshKeys: [...currentKeys, keyIdStr] });
    }
  };

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (!password) return { strength: 0, label: 'None', color: 'bg-gray-300' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength: 33, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 4) return { strength: 66, label: 'Medium', color: 'bg-yellow-500' };
    return { strength: 100, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(formData.rootPassword || '');

  return (
    <div className="space-y-6">
      {/* Root Password - Required */}
      <div className="space-y-2">
        <Label htmlFor="root-password" className="text-sm font-medium text-foreground">
          Root Password *
        </Label>
        <div className="relative">
          <Input
            id="root-password"
            type={showPassword ? 'text' : 'password'}
            value={formData.rootPassword || ''}
            onChange={(e) => handlePasswordChange(e.target.value)}
            placeholder="Enter a strong password"
            className={cn(
              "pr-10",
              passwordError && formData.rootPassword ? 'border-destructive' : ''
            )}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        
        {/* Password strength indicator */}
        {formData.rootPassword && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Password strength:</span>
              <span className={cn(
                "font-medium",
                passwordStrength.label === 'Weak' && 'text-red-500',
                passwordStrength.label === 'Medium' && 'text-yellow-500',
                passwordStrength.label === 'Strong' && 'text-green-500'
              )}>
                {passwordStrength.label}
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn("h-full transition-all duration-300", passwordStrength.color)}
                style={{ width: `${passwordStrength.strength}%` }}
              />
            </div>
          </div>
        )}
        
        {passwordError && formData.rootPassword && (
          <p className="text-xs text-destructive">{passwordError}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Must be at least 8 characters with uppercase, lowercase, and numbers
        </p>
      </div>

      {/* SSH Keys - Optional */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium text-foreground">
            SSH Keys (Optional)
          </Label>
        </div>
        
        {loadingKeys ? (
          <div className="flex items-center justify-center py-4 space-x-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading SSH keys...</span>
          </div>
        ) : keysError ? (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {getUserFriendlyErrorMessage(keysError, 'digitalocean')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  SSH keys are optional. You can continue without them.
                </p>
              </div>
            </div>
          </div>
        ) : sshKeys.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No SSH keys found. You can add SSH keys in your DigitalOcean account.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sshKeys.map(key => {
              const isSelected = (formData.sshKeys || []).includes(String(key.id));
              
              return (
                <div
                  key={key.id}
                  onClick={() => handleSSHKeyToggle(key.id)}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    isSelected
                      ? 'border-primary bg-primary/10 dark:bg-primary/20'
                      : 'border hover:border-input dark:hover:border-gray-500'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // Handled by div onClick
                    className="mt-0.5 h-4 w-4 text-primary focus:ring-primary border rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {key.name}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {key.fingerprint}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DigitalOcean-specific options */}
      <div className="space-y-4 pt-2 border-t">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Additional Options
        </h4>

        {/* Backups */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={formData.backups || false}
            onChange={(e) => onChange({ backups: e.target.checked })}
            className="mt-0.5 h-4 w-4 text-primary focus:ring-primary border rounded"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              Enable Backups
            </p>
            <p className="text-xs text-muted-foreground">
              Automatic weekly backups of your Droplet (+20% of Droplet cost)
            </p>
          </div>
        </label>

        {/* Monitoring */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={formData.monitoring || false}
            onChange={(e) => onChange({ monitoring: e.target.checked })}
            className="mt-0.5 h-4 w-4 text-primary focus:ring-primary border rounded"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              Enable Monitoring
            </p>
            <p className="text-xs text-muted-foreground">
              Free detailed graphs and alerting for CPU, bandwidth, and disk usage
            </p>
          </div>
        </label>

        {/* IPv6 */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={formData.ipv6 || false}
            onChange={(e) => onChange({ ipv6: e.target.checked })}
            className="mt-0.5 h-4 w-4 text-primary focus:ring-primary border rounded"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                Enable IPv6
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Assign an IPv6 address to your Droplet (free)
            </p>
          </div>
        </label>

        {/* VPC */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <NetworkIcon className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="vpc-select" className="text-sm font-medium text-foreground">
              VPC Network (Optional)
            </Label>
          </div>
          
          {loadingVpcs ? (
            <div className="flex items-center justify-center py-4 space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading VPCs...</span>
            </div>
          ) : vpcsError ? (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {getUserFriendlyErrorMessage(vpcsError, 'digitalocean')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Default VPC will be used automatically.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <select
              id="vpc-select"
              value={formData.vpc_uuid || ''}
              onChange={(e) => onChange({ vpc_uuid: e.target.value || undefined })}
              className="w-full px-4 py-3 min-h-[48px] border rounded-md bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-base"
              disabled={!region}
            >
              <option value="">Default VPC (Automatic)</option>
              {vpcs.map(vpc => (
                <option key={vpc.id} value={vpc.id}>
                  {vpc.name} ({vpc.ip_range})
                </option>
              ))}
            </select>
          )}
          
          {!region && !vpcsError && (
            <p className="text-xs text-muted-foreground">
              Select a region first to see available VPCs
            </p>
          )}
          
          {region && vpcs.length === 0 && !loadingVpcs && !vpcsError && (
            <p className="text-xs text-muted-foreground">
              No custom VPCs found in this region. Default VPC will be used.
            </p>
          )}
        </div>
      </div>

      {/* Configuration summary */}
      <div className="rounded-lg bg-muted p-4 space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Configuration Summary</h4>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Root Password:</span>
            <span className="font-medium text-foreground">
              {formData.rootPassword ? '••••••••' : 'Not set'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>SSH Keys:</span>
            <span className="font-medium text-foreground">
              {(formData.sshKeys || []).length} selected
            </span>
          </div>
          <div className="flex justify-between">
            <span>Backups:</span>
            <span className="font-medium text-foreground">
              {formData.backups ? 'Enabled (+20%)' : 'Disabled'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Monitoring:</span>
            <span className="font-medium text-foreground">
              {formData.monitoring ? 'Enabled (Free)' : 'Disabled'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>IPv6:</span>
            <span className="font-medium text-foreground">
              {formData.ipv6 ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          {formData.vpc_uuid && (
            <div className="flex justify-between">
              <span>VPC:</span>
              <span className="font-medium text-foreground">
                {vpcs.find(v => v.id === formData.vpc_uuid)?.name || 'Custom VPC'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
