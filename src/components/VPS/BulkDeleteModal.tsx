import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle } from 'lucide-react';

interface VpsInstance {
  id: number;
  label: string;
  status: string;
}

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
  selectedInstances: VpsInstance[];
  isLoading?: boolean;
}

export const BulkDeleteModal: React.FC<BulkDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedInstances,
  isLoading = false,
}) => {
  const [password, setPassword] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setPasswordError('Password is required');
      return;
    }
    
    if (!isConfirmed) {
      return;
    }

    try {
      await onConfirm(password);
      handleClose();
    } catch (error) {
      setPasswordError('Invalid password');
    }
  };

  const handleClose = () => {
    setPassword('');
    setIsConfirmed(false);
    setPasswordError('');
    onClose();
  };

  const serverCount = selectedInstances.length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete {serverCount} Server{serverCount > 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the following server{serverCount > 1 ? 's' : ''}:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Server List */}
          <div className="max-h-32 overflow-y-auto rounded-md border p-3">
            <ul className="space-y-1">
              {selectedInstances.map((instance) => (
                <li key={instance.id} className="text-sm">
                  • {instance.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Password Input */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">
                Enter your password to confirm deletion
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Your password"
                className={passwordError ? 'border-destructive' : ''}
                disabled={isLoading}
              />
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
            </div>

            {/* Confirmation Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirm"
                checked={isConfirmed}
                onCheckedChange={setIsConfirmed}
                disabled={isLoading}
              />
              <Label
                htmlFor="confirm"
                className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I understand that this action cannot be undone
              </Label>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={!password.trim() || !isConfirmed || isLoading}
              >
                {isLoading ? 'Deleting...' : `Delete ${serverCount} Server${serverCount > 1 ? 's' : ''}`}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};