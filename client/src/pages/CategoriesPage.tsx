import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { bookService, categoryService } from '@/lib/api';
import type { Book, Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
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
    const [books, setBooks] = useState<Book[]>([]);
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
            const [categoriesResponse, booksResponse] = await Promise.all([
                categoryService.getAll(),
                bookService.getAll(),
            ]);
            setCategories(categoriesResponse.data);
            setBooks(booksResponse.data);
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

    const bookCountsByCategory = useMemo(() => {
        return books.reduce<Record<number, number>>((counts, book) => {
            counts[book.category_id] = (counts[book.category_id] ?? 0) + 1;
            return counts;
        }, {});
    }, [books]);

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
                            : 'Explore the library through curated categories.'}
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
                        {isAdmin
                            ? 'Create your first category to organize books.'
                            : 'Categories will appear here once the library is organized.'}
                    </p>
                </div>
            ) : isAdmin ? (
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
            ) : (
                <div className="space-y-6">
                    <div className="rounded-2xl border bg-gradient-to-r from-emerald-50 via-white to-amber-50 p-6">
                        <div className="max-w-2xl space-y-2">
                            <p className="text-sm font-medium text-emerald-700">
                                Library explorer
                            </p>
                            <h3 className="text-2xl font-semibold tracking-tight">
                                Find your next read by browsing categories
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Start with a topic that interests you, then explore the
                                books collected under it.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {categories.map((category) => (
                            <Link
                                key={category.id}
                                to={`/books?category=${encodeURIComponent(category.slug)}`}
                                className="group rounded-2xl border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <FolderTree className="h-5 w-5" />
                                    </div>
                                    <Badge
                                        variant={category.is_active ? 'default' : 'secondary'}
                                    >
                                        {category.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>

                                <div className="mt-5 space-y-3">
                                    <div>
                                        <h3 className="text-lg font-semibold tracking-tight">
                                            {category.name}
                                        </h3>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {category.description ||
                                                'Browse books grouped under this category.'}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span className="rounded-full bg-muted px-2.5 py-1">
                                            {bookCountsByCategory[category.id] ?? 0} book
                                            {(bookCountsByCategory[category.id] ?? 0) !== 1 ? 's' : ''}
                                        </span>
                                        <span className="font-medium text-primary transition-transform group-hover:translate-x-1">
                                            Explore books
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
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
