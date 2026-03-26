import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from 'react';
import { authService } from '@/lib/api';
import type { User, LoginCredentials, RegisterData } from '@/types';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isLoading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(
        () => localStorage.getItem('access_token'),
    );
    const [isLoading, setIsLoading] = useState(true);

    const isAuthenticated = !!user && !!token;
    const isAdmin = user?.role === 'admin';

    // Restore session on mount
    useEffect(() => {
        const restoreSession = async () => {
            if (!token) {
                setIsLoading(false);
                return;
            }
            try {
                const { data } = await authService.me();
                setUser(data);
            } catch {
                localStorage.removeItem('access_token');
                setToken(null);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };
        restoreSession();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const login = useCallback(async (credentials: LoginCredentials) => {
        const { data } = await authService.login(credentials);
        localStorage.setItem('access_token', data.access_token);
        setToken(data.access_token);
        setUser(data.user);
    }, []);

    const register = useCallback(async (registerData: RegisterData) => {
        const { data } = await authService.register(registerData);
        localStorage.setItem('access_token', data.access_token);
        setToken(data.access_token);
        setUser(data.user);
    }, []);

    const logout = useCallback(async () => {
        try {
            await authService.logout();
        } catch {
            // Token may already be invalid – that's fine
        } finally {
            localStorage.removeItem('access_token');
            setToken(null);
            setUser(null);
        }
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated,
                isAdmin,
                isLoading,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
