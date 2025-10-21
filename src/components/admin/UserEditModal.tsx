import React, { useEffect, useState } from 'react';
import { User, Mail, Shield, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ErrorBoundary } from './ErrorBoundary';
import { cn } from '@/lib/utils';

interface AdminUserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  updated_at: string;
  status?: 'active' | 'inactive' | 'suspended';
  organizations: Array<{
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    role: string;
  }>;
}

interface UserUpdateData {
  name?: string;
  email?: string;
  role?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

interface UserEditModalProps {
  user: AdminUserRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, updates: UserUpdateData) => Promise<void>;
  isSaving?: boolean;
}

interface FormData {
  name: string;
  email: string;
  role: string;
  status: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  general?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: FormErrors;
}

const validateEmail = (email: string): string | undefined => {
  if (!email || !email.trim()) {
    return 'Email is required';
  }
  
  const trimmedEmail = email.trim();
  
  // Check length constraints
  if (trimmedEmail.length > 254) {
    return 'Email address is too long (maximum 254 characters)';
  }
  
  // Enhanced email regex with better validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(trimmedEmail)) {
    return 'Please enter a valid email address';
  }
  
  // Check for common typos
  const commonDomainTypos = {
    'gmail.co': 'gmail.com',
    'yahoo.co': 'yahoo.com',
    'hotmail.co': 'hotmail.com',
    'outlook.co': 'outlook.com'
  };
  
  const domain = trimmedEmail.split('@')[1];
  if (domain && commonDomainTypos[domain as keyof typeof commonDomainTypos]) {
    return `Did you mean ${trimmedEmail.replace(domain, commonDomainTypos[domain as keyof typeof commonDomainTypos])}?`;
  }
  
  return undefined;
};

const validateName = (name: string): string | undefined => {
  if (!name || !name.trim()) {
    return 'Name is required';
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length < 2) {
    return 'Name must be at least 2 characters long';
  }
  
  if (trimmedName.length > 100) {
    return 'Name is too long (maximum 100 characters)';
  }
  
  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s\-'.]+$/;
  if (!nameRegex.test(trimmedName)) {
    return 'Name can only contain letters, spaces, hyphens, and apostrophes';
  }
  
  // Check for excessive spaces or special characters
  if (trimmedName.includes('  ') || trimmedName.startsWith('-') || trimmedName.endsWith('-')) {
    return 'Name format is invalid';
  }
  
  return undefined;
};

const validateRole = (role: string): string | undefined => {
  if (!role || !role.trim()) {
    return 'Role is required';
  }
  
  const validRoles = ['admin', 'user'];
  const normalizedRole = role.toLowerCase().trim();
  
  if (!validRoles.includes(normalizedRole)) {
    return 'Role must be either admin or user';
  }
  
  return undefined;
};

const validateStatus = (status: string): string | undefined => {
  if (!status || !status.trim()) {
    return 'Status is required';
  }
  
  const validStatuses = ['active', 'inactive', 'suspended'];
  const normalizedStatus = status.toLowerCase().trim();
  
  if (!validStatuses.includes(normalizedStatus)) {
    return 'Status must be active, inactive, or suspended';
  }
  
  return undefined;
};

