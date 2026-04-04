import { useLocation } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

const pageTitles: Record<string, string> = {
    '/': 'Dashboard',
    '/books': 'Books',
    '/categories': 'Categories',
};

export default function Header() {
    const location = useLocation();
    const title =
        location.pathname.startsWith('/books/')
            ? 'Book Details'
            : pageTitles[location.pathname] || 'Readora';

    return (
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 !h-4" />
            <h1 className="text-sm font-medium">{title}</h1>
        </header>
    );
}
