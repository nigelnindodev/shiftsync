'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  CalendarDays,
  Clock,
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
  Shuffle,
  Timer,
} from 'lucide-react';

interface NavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const staffLinks: NavLink[] = [
  {
    href: '/staff/schedule',
    label: 'My Schedule',
    icon: <CalendarDays className="w-4 h-4" />,
  },
  {
    href: '/staff/availability',
    label: 'Availability',
    icon: <Clock className="w-4 h-4" />,
  },
  {
    href: '/staff/swap-requests',
    label: 'Swap Requests',
    icon: <Shuffle className="w-4 h-4" />,
  },
];

const managerLinks: NavLink[] = [
  {
    href: '/manager/shifts',
    label: 'Shifts',
    icon: <CalendarDays className="w-4 h-4" />,
  },
  {
    href: '/manager/approvals',
    label: 'Approvals',
    icon: <ListChecks className="w-4 h-4" />,
  },
];

const adminLinks: NavLink[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    href: '/admin/reports',
    label: 'Reports',
    icon: <ShieldCheck className="w-4 h-4" />,
  },
  {
    href: '/admin/reports/overtime',
    label: 'Overtime',
    icon: <Timer className="w-4 h-4" />,
  },
];

function getLinks(role: string): NavLink[] {
  switch (role) {
    case 'STAFF':
      return staffLinks;
    case 'MANAGER':
      return managerLinks;
    case 'ADMIN':
      return adminLinks;
    default:
      return [];
  }
}

export function getRole(): string {
  if (typeof window === 'undefined') return 'MANAGER';
  return localStorage.getItem('shiftsync-role') || 'MANAGER';
}

export function getUserName(): string {
  if (typeof window === 'undefined') return 'Sam Downtown';
  return localStorage.getItem('shiftsync-name') || 'Sam Downtown';
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const role = getRole();
  const links = getLinks(role);

  return (
    <nav className="space-y-1">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            pathname === link.href
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
          )}
        >
          {link.icon}
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
