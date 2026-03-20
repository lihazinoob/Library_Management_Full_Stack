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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Book, Category } from '@/types';
import { bookService } from '@/lib/api';
import axios from 'axios';

const bookSchema = z.object({
    category_id: z.number().min(1, 'Category is required'),
    title: z.string().min(1, 'Title is required').max(255),
    author: z.string().min(1, 'Author is required').max(255),
    isbn: z.string().optional(),
    publisher: z.string().optional(),
    publication_year: z.number().optional(),
    edition: z.string().optional(),
    language: z.string().optional(),
    description: z.string().optional(),
    total_copies: z.number().min(1, 'At least 1 copy required').optional(),
    available_copies: z.number().min(0).optional(),
    shelf_location: z.string().optional(),
    status: z.enum(['available', 'out_of_stock', 'inactive']).optional(),
});

type BookFormValues = z.infer<typeof bookSchema>;

interface BookFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    book?: Book | null;
    categories: Category[];
    onSuccess: () => void;
}

export default function BookFormDialog({
    open,
    onOpenChange,
    book,
    categories,
    onSuccess,
}: BookFormDialogProps) {
    const isEditing = !!book;
    const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({});

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<BookFormValues>({
        resolver: zodResolver(bookSchema),
    });

    useEffect(() => {
        if (open) {
            if (book) {
                reset({
                    category_id: book.category_id,
                    title: book.title,
                    author: book.author,
                    isbn: book.isbn || '',
                    publisher: book.publisher || '',
                    publication_year: book.publication_year || 0,
                    edition: book.edition || '',
                    language: book.language || '',
                    description: book.description || '',
                    total_copies: book.total_copies,
                    available_copies: book.available_copies,
                    shelf_location: book.shelf_location || '',
                    status: book.status,
                });
            } else {
                reset({
                    category_id: undefined,
                    title: '',
                    author: '',
                    isbn: '',
                    publisher: '',
                    publication_year: 0,
                    edition: '',
                    language: '',
                    description: '',
                    total_copies: 1,
                    available_copies: 1,
                    shelf_location: '',
                    status: 'available',
                });
            }
            setServerErrors({});
        }
    }, [open, book, reset]);

    const onSubmit = async (data: BookFormValues) => {
        try {
            setServerErrors({});
            // Clean up empty strings and zero values
            const payload = {
                ...data,
                isbn: data.isbn || undefined,
                publisher: data.publisher || undefined,
                publication_year: data.publication_year || undefined,
                edition: data.edition || undefined,
                language: data.language || undefined,
                description: data.description || undefined,
                shelf_location: data.shelf_location || undefined,
            };

            if (isEditing) {
                await bookService.update(book!.id, payload);
            } else {
                await bookService.create(payload);
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Book' : 'Add New Book'}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Update the book information below.'
                            : 'Fill in the details to add a new book to the library.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit as Parameters<typeof handleSubmit>[0])} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        {/* Title */}
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="book-title">Title *</Label>
                            <Input id="book-title" {...register('title')} />
                            {(errors.title || serverErrors.title) && (
                                <p className="text-xs text-destructive">
                                    {errors.title?.message || serverErrors.title?.[0]}
                                </p>
                            )}
                        </div>

                        {/* Author */}
                        <div className="space-y-2">
                            <Label htmlFor="book-author">Author *</Label>
                            <Input id="book-author" {...register('author')} />
                            {(errors.author || serverErrors.author) && (
                                <p className="text-xs text-destructive">
                                    {errors.author?.message || serverErrors.author?.[0]}
                                </p>
                            )}
                        </div>

                        {/* Category */}
                        <div className="space-y-2">
                            <Label>Category *</Label>
                            <Select
                                onValueChange={(val) => setValue('category_id', parseInt(val as string))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id.toString()}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {(errors.category_id || serverErrors.category_id) && (
                                <p className="text-xs text-destructive">
                                    {errors.category_id?.message || serverErrors.category_id?.[0]}
                                </p>
                            )}
                        </div>

                        {/* ISBN */}
                        <div className="space-y-2">
                            <Label htmlFor="book-isbn">ISBN</Label>
                            <Input id="book-isbn" {...register('isbn')} />
                            {serverErrors.isbn && (
                                <p className="text-xs text-destructive">{serverErrors.isbn[0]}</p>
                            )}
                        </div>

                        {/* Publisher */}
                        <div className="space-y-2">
                            <Label htmlFor="book-publisher">Publisher</Label>
                            <Input id="book-publisher" {...register('publisher')} />
                        </div>

                        {/* Publication Year */}
                        <div className="space-y-2">
                            <Label htmlFor="book-year">Publication Year</Label>
                            <Input
                                id="book-year"
                                type="number"
                                {...register('publication_year')}
                            />
                        </div>

                        {/* Edition */}
                        <div className="space-y-2">
                            <Label htmlFor="book-edition">Edition</Label>
                            <Input id="book-edition" {...register('edition')} />
                        </div>

                        {/* Language */}
                        <div className="space-y-2">
                            <Label htmlFor="book-language">Language</Label>
                            <Input
                                id="book-language"
                                placeholder="English"
                                {...register('language')}
                            />
                        </div>

                        {/* Total Copies */}
                        <div className="space-y-2">
                            <Label htmlFor="book-total">Total Copies</Label>
                            <Input
                                id="book-total"
                                type="number"
                                min={1}
                                {...register('total_copies')}
                            />
                        </div>

                        {/* Available Copies */}
                        <div className="space-y-2">
                            <Label htmlFor="book-available">Available Copies</Label>
                            <Input
                                id="book-available"
                                type="number"
                                min={0}
                                {...register('available_copies')}
                            />
                            {serverErrors.available_copies && (
                                <p className="text-xs text-destructive">
                                    {serverErrors.available_copies[0]}
                                </p>
                            )}
                        </div>

                        {/* Shelf Location */}
                        <div className="space-y-2">
                            <Label htmlFor="book-shelf">Shelf Location</Label>
                            <Input
                                id="book-shelf"
                                placeholder="A-12"
                                {...register('shelf_location')}
                            />
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                                value={book?.status || 'available'}
                                onValueChange={(val) =>
                                    setValue('status', val as 'available' | 'out_of_stock' | 'inactive')
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="available">Available</SelectItem>
                                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Description */}
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="book-desc">Description</Label>
                            <Textarea
                                id="book-desc"
                                rows={3}
                                {...register('description')}
                            />
                        </div>
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
                                'Update Book'
                            ) : (
                                'Add Book'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
