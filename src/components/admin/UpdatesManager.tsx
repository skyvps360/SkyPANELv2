import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, GripVertical, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { buildApiUrl } from '@/lib/api';
import type { FAQUpdate } from '@/types/faq';

const updateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title must be less than 500 characters'),
  description: z.string().min(1, 'Description is required').max(2000, 'Description must be less than 2000 characters'),
  published_date: z.string().min(1, 'Published date is required'),
  is_active: z.boolean(),
});

interface UpdatesManagerProps {
  token: string;
}

interface SortableRowProps {
  update: FAQUpdate;
  onEdit: (update: FAQUpdate) => void;
  onDelete: (update: FAQUpdate) => void;
  onToggleActive: (update: FAQUpdate) => void;
  formatDate: (dateString: string) => string;
}

const SortableRow: React.FC<SortableRowProps> = ({ update, onEdit, onDelete, onToggleActive, formatDate }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: update.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <div {...attributes} {...listeners} className="cursor-move">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="font-medium">{update.title}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {update.description}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {formatDate(update.published_date)}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch
            checked={update.is_active}
            onCheckedChange={() => onToggleActive(update)}
          />
          <span className="text-xs text-muted-foreground">
            {update.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(update)}
            className="gap-1"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(update)}
            className="gap-1"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

type UpdateFormData = z.infer<typeof updateSchema>;

