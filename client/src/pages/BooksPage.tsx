import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { bookService, categoryService } from '@/lib/api';
import type { Book, Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';

export default function BooksPage() {
    const { isAdmin } = useAuth();
    const [books, setBooks] = useState<Book[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Dialog state
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

    const filteredBooks = useMemo(() => {
        if (!search.trim()) return books;
        const q = search.toLowerCase();
        return books.filter(
            (b) =>
                b.title.toLowerCase().includes(q) ||
                b.author.toLowerCase().includes(q) ||
                b.category?.name.toLowerCase().includes(q),
        );
    }, [books, search]);

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

    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Books</h2>
                    <p className="text-muted-foreground">
                        {books.length} book{books.length !== 1 ? 's' : ''} in the library
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

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search books…"
                    value={search}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Book Grid */}
            {filteredBooks.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
                    <BookOpen className="h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-medium">No books found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {search
                            ? 'Try adjusting your search query.'
                            : 'Get started by adding your first book.'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredBooks.map((book) => {
                        const status = statusConfig[book.status] || statusConfig.available;
                        return (
                            <div
                                key={book.id}
                                className="group relative rounded-lg border bg-card p-5 transition-all hover:shadow-md"
                            >
                                {/* Admin actions */}
                                {isAdmin && (
                                    <div className="absolute right-3 top-3">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger
                                                render={
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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

                                {/* Content */}
                                <div className="space-y-3">
                                    <div>
                                        <h3 className="font-semibold leading-tight line-clamp-2 pr-8">
                                            {book.title}
                                        </h3>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {book.author}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant={status.variant}>{status.label}</Badge>
                                        {book.category && (
                                            <Badge variant="outline">{book.category.name}</Badge>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>
                                            {book.available_copies}/{book.total_copies} copies available
                                        </span>
                                        {book.shelf_location && (
                                            <span>📍 {book.shelf_location}</span>
                                        )}
                                    </div>

                                    {book.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {book.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Dialogs */}
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
        </div>
    );
}
