'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { NavLinks } from '@/components/nav-links.client';
import { CalendarClock, LogOut, Menu } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_KEY = 'shiftsync-role';
const NAME_KEY = 'shiftsync-name';

function getRoleColor(role: string) {
  switch (role) {
    case 'ADMIN':
      return 'bg-accent/20 text-accent-foreground';
    case 'MANAGER':
      return 'bg-primary/10 text-primary';
    case 'STAFF':
      return 'bg-secondary/15 text-secondary';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const role =
    typeof window !== 'undefined' ? localStorage.getItem(ROLE_KEY) || '' : '';
  const userName =
    typeof window !== 'undefined' ? localStorage.getItem(NAME_KEY) || '' : '';

  const handleLogout = () => {
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(NAME_KEY);
    toast.success('Logged out');
    router.push('/test-login');
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Navbar */}
      <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 md:px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Drawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            direction="left"
          >
            <DrawerTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                <Menu className="w-5 h-5" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="h-full max-h-none w-64 rounded-none">
              <DrawerHeader className="border-b">
                <DrawerTitle className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                    <CalendarClock className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                  ShiftSync
                </DrawerTitle>
              </DrawerHeader>
              <div className="p-3">
                <NavLinks role={role} onNavigate={() => setDrawerOpen(false)} />
              </div>
            </DrawerContent>
          </Drawer>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <CalendarClock className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold">ShiftSync</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {userName && (
            <div className="hidden sm:flex items-center gap-2.5">
              <span className="text-sm text-muted-foreground">{userName}</span>
              {role && (
                <Badge
                  variant="outline"
                  className={cn('text-[10px] px-1.5 py-0', getRoleColor(role))}
                >
                  {role}
                </Badge>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline ml-1.5">Log Out</span>
          </Button>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:flex w-56 border-r border-border bg-sidebar flex-col">
          <nav className="flex-1 p-3">
            <NavLinks role={role} />
          </nav>
        </aside>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
