import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { categoryService } from '@/lib/api';
import type { Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CategoryFormDialog from '@/components/categories/CategoryFormDialog';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { Plus, MoreVertical, Pencil, Trash2, FolderTree } from 'lucide-react';

export default function CategoriesPage() {
    const { isAdmin } = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    // Dialog state
    const [formOpen, setFormOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(
        null,
    );
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchCategories = async () => {
        try {
            const { data } = await categoryService.getAll();
            setCategories(data);
        } catch {
            // empty
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setFormOpen(true);
    };

    const handleDelete = async () => {
        if (!deletingCategory) return;
        setDeleteLoading(true);
        try {
            await categoryService.delete(deletingCategory.id);
            await fetchCategories();
            setDeleteOpen(false);
            setDeletingCategory(null);
        } catch {
            // empty
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleFormSuccess = () => {
        fetchCategories();
        setEditingCategory(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
                    <p className="text-muted-foreground">
                        {isAdmin
                            ? 'Manage book categories and classifications'
                            : 'Browse all book categories and classifications'}
                    </p>
                </div>
                {isAdmin && (
                    <Button
                        onClick={() => {
                            setEditingCategory(null);
                            setFormOpen(true);
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Category
                    </Button>
                )}
            </div>

            {/* Table */}
            {categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
                    <FolderTree className="h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-medium">No categories yet</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Create your first category to organize books.
                    </p>
                </div>
            ) : (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead className="hidden sm:table-cell">
                                    Description
                                </TableHead>
                                <TableHead>Status</TableHead>
                                {isAdmin && <TableHead className="w-12" />}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.map((category) => (
                                <TableRow key={category.id}>
                                    <TableCell className="font-medium">{category.name}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {category.slug}
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-muted-foreground max-w-xs truncate">
                                        {category.description || '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={category.is_active ? 'default' : 'secondary'}
                                        >
                                            {category.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    {isAdmin && (
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger
                                                    render={
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" />
                                                    }
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => handleEdit(category)}
                                                    >
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        variant="destructive"
                                                        onClick={() => {
                                                            setDeletingCategory(category);
                                                            setDeleteOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Dialogs */}
            {isAdmin && (
                <>
                    <CategoryFormDialog
                        open={formOpen}
                        onOpenChange={setFormOpen}
                        category={editingCategory}
                        onSuccess={handleFormSuccess}
                    />

                    <DeleteConfirmDialog
                        open={deleteOpen}
                        onOpenChange={setDeleteOpen}
                        title="Delete Category"
                        description={`Are you sure you want to delete "${deletingCategory?.name}"? This action cannot be undone.`}
                        onConfirm={handleDelete}
                        isLoading={deleteLoading}
                    />
                </>
            )}
        </div>
    );
}
