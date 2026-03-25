import { TopNavbar } from '@/components/top-navbar.client';
import { NavLinks } from '@/components/nav-links.client';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen bg-background">
      <TopNavbar />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar — hidden on mobile */}
        <aside className="hidden md:flex w-56 border-r border-border bg-sidebar flex-col">
          <nav className="flex-1 p-3">
            <NavLinks />
          </nav>
        </aside>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
