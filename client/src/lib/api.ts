import axios from 'axios';
import type {
    AuthResponse,
    LoginCredentials,
    RegisterData,
    User,
    Category,
    CategoryFormData,
    Book,
    BookFormData,
} from '@/types';

// ─── Axios Instance ─────────────────────────────────────────────

const api = axios.create({
    baseURL: '/api',
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
});

// Request interceptor – attach JWT token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor – handle 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('access_token');
            // Only redirect if we're not already on an auth page
            if (
                !window.location.pathname.includes('/login') &&
                !window.location.pathname.includes('/register')
            ) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    },
);

// ─── Auth Service ───────────────────────────────────────────────

export const authService = {
    login: (credentials: LoginCredentials) =>
        api.post<AuthResponse>('/auth/login', credentials),

    register: (data: RegisterData) =>
        api.post<AuthResponse>('/auth/register', data),

    me: () => api.get<User>('/auth/me'),

    logout: () => api.post('/auth/logout'),

    refresh: () => api.post<AuthResponse>('/auth/refresh'),
};

// ─── Category Service ───────────────────────────────────────────

export const categoryService = {
    getAll: () => api.get<Category[]>('/categories'),

    create: (data: CategoryFormData) =>
        api.post<{ message: string; category: Category }>('/categories', data),

    update: (id: number, data: Partial<CategoryFormData>) =>
        api.put<{ message: string; category: Category }>(`/categories/${id}`, data),

    delete: (id: number) =>
        api.delete<{ message: string }>(`/categories/${id}`),
};

// ─── Book Service ───────────────────────────────────────────────

export const bookService = {
    getAll: () => api.get<Book[]>('/books'),

    create: (data: BookFormData) =>
        api.post<{ message: string; book: Book }>('/books', data),

    update: (id: number, data: Partial<BookFormData>) =>
        api.put<{ message: string; book: Book }>(`/books/${id}`, data),

    delete: (id: number) =>
        api.delete<{ message: string }>(`/books/${id}`),
};

export default api;
