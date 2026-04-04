import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { bookService, categoryService } from '@/lib/api';
import type { Book, Category } from '@/types';
import StatsCard from '@/components/shared/StatsCard';
import { BookOpen, FolderTree, BookCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [books, setBooks] = useState<Book[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [booksRes, categoriesRes] = await Promise.all([
                    bookService.getAll(),
                    categoryService.getAll(),
                ]);
                setBooks(booksRes.data);
                setCategories(categoriesRes.data);
            } catch {
                // Silently fail — empty state will show
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const totalBooks = books.length;
    const availableBooks = books.filter((b) => b.status === 'available').length;
    const totalCategories = categories.length;
    const outOfStock = books.filter((b) => b.status === 'out_of_stock').length;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Welcome */}
            <div>
                <h2 className="text-2xl font-bold tracking-tight">
                    Welcome back, {user?.name?.split(' ')[0]}!
                </h2>
                <p className="text-muted-foreground">
                    {isAdmin
                        ? "Here's an overview of your library system."
                        : 'Explore our collection and find your next read.'}
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Books"
                    value={totalBooks}
                    description="Books in the library"
                    icon={<BookOpen className="h-4 w-4" />}
                    onClick={() => navigate('/books')}
                />
                <StatsCard
                    title="Available"
                    value={availableBooks}
                    description="Ready to borrow"
                    icon={<BookCheck className="h-4 w-4" />}
                />
                <StatsCard
                    title="Categories"
                    value={totalCategories}
                    description="Active categories"
                    icon={<FolderTree className="h-4 w-4" />}
                />
                <StatsCard
                    title="Out of Stock"
                    value={outOfStock}
                    description="Currently unavailable"
                    icon={<Users className="h-4 w-4" />}
                />
            </div>

            {/* Recent Books */}
            {books.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-4">Recently Added</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {books.slice(0, 6).map((book) => (
                            <div
                                key={book.id}
                                className="group rounded-lg border p-4 transition-colors hover:bg-muted/50"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-medium truncate">{book.title}</h4>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {book.author}
                                        </p>
                                    </div>
                                    <span
                                        className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${book.status === 'available'
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                            : book.status === 'out_of_stock'
                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                                                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                            }`}
                                    >
                                        {book.status === 'available'
                                            ? 'Available'
                                            : book.status === 'out_of_stock'
                                                ? 'Out of Stock'
                                                : 'Inactive'}
                                    </span>
                                </div>
                                {book.category && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        {book.category.name}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
