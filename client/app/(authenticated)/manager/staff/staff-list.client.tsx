'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Plus, Users } from 'lucide-react';
import { useProfile } from '@/hooks/use-profile';
import { useStaffForLocation, useCreateStaff } from '@/hooks/use-staff';
import { useManagerLocations, useSkills } from '@/hooks/use-reference-data';
import type { CreateStaffDto } from '@/types/scheduling';
import { Checkbox } from '@/components/ui/checkbox';

export default function StaffView() {
  useProfile(); // intentionally invoked for auth side-effects

  const { data: locations = [], isLoading: isLoadingLocations } =
    useManagerLocations();
  const [locationId, setLocationId] = useState<number | null>(null);

  const selectedLocationId = locationId ?? locations[0]?.id ?? 0;

  const {
    data: staff = [],
    isLoading,
    error,
    refetch,
  } = useStaffForLocation(selectedLocationId);
  const createMutation = useCreateStaff();
  const { data: skills = [] } = useSkills();

  // Create form state
  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [homeTimezone, setHomeTimezone] = useState('America/New_York');
  const [desiredHours, setDesiredHours] = useState<number | null>(null);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);

  const resetForm = () => {
    setEmail('');
    setName('');
    setHomeTimezone('America/New_York');
    setDesiredHours(null);
    setSelectedSkillIds([]);
  };

  const handleCreate = () => {
    const data: CreateStaffDto = {
      email,
      name,
      homeTimezone,
      ...(desiredHours ? { desiredHoursPerWeek: desiredHours } : {}),
      ...(selectedSkillIds.length > 0 ? { skillIds: selectedSkillIds } : {}),
    };

    createMutation.mutate(
      { locationId: selectedLocationId, data },
      {
        onSuccess: () => {
          setCreateOpen(false);
          resetForm();
        },
      },
    );
  };

  return (
    <div className="p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-1">Staff</h1>
          <p className="text-muted-foreground">
            Manage staff members at your locations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={String(selectedLocationId)}
            onValueChange={(val) => setLocationId(Number(val))}
            disabled={isLoadingLocations || locations.length === 0}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={String(loc.id)}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Staff Member</DialogTitle>
                <DialogDescription>
                  Create a new staff member and certify them at this location
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="alice@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                    <p className="text-xs text-destructive">
                      Enter a valid email address
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    placeholder="Alice Johnson"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Staff Home Timezone</Label>
                  <Select value={homeTimezone} onValueChange={setHomeTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">
                        New York (Eastern)
                      </SelectItem>
                      <SelectItem value="America/Los_Angeles">
                        Los Angeles (Pacific)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Desired Hours / Week *</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="40"
                    value={desiredHours ?? ''}
                    onChange={(e) =>
                      setDesiredHours(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  />
                </div>
                {skills.length > 0 && (
                  <div className="space-y-2">
                    <Label>Skills</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {skills.map((skill) => (
                        <label
                          key={skill.id}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedSkillIds.includes(skill.id)}
                            onCheckedChange={(checked) => {
                              setSelectedSkillIds((prev) =>
                                checked
                                  ? [...prev, skill.id]
                                  : prev.filter((id) => id !== skill.id),
                              );
                            }}
                          />
                          {skill.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreateOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={
                    !email ||
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
                    !name ||
                    !desiredHours ||
                    createMutation.isPending
                  }
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="card-shadow">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-3">Failed to load staff</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : staff.length === 0 ? (
        <Card className="card-shadow">
          <CardContent className="py-12 text-center">
            <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground mb-3">
              No staff members at this location yet
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
              Add your first staff member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="card-shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Timezone</TableHead>
                <TableHead>Desired Hours</TableHead>
                <TableHead>Skills</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>{member.homeTimezone}</TableCell>
                  <TableCell>
                    {member.desiredHoursPerWeek != null
                      ? `${member.desiredHoursPerWeek}h`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {member.skills.length > 0 ? member.skills.join(', ') : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
