import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatsCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon: ReactNode;
    onClick?: () => void;
}

export default function StatsCard({
    title,
    value,
    description,
    icon,
    onClick,
}: StatsCardProps) {
    return (
        <Card
            className={onClick ? 'cursor-pointer transition-shadow hover:shadow-md' : undefined}
            onClick={onClick}
        >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div className="text-muted-foreground">{icon}</div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
            </CardContent>
        </Card>
    );
}
