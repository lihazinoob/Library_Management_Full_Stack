import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import type { Category } from '@/types';
import { categoryService } from '@/lib/api';
import axios from 'axios';

const categorySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z.string().min(1, 'Slug is required'),
    description: z.string().optional().or(z.literal('')),
    is_active: z.boolean().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category?: Category | null;
    onSuccess: () => void;
}

export default function CategoryFormDialog({
    open,
    onOpenChange,
    category,
    onSuccess,
}: CategoryFormDialogProps) {
    const isEditing = !!category;
    const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({});

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<CategoryFormValues>({
        resolver: zodResolver(categorySchema),
    });

    const nameValue = watch('name');

    // Auto-generate slug from name
    useEffect(() => {
        if (!isEditing && nameValue) {
            const slug = nameValue
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
            setValue('slug', slug);
        }
    }, [nameValue, isEditing, setValue]);

    useEffect(() => {
        if (open) {
            if (category) {
                reset({
                    name: category.name,
                    slug: category.slug,
                    description: category.description || '',
                    is_active: category.is_active,
                });
            } else {
                reset({
                    name: '',
                    slug: '',
                    description: '',
                    is_active: true,
                });
            }
            setServerErrors({});
        }
    }, [open, category, reset]);

    const onSubmit = async (data: CategoryFormValues) => {
        try {
            setServerErrors({});
            const payload = {
                ...data,
                description: data.description || undefined,
            };

            if (isEditing) {
                await categoryService.update(category!.id, payload);
            } else {
                await categoryService.create(payload as Required<Pick<CategoryFormValues, 'name' | 'slug'>> & CategoryFormValues);
            }
            onSuccess();
            onOpenChange(false);
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.data?.errors) {
                setServerErrors(err.response.data.errors);
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Edit Category' : 'Add New Category'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Update the category information below.'
                            : 'Fill in the details to create a new category.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="cat-name">Name *</Label>
                        <Input id="cat-name" {...register('name')} />
                        {(errors.name || serverErrors.name) && (
                            <p className="text-xs text-destructive">
                                {errors.name?.message || serverErrors.name?.[0]}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="cat-slug">Slug *</Label>
                        <Input id="cat-slug" {...register('slug')} />
                        {(errors.slug || serverErrors.slug) && (
                            <p className="text-xs text-destructive">
                                {errors.slug?.message || serverErrors.slug?.[0]}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="cat-desc">Description</Label>
                        <Textarea id="cat-desc" rows={3} {...register('description')} />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="cat-active"
                            className="h-4 w-4 rounded border-input"
                            {...register('is_active')}
                        />
                        <Label htmlFor="cat-active" className="text-sm font-normal">
                            Active
                        </Label>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {isEditing ? 'Updating…' : 'Creating…'}
                                </>
                            ) : isEditing ? (
                                'Update Category'
                            ) : (
                                'Add Category'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
