import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Key, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SSHKeyForm } from '@/components/SSHKeys/SSHKeyForm';
import { DeleteSSHKeyDialog } from '@/components/SSHKeys/DeleteSSHKeyDialog';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UserSSHKey {
  id: string;
  name: string;
  public_key: string;
  fingerprint: string;
  linode_key_id?: string;
  digitalocean_key_id?: number;
  created_at: string;
  updated_at: string;
}

const SSHKeys: React.FC = () => {
  const { token } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<UserSSHKey | null>(null);
  const queryClient = useQueryClient();

  // Fetch SSH keys
  const {
    data: sshKeys,
    isLoading,
    error,
  } = useQuery<UserSSHKey[]>({
    queryKey: ['ssh-keys'],
    queryFn: async () => {
      const response = await fetch('/api/ssh-keys', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch SSH keys');
      }
      const data = await response.json();
      return data.keys || [];
    },
    enabled: !!token,
  });

  // Add SSH key mutation
  const addKeyMutation = useMutation({
    mutationFn: async (data: { name: string; publicKey: string }) => {
      const response = await fetch('/api/ssh-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: data.name,
          publicKey: data.publicKey,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add SSH key');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ssh-keys'] });
      setIsAddDialogOpen(false);
      
      if (data.partialSuccess) {
        toast.warning(data.message || 'SSH key added with warnings', {
          description: data.description || 'The key was added but some cloud providers could not be synchronized.',
        });
      } else {
        toast.success(data.message || 'SSH key added successfully', {
          description: data.description || 'The key has been synchronized to all cloud providers.',
        });
      }
    },
    onError: (error: any) => {
      toast.error('Failed to add SSH key', {
        description: error.message,
      });
    },
  });

  // Delete SSH key mutation
  const deleteKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const response = await fetch(`/api/ssh-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete SSH key');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ssh-keys'] });
      setKeyToDelete(null);
      
      if (data.partialSuccess) {
        toast.warning(data.message || 'SSH key deleted with warnings', {
          description: data.description || 'The key was removed but some cloud providers could not be synchronized.',
        });
      } else {
        toast.success(data.message || 'SSH key deleted successfully', {
          description: data.description || 'The key has been removed from all cloud providers.',
        });
      }
    },
    onError: (error: any) => {
      toast.error('Failed to delete SSH key', {
        description: error.message,
      });
      setKeyToDelete(null);
    },
  });

  const handleAddKey = async (data: { name: string; publicKey: string }) => {
    await addKeyMutation.mutateAsync(data);
  };

  const handleDeleteKey = async () => {
    if (keyToDelete) {
      await deleteKeyMutation.mutateAsync(keyToDelete.id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getProviderStatus = (key: UserSSHKey) => {
    const providers: Array<'linode' | 'digitalocean'> = [];
    if (key.linode_key_id) providers.push('linode');
    if (key.digitalocean_key_id) providers.push('digitalocean');
    return providers;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-96 mt-2" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">SSH Keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your SSH keys across cloud providers
          </p>
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load SSH keys. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SSH Keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your SSH keys across all cloud providers
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add SSH Key
        </Button>
      </div>

      {/* SSH Keys List */}
      <Card>
        <CardHeader>
          <CardTitle>Your SSH Keys</CardTitle>
          <CardDescription>
            SSH keys are automatically synchronized across all configured cloud providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!sshKeys || sshKeys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No SSH keys yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first SSH key to use it when creating VPS instances
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add SSH Key
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sshKeys.map((key) => {
                const providers = getProviderStatus(key);
                return (
                  <div
                    key={key.id}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Key className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <h3 className="font-medium truncate">{key.name}</h3>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p className="font-mono text-xs truncate">
                            {key.fingerprint}
                          </p>
                          <p>Added {formatDate(key.created_at)}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>Synchronized:</span>
                            <Badge variant="secondary" className="text-xs">
                              {providers.length} {providers.length === 1 ? 'Provider' : 'Providers'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setKeyToDelete(key)}
                        disabled={deleteKeyMutation.isPending}
                      >
                        {deleteKeyMutation.isPending &&
                        keyToDelete?.id === key.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Delete'
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add SSH Key Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add SSH Key</DialogTitle>
            <DialogDescription>
              Add a new SSH key that will be available when creating VPS instances across
              all cloud providers.
            </DialogDescription>
          </DialogHeader>
          <SSHKeyForm
            onSubmit={handleAddKey}
            isLoading={addKeyMutation.isPending}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete SSH Key Dialog */}
      {keyToDelete && (
        <DeleteSSHKeyDialog
          isOpen={!!keyToDelete}
          keyName={keyToDelete.name}
          providers={getProviderStatus(keyToDelete)}
          onConfirm={handleDeleteKey}
          onCancel={() => setKeyToDelete(null)}
          isLoading={deleteKeyMutation.isPending}
        />
      )}
    </div>
  );
};

export default SSHKeys;
