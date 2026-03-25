'use client';

import ProfileForm from './profile-form';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const Profile = () => {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('shiftsync-role');
    localStorage.removeItem('shiftsync-name');
    toast.success('Logged out');
    router.push('/test-login');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-50 bg-background">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-lg font-semibold">ShiftSync</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </div>
      </header>
      <ProfileForm />
    </div>
  );
};

export default Profile;
