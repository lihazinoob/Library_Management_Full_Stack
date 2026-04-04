import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    BookOpen,
    CalendarDays,
    FolderTree,
    Library,
    Sparkles,
} from 'lucide-react';
import { categoryService } from '@/lib/api';
import type { CategoryDetails } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const statusLabelMap = {
    available: 'Available',
    out_of_stock: 'Out of Stock',
    inactive: 'Inactive',
} as const;

export default function CategoryDetailsPage() {
    const { categoryId } = useParams();
    const navigate = useNavigate();
    const [category, setCategory] = useState<CategoryDetails | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategory = async () => {
            if (!categoryId) {
                setCategory(null);
                setLoading(false);
                return;
            }

            try {
                const { data } = await categoryService.getById(categoryId);
                setCategory(data);
            } catch {
                setCategory(null);
            } finally {
                setLoading(false);
            }
        };

        fetchCategory();
    }, [categoryId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!category) {
        return (
            <div className="space-y-6">
                <Button variant="outline" onClick={() => navigate('/categories')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Categories
                </Button>

                <div className="rounded-2xl border border-dashed py-16 text-center">
                    <FolderTree className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h2 className="mt-4 text-xl font-semibold">Category not found</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        The selected category could not be loaded.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>

            <div className="rounded-3xl border bg-gradient-to-r from-amber-50 via-white to-emerald-50 p-6 lg:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={category.is_active ? 'default' : 'secondary'}>
                                {category.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge variant="outline">{category.slug}</Badge>
                        </div>

                        <div>
                            <h2 className="text-3xl font-semibold tracking-tight">
                                {category.name}
                            </h2>
                            <p className="mt-2 text-base text-muted-foreground">
                                {category.description ||
                                    'No category description has been added yet.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                        <FolderTree className="h-10 w-10" />
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border bg-card p-5">
                    <div className="flex items-center gap-3">
                        <Library className="h-5 w-5 text-primary" />
                        <div>
                            <p className="text-sm font-medium">Books In Category</p>
                            <p className="text-sm text-muted-foreground">
                                {category.books_count} book{category.books_count !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border bg-card p-5">
                    <div className="flex items-center gap-3">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <div>
                            <p className="text-sm font-medium">Status</p>
                            <p className="text-sm text-muted-foreground">
                                {category.is_active ? 'Visible to readers' : 'Hidden from readers'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border bg-card p-5">
                    <div className="flex items-center gap-3">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        <div>
                            <p className="text-sm font-medium">Last Updated</p>
                            <p className="text-sm text-muted-foreground">
                                {new Date(category.updated_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border bg-card p-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold">Books in This Category</h3>
                        <p className="text-sm text-muted-foreground">
                            Detailed catalog view for administrators.
                        </p>
                    </div>
                    <Link
                        to={`/books?category=${encodeURIComponent(category.slug)}`}
                        className="text-sm font-medium text-primary hover:underline"
                    >
                        Open filtered books view
                    </Link>
                </div>

                {category.books.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed py-12 text-center">
                        <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50" />
                        <p className="mt-3 text-sm text-muted-foreground">
                            No books are currently assigned to this category.
                        </p>
                    </div>
                ) : (
                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {category.books.map((book) => (
                            <Link
                                key={book.id}
                                to={`/books/${book.id}`}
                                className="rounded-2xl border p-5 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <Badge variant="outline">
                                        {statusLabelMap[book.status] ?? book.status}
                                    </Badge>
                                    <BookOpen className="h-5 w-5 text-primary" />
                                </div>

                                <div className="mt-4 space-y-2">
                                    <h4 className="font-semibold leading-tight">{book.title}</h4>
                                    <p className="text-sm text-muted-foreground">{book.author}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {book.available_copies}/{book.total_copies} copies available
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