export const UpdatesManager: React.FC<UpdatesManagerProps> = ({ token }) => {
  const [updates, setUpdates] = useState<FAQUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState<FAQUpdate | null>(null);

  const createForm = useForm<UpdateFormData>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      title: '',
      description: '',
      published_date: new Date().toISOString().split('T')[0],
      is_active: true,
    },
  });

  const editForm = useForm<UpdateFormData>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      title: '',
      description: '',
      published_date: new Date().toISOString().split('T')[0],
      is_active: true,
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchUpdates = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/admin/faq/updates'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load updates');
      setUpdates(data.updates || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load updates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleCreate = async (data: UpdateFormData) => {
    setSubmitting(true);
    try {
      const res = await fetch(buildApiUrl('/api/admin/faq/updates'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.error || 'Failed to create update');
      
      setUpdates(prev => [...prev, responseData.update]);
      setShowCreateDialog(false);
      createForm.reset({
        title: '',
        description: '',
        published_date: new Date().toISOString().split('T')[0],
        is_active: true,
      });
      toast.success('Update created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (data: UpdateFormData) => {
    if (!selectedUpdate) return;

    setSubmitting(true);
    try {
      const res = await fetch(buildApiUrl(`/api/admin/faq/updates/${selectedUpdate.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.error || 'Failed to update');
      
      setUpdates(prev => prev.map(upd => upd.id === selectedUpdate.id ? responseData.update : upd));
      setShowEditDialog(false);
      setSelectedUpdate(null);
      editForm.reset();
      toast.success('Update updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUpdate) return;

    setSubmitting(true);
    try {
      const res = await fetch(buildApiUrl(`/api/admin/faq/updates/${selectedUpdate.id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete update');
      }
      
      setUpdates(prev => prev.filter(upd => upd.id !== selectedUpdate.id));
      setShowDeleteDialog(false);
      setSelectedUpdate(null);
      toast.success('Update deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (update: FAQUpdate) => {
    try {
      const res = await fetch(buildApiUrl(`/api/admin/faq/updates/${update.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !update.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      
      setUpdates(prev => prev.map(upd => upd.id === update.id ? data.update : upd));
      toast.success(`Update ${!update.is_active ? 'activated' : 'deactivated'}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update');
    }
  };

  const openEditDialog = (update: FAQUpdate) => {
    setSelectedUpdate(update);
    editForm.reset({
      title: update.title,
      description: update.description,
      published_date: new Date(update.published_date).toISOString().split('T')[0],
      is_active: update.is_active,
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (update: FAQUpdate) => {
    setSelectedUpdate(update);
    setShowDeleteDialog(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = updates.findIndex((upd) => upd.id === active.id);
    const newIndex = updates.findIndex((upd) => upd.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Optimistically update the UI
    const newUpdates = arrayMove(updates, oldIndex, newIndex);
    setUpdates(newUpdates);

    // Prepare reorder data
    const reorderData = newUpdates.map((upd, index) => ({
      id: upd.id,
      display_order: index,
    }));

    try {
      const res = await fetch(buildApiUrl('/api/admin/faq/updates/reorder'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ updates: reorderData }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reorder updates');
      }

      toast.success('Updates reordered successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reorder updates');
      // Revert on error
      fetchUpdates();
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
          <div>
            <CardTitle className="text-lg font-semibold">Latest Updates</CardTitle>
            <CardDescription>Manage platform updates and announcements</CardDescription>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Update
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">Loading updates...</div>
          ) : updates.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No updates yet. Create your first update to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="min-w-[250px]">Title</TableHead>
                      <TableHead className="min-w-[300px]">Description</TableHead>
                      <TableHead className="w-32">Date</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-32 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={updates.map((upd) => upd.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {updates.map((update) => (
                        <SortableRow
                          key={update.id}
                          update={update}
                          onEdit={openEditDialog}
                          onDelete={openDeleteDialog}
                          onToggleActive={handleToggleActive}
                          formatDate={formatDate}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) createForm.reset({
          title: '',
          description: '',
          published_date: new Date().toISOString().split('T')[0],
          is_active: true,
        });
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Update</DialogTitle>
            <DialogDescription>
              Add a new platform update or announcement.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  {...createForm.register('title')}
                  placeholder="e.g., New API endpoints for theme controls"
                  disabled={submitting}
                />
                {createForm.formState.errors.title && (
                  <p className="text-sm text-destructive">{createForm.formState.errors.title.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  {...createForm.register('description')}
                  placeholder="Describe the update or announcement"
                  rows={4}
                  disabled={submitting}
                />
                {createForm.formState.errors.description && (
                  <p className="text-sm text-destructive">{createForm.formState.errors.description.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="published_date">Published Date *</Label>
                <Input
                  id="published_date"
                  type="date"
                  {...createForm.register('published_date')}
                  disabled={submitting}
                />
                {createForm.formState.errors.published_date && (
                  <p className="text-sm text-destructive">{createForm.formState.errors.published_date.message}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={createForm.watch('is_active')}
                  onCheckedChange={(checked) => createForm.setValue('is_active', checked)}
                  disabled={submitting}
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Active (visible on public FAQ page)
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setShowCreateDialog(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Update'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) {
          setSelectedUpdate(null);
          editForm.reset();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Update</DialogTitle>
            <DialogDescription>
              Update the announcement details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  {...editForm.register('title')}
                  placeholder="e.g., New API endpoints for theme controls"
                  disabled={submitting}
                />
                {editForm.formState.errors.title && (
                  <p className="text-sm text-destructive">{editForm.formState.errors.title.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description *</Label>
                <Textarea
                  id="edit-description"
                  {...editForm.register('description')}
                  placeholder="Describe the update or announcement"
                  rows={4}
                  disabled={submitting}
                />
                {editForm.formState.errors.description && (
                  <p className="text-sm text-destructive">{editForm.formState.errors.description.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-published_date">Published Date *</Label>
                <Input
                  id="edit-published_date"
                  type="date"
                  {...editForm.register('published_date')}
                  disabled={submitting}
                />
                {editForm.formState.errors.published_date && (
                  <p className="text-sm text-destructive">{editForm.formState.errors.published_date.message}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="edit-is_active"
                  checked={editForm.watch('is_active')}
                  onCheckedChange={(checked) => editForm.setValue('is_active', checked)}
                  disabled={submitting}
                />
                <Label htmlFor="edit-is_active" className="cursor-pointer">
                  Active (visible on public FAQ page)
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setShowEditDialog(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Update</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedUpdate?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
