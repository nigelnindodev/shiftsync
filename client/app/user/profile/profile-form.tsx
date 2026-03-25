'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { mockProfile } from '@/lib/mock-data';
import { User, Mail, Clock, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfileView() {
  const profile = mockProfile;

  const handleSave = () => {
    toast.success('Profile updated');
  };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Profile</h1>
      <p className="text-muted-foreground mb-8">
        Your employee information and preferences
      </p>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Info Card */}
        <Card className="card-shadow md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">{profile.name}</h2>
              <Badge className="mt-2" variant="secondary">
                {profile.employee?.role}
              </Badge>

              <div className="w-full mt-6 space-y-3 text-left">
                <div className="flex items-center gap-2.5 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{profile.email}</span>
                </div>
                {profile.employee && (
                  <>
                    <div className="flex items-center gap-2.5 text-sm">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {profile.employee.homeTimezone}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {profile.employee.desiredHoursPerWeek}h/week desired
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <Card className="card-shadow md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Edit Profile</CardTitle>
            <CardDescription>
              Update your timezone and work preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input
                value={profile.employee?.homeTimezone || ''}
                readOnly
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">
                Contact your manager to change your timezone
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours">Desired Hours Per Week</Label>
              <Input
                id="hours"
                type="number"
                min={0}
                max={168}
                defaultValue={profile.employee?.desiredHoursPerWeek || 40}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Hours Preference Note</Label>
              <Input
                id="note"
                placeholder="e.g., prefer longer shifts, 4 days/week"
                defaultValue={profile.employee?.desiredHoursNote || ''}
              />
            </div>

            <Button onClick={handleSave}>Save Changes</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