// Comprehensive form validation
const validateForm = (formData: FormData): ValidationResult => {
  const errors: FormErrors = {};
  
  const nameError = validateName(formData.name);
  if (nameError) errors.name = nameError;
  
  const emailError = validateEmail(formData.email);
  if (emailError) errors.email = emailError;
  
  const roleError = validateRole(formData.role);
  if (roleError) errors.role = roleError;
  
  const statusError = validateStatus(formData.status);
  if (statusError) errors.status = statusError;
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const UserEditModal: React.FC<UserEditModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
  isSaving = false,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    role: '',
    status: 'active',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      const initialData = {
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'user',
        status: user.status || 'active',
      };
      setFormData(initialData);
      setErrors({});
      setHasChanges(false);
    }
  }, [user]);

  // Track changes
  useEffect(() => {
    if (!user) return;
    
    const hasFormChanges = 
      formData.name !== (user.name || '') ||
      formData.email !== (user.email || '') ||
      formData.role !== (user.role || 'user') ||
      formData.status !== (user.status || 'active');
    
    setHasChanges(hasFormChanges);
  }, [formData, user]);

  // Debounced validation for real-time feedback
  const debouncedValidation = React.useCallback((data: FormData) => {
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }
    
    const timeout = setTimeout(() => {
      setIsValidating(true);
      const validation = validateForm(data);
      setErrors(validation.errors);
      setIsValidating(false);
    }, 300);
    
    setValidationTimeout(timeout);
  }, [validationTimeout]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
    };
  }, [validationTimeout]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Trigger debounced validation for real-time feedback
    debouncedValidation(newFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setErrors({ general: 'User data is not available' });
      return;
    }

    // Perform final validation
    const validation = validateForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setErrors(prev => ({ ...prev, general: undefined }));
      
      const updates: UserUpdateData = {};
      
      // Sanitize and prepare updates
      if (formData.name.trim() !== user.name) {
        updates.name = formData.name.trim();
      }
      if (formData.email.trim().toLowerCase() !== user.email.toLowerCase()) {
        updates.email = formData.email.trim().toLowerCase();
      }
      if (formData.role !== user.role) {
        updates.role = formData.role;
      }
      if (formData.status !== (user.status || 'active')) {
        updates.status = formData.status as 'active' | 'inactive' | 'suspended';
      }

      // Only proceed if there are actual changes
      if (Object.keys(updates).length === 0) {
        onClose();
        return;
      }

      await onSave(user.id, updates);
      onClose();
    } catch (error: any) {
      console.error('User update error:', error);
      
      // Handle specific error types
      let errorMessage = 'Failed to update user';
      
      if (error.message?.includes('email')) {
        errorMessage = 'Email address is already in use or invalid';
      } else if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
        errorMessage = 'You do not have permission to perform this action';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setErrors(prev => ({ 
        ...prev, 
        general: errorMessage
      }));
    }
  };

  const handleClose = () => {
    if (hasChanges && !isSaving) {
      const confirmClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close without saving?'
      );
      if (!confirmClose) return;
    }
    onClose();
  };

  if (!user) {
    return null;
  }

  const roleBadgeClass = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400';
      case 'user':
        return 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400';
      default:
        return 'border-slate-400/30 bg-slate-400/10 text-slate-600 dark:text-slate-400';
    }
  };

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'suspended':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "max-w-md animate-in fade-in-0 zoom-in-95 duration-200",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
      )}>
        <ErrorBoundary
          fallback={
            <div className="p-6 text-center animate-in fade-in-0 duration-300">
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load the user edit form. Please try closing and reopening the modal.
                </AlertDescription>
              </Alert>
              <Button variant="outline" onClick={handleClose} className="transition-all duration-200 hover:scale-105">
                Close
              </Button>
            </div>
          }
        >
          <DialogHeader className="pb-4 border-b border-border/50">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold animate-in slide-in-from-left-2 duration-300">
              <User className="h-5 w-5 text-muted-foreground" />
              Edit User
            </DialogTitle>
          </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-400">
          {errors.general && (
            <Alert variant="destructive" className="animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 animate-in slide-in-from-left-2 duration-300 delay-100">
            {/* Name Field */}
            <div className="space-y-2 animate-in slide-in-from-left-2 duration-300 delay-150">
              <Label htmlFor="edit-name" className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4" />
                Name
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter user name"
                disabled={isSaving}
                className={cn(
                  'transition-all duration-200 focus:scale-[1.02]',
                  errors.name ? 'border-red-500 focus:border-red-500 animate-pulse' : '',
                  isValidating ? 'border-yellow-400' : '',
                  isSaving && 'opacity-50 cursor-not-allowed'
                )}
                aria-describedby={errors.name ? "name-error" : isValidating ? "name-validating" : undefined}
              />
              {errors.name && (
                <p id="name-error" className="text-sm text-red-600 animate-in slide-in-from-top-1 duration-200" role="alert">
                  {errors.name}
                </p>
              )}
              {isValidating && !errors.name && (
                <p id="name-validating" className="text-sm text-yellow-600 animate-in slide-in-from-top-1 duration-200 flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Validating...
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2 animate-in slide-in-from-left-2 duration-300 delay-200">
              <Label htmlFor="edit-email" className="flex items-center gap-2 text-sm font-medium">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
                disabled={isSaving}
                className={cn(
                  'transition-all duration-200 focus:scale-[1.02]',
                  errors.email ? 'border-red-500 focus:border-red-500 animate-pulse' : '',
                  isValidating ? 'border-yellow-400' : '',
                  isSaving && 'opacity-50 cursor-not-allowed'
                )}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-red-600 animate-in slide-in-from-top-1 duration-200" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Role Field */}
            <div className="space-y-2 animate-in slide-in-from-left-2 duration-300 delay-250">
              <Label htmlFor="edit-role" className="flex items-center gap-2 text-sm font-medium">
                <Shield className="h-4 w-4" />
                Role
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => handleInputChange('role', value)}
                disabled={isSaving}
              >
                <SelectTrigger 
                  id="edit-role" 
                  className={cn(
                    'transition-all duration-200 focus:scale-[1.02]',
                    errors.role ? 'border-red-500 focus:border-red-500 animate-pulse' : '',
                    isSaving && 'opacity-50 cursor-not-allowed'
                  )}
                  aria-describedby={errors.role ? "role-error" : undefined}
                >
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="animate-in fade-in-0 zoom-in-95 duration-200">
                  <SelectItem value="user" className="transition-colors duration-150 hover:bg-accent">User</SelectItem>
                  <SelectItem value="admin" className="transition-colors duration-150 hover:bg-accent">Admin</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p id="role-error" className="text-sm text-red-600 animate-in slide-in-from-top-1 duration-200" role="alert">
                  {errors.role}
                </p>
              )}
              <div className="flex items-center gap-2 animate-in fade-in-0 duration-300 delay-300">
                <span className="text-sm text-muted-foreground">Current:</span>
                <Badge variant="outline" className={cn(roleBadgeClass(user.role), "transition-all duration-200")}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
              </div>
            </div>

            {/* Status Field */}
            <div className="space-y-2 animate-in slide-in-from-left-2 duration-300 delay-300">
              <Label htmlFor="edit-status" className="text-sm font-medium">Account Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
                disabled={isSaving}
              >
                <SelectTrigger 
                  id="edit-status" 
                  className={cn(
                    'transition-all duration-200 focus:scale-[1.02]',
                    errors.status ? 'border-red-500 focus:border-red-500 animate-pulse' : '',
                    isSaving && 'opacity-50 cursor-not-allowed'
                  )}
                  aria-describedby={errors.status ? "status-error" : undefined}
                >
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="animate-in fade-in-0 zoom-in-95 duration-200">
                  <SelectItem value="active" className="transition-colors duration-150 hover:bg-accent">Active</SelectItem>
                  <SelectItem value="inactive" className="transition-colors duration-150 hover:bg-accent">Inactive</SelectItem>
                  <SelectItem value="suspended" className="transition-colors duration-150 hover:bg-accent">Suspended</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p id="status-error" className="text-sm text-red-600 animate-in slide-in-from-top-1 duration-200" role="alert">
                  {errors.status}
                </p>
              )}
              <div className="flex items-center gap-2 animate-in fade-in-0 duration-300 delay-350">
                <span className="text-sm text-muted-foreground">Current:</span>
                <Badge variant={statusBadgeVariant(user.status || 'active')} className="transition-all duration-200">
                  {(user.status || 'active').charAt(0).toUpperCase() + (user.status || 'active').slice(1)}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-4 border-t border-border/50 animate-in slide-in-from-bottom-2 duration-300 delay-400">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
              className={cn(
                "transition-all duration-200 hover:scale-105",
                "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                isSaving && "opacity-50 cursor-not-allowed hover:scale-100"
              )}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!hasChanges || isSaving || isValidating}
              className={cn(
                'gap-2 transition-all duration-200 hover:scale-105',
                'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                hasChanges && !isSaving && !isValidating 
                  ? 'bg-green-600 hover:bg-green-700 shadow-lg' 
                  : '',
                (!hasChanges || isSaving || isValidating) && 'hover:scale-100'
              )}
              aria-describedby={
                isSaving ? "saving-status" : 
                isValidating ? "validating-status" : 
                !hasChanges ? "no-changes-status" : undefined
              }
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isValidating && <Loader2 className="h-4 w-4 animate-spin" />}
              {!hasChanges && <CheckCircle className="h-4 w-4" />}
              <span>
                {isSaving 
                  ? 'Saving...' 
                  : isValidating 
                    ? 'Validating...'
                    : hasChanges 
                      ? 'Save Changes' 
                      : 'No Changes'
                }
              </span>
              {isSaving && (
                <span id="saving-status" className="sr-only">
                  Saving user changes, please wait
                </span>
              )}
              {isValidating && (
                <span id="validating-status" className="sr-only">
                  Validating form data, please wait
                </span>
              )}
              {!hasChanges && (
                <span id="no-changes-status" className="sr-only">
                  No changes to save
                </span>
              )}
            </Button>
          </DialogFooter>
        </form>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  );
};