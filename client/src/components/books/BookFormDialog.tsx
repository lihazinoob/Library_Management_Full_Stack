import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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

const optionalTrimmedString = z.preprocess(
    (value) => {
        if (typeof value !== 'string') return value;
        const trimmed = value.trim();
        return trimmed === '' ? undefined : trimmed;
    },
    z.string().max(255).optional(),
);

const optionalDescription = z.preprocess(
    (value) => {
        if (typeof value !== 'string') return value;
        const trimmed = value.trim();
        return trimmed === '' ? undefined : trimmed;
    },
    z.string().optional(),
);

const optionalNumber = (
    schema: z.ZodNumber,
) =>
    z.preprocess((value) => {
        if (value === '' || value === null || typeof value === 'undefined') {
            return undefined;
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed === '') return undefined;
            const parsed = Number(trimmed);
            return Number.isNaN(parsed) ? value : parsed;
        }

        return value;
    }, schema.optional());

const bookSchema = z
    .object({
        category_id: z.number({ error: 'Category is required' }).min(1, 'Category is required'),
    title: z.string().min(1, 'Title is required').max(255),
    author: z.string().min(1, 'Author is required').max(255),
    isbn: optionalTrimmedString,
    publisher: optionalTrimmedString,
    publication_year: optionalNumber(
        z
            .number({ error: 'Publication year must be a valid number' })
            .int('Publication year must be a whole number')
            .min(0, 'Publication year cannot be negative')
            .max(9999, 'Publication year must be 4 digits or fewer'),
    ),
    edition: optionalTrimmedString,
    language: optionalTrimmedString,
    description: optionalDescription,
    total_copies: optionalNumber(
        z
            .number({ error: 'Total copies must be a valid number' })
            .int('Total copies must be a whole number')
            .min(1, 'At least 1 copy is required'),
    ),
    available_copies: optionalNumber(
        z
            .number({ error: 'Available copies must be a valid number' })
            .int('Available copies must be a whole number')
            .min(0, 'Available copies cannot be negative'),
    ),
    shelf_location: optionalTrimmedString,
    status: z.enum(['available', 'out_of_stock', 'inactive']).optional(),
    })
    .superRefine((data, ctx) => {
        if (
            typeof data.total_copies === 'number' &&
            typeof data.available_copies === 'number' &&
            data.available_copies > data.total_copies
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['available_copies'],
                message: 'Available copies must be less than or equal to total copies',
            });
        }
    });

