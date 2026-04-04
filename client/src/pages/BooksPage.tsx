import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { bookService, categoryService } from '@/lib/api';
import type { Book, Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import BookFormDialog from '@/components/books/BookFormDialog';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import {
    Plus,
    Search,
    MoreVertical,
    Pencil,
    Trash2,
    BookOpen,
    Library,
    MapPin,
} from 'lucide-react';

export default function BooksPage() {
    const { isAdmin } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [books, setBooks] = useState<Book[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(
        searchParams.get('category') ?? 'all',
    );
    const [selectedStatus, setSelectedStatus] = useState(
        searchParams.get('status') ?? 'all',
    );

    const [formOpen, setFormOpen] = useState(false);
    const [editingBook, setEditingBook] = useState<Book | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deletingBook, setDeletingBook] = useState<Book | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchData = async () => {
        try {
            const [booksRes, catsRes] = await Promise.all([
                bookService.getAll(),
                categoryService.getAll(),
            ]);
            setBooks(booksRes.data);
            setCategories(catsRes.data);
        } catch {
            // empty
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setSelectedCategory(searchParams.get('category') ?? 'all');
        setSelectedStatus(searchParams.get('status') ?? 'all');
    }, [searchParams]);

    const filteredBooks = useMemo(() => {
        const q = search.trim().toLowerCase();

        return books.filter((book) => {
            const matchesSearch =
                !q ||
                book.title.toLowerCase().includes(q) ||
                book.author.toLowerCase().includes(q) ||
                book.category?.name.toLowerCase().includes(q);

            const matchesCategory =
                selectedCategory === 'all' || book.category?.slug === selectedCategory;

            const matchesStatus =
                selectedStatus === 'all' || book.status === selectedStatus;

            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [books, search, selectedCategory, selectedStatus]);

    const selectedCategoryMeta = useMemo(
        () => categories.find((category) => category.slug === selectedCategory) ?? null,
        [categories, selectedCategory],
    );

    const handleEdit = (book: Book) => {
        setEditingBook(book);
        setFormOpen(true);
    };

    const handleDelete = async () => {
        if (!deletingBook) return;
        setDeleteLoading(true);
        try {
            await bookService.delete(deletingBook.id);
            await fetchData();
            setDeleteOpen(false);
            setDeletingBook(null);
        } catch {
            // empty
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleFormSuccess = () => {
        fetchData();
        setEditingBook(null);
    };

    const updateFilters = (nextCategory: string, nextStatus: string) => {
        setSelectedCategory(nextCategory);
        setSelectedStatus(nextStatus);

        const nextParams = new URLSearchParams(searchParams);

        if (nextCategory === 'all') {
            nextParams.delete('category');
        } else {
            nextParams.set('category', nextCategory);
        }

        if (nextStatus === 'all') {
            nextParams.delete('status');
        } else {
            nextParams.set('status', nextStatus);
        }

        setSearchParams(nextParams, { replace: true });
    };

    const statusConfig: Record<
        string,
        { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
    > = {
        available: { label: 'Available', variant: 'default' },
        out_of_stock: { label: 'Out of Stock', variant: 'secondary' },
        inactive: { label: 'Inactive', variant: 'outline' },
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    const hasActiveFilters =
        !!search.trim() || selectedCategory !== 'all' || selectedStatus !== 'all';

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Books</h2>
                    <p className="text-muted-foreground">
                        {isAdmin
                            ? `${books.length} book${books.length !== 1 ? 's' : ''} in the library`
                            : selectedCategoryMeta
                                ? `Browsing books in ${selectedCategoryMeta.name}`
                                : 'Discover titles by topic, author, and availability'}
                    </p>
                </div>
                {isAdmin && (
                    <Button
                        onClick={() => {
                            setEditingBook(null);
                            setFormOpen(true);
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Book
                    </Button>
                )}
            </div>

            {!isAdmin && (
                <div className="rounded-2xl border bg-gradient-to-r from-sky-50 via-white to-emerald-50 p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl space-y-2">
                            <p className="text-sm font-medium text-sky-700">Browse collection</p>
                            <h3 className="text-2xl font-semibold tracking-tight">
                                {selectedCategoryMeta
                                    ? `${selectedCategoryMeta.name} books`
                                    : 'Explore the library catalog'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {selectedCategoryMeta?.description ||
                                    'Use filters to narrow the collection and quickly find something worth reading.'}
                            </p>
                        </div>
                        <div className="rounded-xl bg-background/80 px-4 py-3 shadow-sm ring-1 ring-border">
                            <p className="text-2xl font-semibold">{filteredBooks.length}</p>
                            <p className="text-xs text-muted-foreground">
                                matching book{filteredBooks.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative w-full lg:max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search books..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {!isAdmin && (
                    <>
                        <Select
                            value={selectedCategory}
                            onValueChange={(value) =>
                                updateFilters(value ?? 'all', selectedStatus)
                            }
                        >
                            <SelectTrigger className="w-full lg:w-56">
                                <SelectValue placeholder="All categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All categories</SelectItem>
                                {categories.map((category) => (
                                    <SelectItem key={category.id} value={category.slug}>
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={selectedStatus}
                            onValueChange={(value) =>
                                updateFilters(selectedCategory, value ?? 'all')
                            }
                        >
                            <SelectTrigger className="w-full lg:w-48">
                                <SelectValue placeholder="Any status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Any status</SelectItem>
                                <SelectItem value="available">Available</SelectItem>
                                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>

                        {hasActiveFilters && (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearch('');
                                    updateFilters('all', 'all');
                                }}
                            >
                                Clear filters
                            </Button>
                        )}
                    </>
                )}
            </div>

            {filteredBooks.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
                    <BookOpen className="h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-medium">No books found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {isAdmin
                            ? search
                                ? 'Try adjusting your search query.'
                                : 'Get started by adding your first book.'
                            : 'Try changing the search or filters to explore more books.'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredBooks.map((book) => {
                        const status = statusConfig[book.status] || statusConfig.available;
                        return (
                            <div
                                key={book.id}
                                className={`group relative border bg-card p-5 transition-all ${
                                    isAdmin
                                        ? 'rounded-lg hover:shadow-md'
                                        : 'rounded-2xl hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg'
                                }`}
                            >
                                {isAdmin && (
                                    <div className="absolute right-3 top-3">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger
                                                render={
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                                                    />
                                                }
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(book)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    variant="destructive"
                                                    onClick={() => {
                                                        setDeletingBook(book);
                                                        setDeleteOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {!isAdmin && (
                                        <div className="flex items-start justify-between gap-3">
                                            {book.category && (
                                                <Badge variant="outline">{book.category.name}</Badge>
                                            )}
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                <Library className="h-5 w-5" />
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <h3 className="font-semibold leading-tight line-clamp-2 pr-8">
                                            {book.title}
                                        </h3>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {book.author}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant={status.variant}>{status.label}</Badge>
                                        {isAdmin && book.category && (
                                            <Badge variant="outline">{book.category.name}</Badge>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                        <span>
                                            {book.available_copies}/{book.total_copies} copies available
                                        </span>
                                        {book.shelf_location && (
                                            <span className="inline-flex items-center gap-1">
                                                <MapPin className="h-3.5 w-3.5" />
                                                {book.shelf_location}
                                            </span>
                                        )}
                                    </div>

                                    {book.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {book.description}
                                        </p>
                                    )}

                                    {!isAdmin && (
                                        <div className="flex items-center justify-between border-t pt-4">
                                            <span className="text-xs text-muted-foreground">
                                                {book.publication_year
                                                    ? `Published ${book.publication_year}`
                                                    : 'Publication year not listed'}
                                            </span>
                                            <span className="text-sm font-medium text-primary">
                                                View details
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isAdmin && (
                <>
                    <BookFormDialog
                        open={formOpen}
                        onOpenChange={setFormOpen}
                        book={editingBook}
                        categories={categories}
                        onSuccess={handleFormSuccess}
                    />

                    <DeleteConfirmDialog
                        open={deleteOpen}
                        onOpenChange={setDeleteOpen}
                        title="Delete Book"
                        description={`Are you sure you want to delete "${deletingBook?.title}"? This action cannot be undone.`}
                        onConfirm={handleDelete}
                        isLoading={deleteLoading}
                    />
                </>
            )}
        </div>
    );
}
