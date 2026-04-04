// ─── User & Auth ────────────────────────────────────────────────

export interface User {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: 'admin' | 'member';
    status: 'active' | 'blocked';
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    user: User;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    name: string;
    email: string;
    phone?: string;
    password: string;
    password_confirmation: string;
}

// ─── Category ───────────────────────────────────────────────────

export interface Category {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CategoryDetails extends Category {
    books_count: number;
    books: Book[];
}

export interface CategoryFormData {
    name: string;
    slug: string;
    description?: string;
    is_active?: boolean;
}

// ─── Book ───────────────────────────────────────────────────────

export interface Book {
    id: number;
    category_id: number;
    title: string;
    author: string;
    isbn: string | null;
    publisher: string | null;
    publication_year: number | null;
    edition: string | null;
    language: string | null;
    description: string | null;
    cover_image: string | null;
    total_copies: number;
    available_copies: number;
    shelf_location: string | null;
    status: 'available' | 'out_of_stock' | 'inactive';
    created_by: number;
    updated_by: number;
    created_at: string;
    updated_at: string;
    category?: Category;
}

export interface BookFormData {
    category_id: number;
    title: string;
    author: string;
    isbn?: string;
    publisher?: string;
    publication_year?: number;
    edition?: string;
    language?: string;
    description?: string;
    cover_image?: string;
    total_copies?: number;
    available_copies?: number;
    shelf_location?: string;
    status?: 'available' | 'out_of_stock' | 'inactive';
}

// ─── API Errors ─────────────────────────────────────────────────

export interface ValidationErrors {
    errors: Record<string, string[]>;
}

export interface ApiError {
    error?: string;
    message?: string;
}
