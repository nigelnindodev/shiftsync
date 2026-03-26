'use client';

import { useEffect, useState } from 'react';
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
import { CalendarClock, LogOut, Menu, Loader2 } from 'lucide-react';
import { UnauthorizedError } from '@/lib/errors';
import { useProfile } from '@/hooks/use-profile';
import { useTestingLogout } from '@/hooks/use-testing';
import { usePathname, useRouter } from 'next/navigation';

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
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, isLoading, isAuthenticated, error, refetch } = useProfile();
  const logoutMutation = useTestingLogout();

  // Redirect bare /authenticated to role-appropriate landing page
  useEffect(() => {
    if (isAuthenticated && user && pathname === '/authenticated') {
      const roleRoutes: Record<string, string> = {
        ADMIN: '/admin',
        MANAGER: '/manager/shifts',
        STAFF: '/staff/schedule',
      };
      router.replace(roleRoutes[user.employee?.role ?? 'STAFF']);
    }
  }, [isAuthenticated, user, pathname, router]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        router.push('/test-login');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Auth failures redirect via useProfile's useEffect
  if (error instanceof UnauthorizedError) {
    return null;
  }

  // Non-auth errors (network, 500): show retry UI
  if (error && !user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Failed to load profile</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const role = user.employee?.role || '';
  const userName = user.name;

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
            disabled={logoutMutation.isPending}
            className="text-muted-foreground hover:text-destructive"
          >
            {logoutMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
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
