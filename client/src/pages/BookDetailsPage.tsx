import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, CalendarDays, Library, MapPin, Tag } from 'lucide-react';
import { bookService } from '@/lib/api';
import type { Book } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const statusConfig: Record<
    string,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
    available: { label: 'Available', variant: 'default' },
    out_of_stock: { label: 'Out of Stock', variant: 'secondary' },
    inactive: { label: 'Inactive', variant: 'outline' },
};

export default function BookDetailsPage() {
    const { bookId } = useParams();
    const navigate = useNavigate();
    const [book, setBook] = useState<Book | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBook = async () => {
            if (!bookId) {
                setBook(null);
                setLoading(false);
                return;
            }

            try {
                const { data } = await bookService.getById(bookId);
                setBook(data);
            } catch {
                setBook(null);
            } finally {
                setLoading(false);
            }
        };

        fetchBook();
    }, [bookId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!book) {
        return (
            <div className="space-y-6">
                <Button variant="outline" onClick={() => navigate('/books')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Books
                </Button>

                <div className="rounded-2xl border border-dashed py-16 text-center">
                    <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h2 className="mt-4 text-xl font-semibold">Book not found</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        The selected book could not be loaded from the library catalog.
                    </p>
                </div>
            </div>
        );
    }

    const status = statusConfig[book.status] || statusConfig.available;

    return (
        <div className="space-y-6">
            <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>

            <div className="rounded-3xl border bg-gradient-to-r from-sky-50 via-white to-emerald-50 p-6 lg:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={status.variant}>{status.label}</Badge>
                            {book.category && (
                                <Link to={`/books?category=${encodeURIComponent(book.category.slug)}`}>
                                    <Badge variant="outline">{book.category.name}</Badge>
                                </Link>
                            )}
                        </div>

                        <div>
                            <h2 className="text-3xl font-semibold tracking-tight">{book.title}</h2>
                            <p className="mt-2 text-base text-muted-foreground">
                                by {book.author}
                            </p>
                        </div>

                        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                            {book.description ||
                                'No detailed description has been added for this title yet.'}
                        </p>
                    </div>

                    <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                        <Library className="h-10 w-10" />
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border bg-card p-5">
                    <div className="flex items-center gap-3">
                        <Tag className="h-5 w-5 text-primary" />
                        <div>
                            <p className="text-sm font-medium">Category</p>
                            <p className="text-sm text-muted-foreground">
                                {book.category?.name || 'Uncategorized'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border bg-card p-5">
                    <div className="flex items-center gap-3">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <div>
                            <p className="text-sm font-medium">Availability</p>
                            <p className="text-sm text-muted-foreground">
                                {book.available_copies}/{book.total_copies} copies available
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border bg-card p-5">
                    <div className="flex items-center gap-3">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        <div>
                            <p className="text-sm font-medium">Publication Year</p>
                            <p className="text-sm text-muted-foreground">
                                {book.publication_year || 'Not specified'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border bg-card p-5">
                    <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-primary" />
                        <div>
                            <p className="text-sm font-medium">Shelf Location</p>
                            <p className="text-sm text-muted-foreground">
                                {book.shelf_location || 'Not specified'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border bg-card p-6">
                    <h3 className="text-lg font-semibold">Book Information</h3>
                    <div className="mt-4 space-y-3 text-sm">
                        <div className="flex justify-between gap-4 border-b pb-3">
                            <span className="text-muted-foreground">ISBN</span>
                            <span className="text-right">{book.isbn || 'Not specified'}</span>
                        </div>
                        <div className="flex justify-between gap-4 border-b pb-3">
                            <span className="text-muted-foreground">Publisher</span>
                            <span className="text-right">{book.publisher || 'Not specified'}</span>
                        </div>
                        <div className="flex justify-between gap-4 border-b pb-3">
                            <span className="text-muted-foreground">Edition</span>
                            <span className="text-right">{book.edition || 'Not specified'}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Language</span>
                            <span className="text-right">{book.language || 'Not specified'}</span>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border bg-card p-6">
                    <h3 className="text-lg font-semibold">Quick Actions</h3>
                    <div className="mt-4 space-y-3">
                        <Link
                            to="/categories"
                            className="block rounded-xl border px-4 py-3 text-sm transition-colors hover:bg-muted/50"
                        >
                            Browse more categories
                        </Link>
                        {book.category && (
                            <Link
                                to={`/books?category=${encodeURIComponent(book.category.slug)}`}
                                className="block rounded-xl border px-4 py-3 text-sm transition-colors hover:bg-muted/50"
                            >
                                See more in {book.category.name}
                            </Link>
                        )}
                        <Link
                            to="/books"
                            className="block rounded-xl border px-4 py-3 text-sm transition-colors hover:bg-muted/50"
                        >
                            Return to full catalog
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
