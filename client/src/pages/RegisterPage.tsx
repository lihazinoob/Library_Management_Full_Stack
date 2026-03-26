import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { BookOpen, Loader2 } from 'lucide-react';
import axios from 'axios';

const registerSchema = z
    .object({
        name: z.string().min(1, 'Name is required').max(255),
        email: z.string().email('Please enter a valid email'),
        phone: z.string().max(20).optional().or(z.literal('')),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        password_confirmation: z.string().min(1, 'Please confirm your password'),
    })
    .refine((data) => data.password === data.password_confirmation, {
        message: 'Passwords do not match',
        path: ['password_confirmation'],
    });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const { register: registerUser } = useAuth();
    const navigate = useNavigate();
    const [serverErrors, setServerErrors] = useState<Record<string, string[]>>(
        {},
    );

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterFormData) => {
        try {
            setServerErrors({});
            await registerUser({
                name: data.name,
                email: data.email,
                phone: data.phone || undefined,
                password: data.password,
                password_confirmation: data.password_confirmation,
            });
            navigate('/');
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.data?.errors) {
                setServerErrors(err.response.data.errors);
            } else if (axios.isAxiosError(err)) {
                setServerErrors({
                    general: [
                        err.response?.data?.message || 'Registration failed. Please try again.',
                    ],
                });
            } else {
                setServerErrors({ general: ['An unexpected error occurred.'] });
            }
        }
    };

    const getError = (field: keyof RegisterFormData) =>
        errors[field]?.message || serverErrors[field]?.[0];

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/50 px-4 py-8">
            <div className="w-full max-w-md space-y-8">
                {/* Logo */}
                <div className="flex flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
                        <BookOpen className="h-6 w-6" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Readora</h1>
                    <p className="text-sm text-muted-foreground">
                        Create your account
                    </p>
                </div>

                {/* Register Card */}
                <Card className="border-border/50 shadow-xl">
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl">Get started</CardTitle>
                        <CardDescription>
                            Fill in your details to create an account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            {serverErrors.general && (
                                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                    {serverErrors.general[0]}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    placeholder="John Doe"
                                    autoComplete="name"
                                    {...register('name')}
                                />
                                {getError('name') && (
                                    <p className="text-xs text-destructive">{getError('name')}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    {...register('email')}
                                />
                                {getError('email') && (
                                    <p className="text-xs text-destructive">
                                        {getError('email')}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone (optional)</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="01700000000"
                                    autoComplete="tel"
                                    {...register('phone')}
                                />
                                {getError('phone') && (
                                    <p className="text-xs text-destructive">
                                        {getError('phone')}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    {...register('password')}
                                />
                                {getError('password') && (
                                    <p className="text-xs text-destructive">
                                        {getError('password')}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password_confirmation">Confirm Password</Label>
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    {...register('password_confirmation')}
                                />
                                {getError('password_confirmation') && (
                                    <p className="text-xs text-destructive">
                                        {getError('password_confirmation')}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating account…
                                    </>
                                ) : (
                                    'Create account'
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="font-medium text-primary underline-offset-4 hover:underline"
                            >
                                Sign in
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