type BookFormInput = z.input<typeof bookSchema>;
type BookFormValues = z.output<typeof bookSchema>;

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
    const [submitError, setSubmitError] = useState<string | null>(null);

    const {
        control,
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<BookFormInput, unknown, BookFormValues>({
        resolver: zodResolver(bookSchema),
        defaultValues: {
            category_id: undefined,
            title: '',
            author: '',
            isbn: undefined,
            publisher: undefined,
            publication_year: undefined,
            edition: undefined,
            language: undefined,
            description: undefined,
            total_copies: 1,
            available_copies: 1,
            shelf_location: undefined,
            status: 'available',
        },
    });

    const selectedCategoryId = watch('category_id');
    const selectedStatus = watch('status');
    const selectedCategoryName = categories.find((category) => category.id === selectedCategoryId)?.name;
    const statusLabelMap: Record<NonNullable<BookFormValues['status']>, string> = {
        available: 'Available',
        out_of_stock: 'Out of Stock',
        inactive: 'Inactive',
    };
    const selectedStatusLabel = selectedStatus ? statusLabelMap[selectedStatus] : 'Available';

    useEffect(() => {
        if (open) {
            if (book) {
                reset({
                    category_id: book.category_id,
                    title: book.title,
                    author: book.author,
                    isbn: book.isbn || undefined,
                    publisher: book.publisher || undefined,
                    publication_year: book.publication_year || undefined,
                    edition: book.edition || undefined,
                    language: book.language || undefined,
                    description: book.description || undefined,
                    total_copies: book.total_copies,
                    available_copies: book.available_copies,
                    shelf_location: book.shelf_location || undefined,
                    status: book.status,
                });
            } else {
                reset({
                    category_id: undefined,
                    title: '',
                    author: '',
                    isbn: undefined,
                    publisher: undefined,
                    publication_year: undefined,
                    edition: undefined,
                    language: undefined,
                    description: undefined,
                    total_copies: 1,
                    available_copies: 1,
                    shelf_location: undefined,
                    status: 'available',
                });
            }
            setServerErrors({});
            setSubmitError(null);
        }
    }, [open, book, reset]);

    const onSubmit = async (data: BookFormValues) => {
        try {
            setServerErrors({});
            setSubmitError(null);
            const payload = { ...data };

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
                setSubmitError('Please correct the highlighted fields and try again.');
            } else {
                setSubmitError('Something went wrong while saving the book. Please try again.');
            }
        }
    };

    const getFieldError = (field: keyof BookFormValues) =>
        errors[field]?.message || serverErrors[field]?.[0];

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

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {submitError && (
                        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            {submitError}
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        {/* Title */}
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="book-title">Title *</Label>
                            <Input
                                id="book-title"
                                aria-invalid={!!getFieldError('title')}
                                {...register('title')}
                            />
                            {getFieldError('title') && (
                                <p className="text-xs text-destructive">{getFieldError('title')}</p>
                            )}
                        </div>

                        {/* Author */}
                        <div className="space-y-2">
                            <Label htmlFor="book-author">Author *</Label>
                            <Input
                                id="book-author"
                                aria-invalid={!!getFieldError('author')}
                                {...register('author')}
                            />
                            {getFieldError('author') && (
                                <p className="text-xs text-destructive">{getFieldError('author')}</p>
                            )}
                        </div>

                        {/* Category */}
                        <div className="space-y-2">
                            <Label>Category *</Label>
                            <Controller
                                control={control}
                                name="category_id"
                                render={({ field }) => (
                                    <Select
                                        value={field.value ? field.value.toString() : undefined}
                                        onValueChange={(val) =>
                                            field.onChange(val ? parseInt(val, 10) : undefined)
                                        }
                                    >
                                        <SelectTrigger aria-invalid={!!getFieldError('category_id')} className="w-full">
                                            <SelectValue placeholder="Select category">
                                                {selectedCategoryName}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {getFieldError('category_id') && (
                                <p className="text-xs text-destructive">
                                    {getFieldError('category_id')}
                                </p>
                            )}
                            {!selectedCategoryId && !getFieldError('category_id') && (
                                <p className="text-xs text-muted-foreground">
                                    Choose the category this book belongs to.
                                </p>
                            )}
                        </div>

                        {/* ISBN */}
                        <div className="space-y-2">
                            <Label htmlFor="book-isbn">ISBN</Label>
                            <Input
                                id="book-isbn"
                                aria-invalid={!!getFieldError('isbn')}
                                {...register('isbn')}
                            />
                            {getFieldError('isbn') && (
                                <p className="text-xs text-destructive">{getFieldError('isbn')}</p>
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
                                min={0}
                                max={9999}
                                inputMode="numeric"
                                aria-invalid={!!getFieldError('publication_year')}
                                {...register('publication_year')}
                            />
                            {getFieldError('publication_year') && (
                                <p className="text-xs text-destructive">
                                    {getFieldError('publication_year')}
                                </p>
                            )}
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
                                inputMode="numeric"
                                aria-invalid={!!getFieldError('total_copies')}
                                {...register('total_copies')}
                            />
                            {getFieldError('total_copies') && (
                                <p className="text-xs text-destructive">
                                    {getFieldError('total_copies')}
                                </p>
                            )}
                        </div>

                        {/* Available Copies */}
                        <div className="space-y-2">
                            <Label htmlFor="book-available">Available Copies</Label>
                            <Input
                                id="book-available"
                                type="number"
                                min={0}
                                inputMode="numeric"
                                aria-invalid={!!getFieldError('available_copies')}
                                {...register('available_copies')}
                            />
                            {getFieldError('available_copies') && (
                                <p className="text-xs text-destructive">
                                    {getFieldError('available_copies')}
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
                            <Controller
                                control={control}
                                name="status"
                                render={({ field }) => (
                                    <Select
                                        value={field.value || 'available'}
                                        onValueChange={field.onChange}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue>{selectedStatusLabel}</SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="available">Available</SelectItem>
                                            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {!getFieldError('status') && (
                                <p className="text-xs text-muted-foreground">
                                    Current status: {selectedStatus === 'out_of_stock' ? 'Out of Stock' : selectedStatus === 'inactive' ? 'Inactive' : 'Available'}
                                </p>
                            )}
                        </div>

                        {/* Description */}
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="book-desc">Description</Label>
                            <Textarea
                                id="book-desc"
                                rows={3}
                                aria-invalid={!!getFieldError('description')}
                                {...register('description')}
                            />
                            {getFieldError('description') && (
                                <p className="text-xs text-destructive">
                                    {getFieldError('description')}
                                </p>
                            )}
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
