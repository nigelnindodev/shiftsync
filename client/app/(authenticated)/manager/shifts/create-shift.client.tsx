'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { mockLocations, mockSkills } from '@/lib/mock-data';

interface ShiftItem {
  id: number;
  locationId: number;
  startTime: string;
  endTime: string;
  state: string;
  skills: Array<{
    id: number;
    skillId: number;
    skillName: string;
    headcount: number;
    assignedCount: number;
  }>;
}

const INITIAL_SHIFTS: ShiftItem[] = [
  {
    id: 1,
    locationId: 1,
    startTime: '2026-03-23T09:00:00Z',
    endTime: '2026-03-23T17:00:00Z',
    state: 'OPEN',
    skills: [
      {
        id: 1,
        skillId: 1,
        skillName: 'bartender',
        headcount: 1,
        assignedCount: 1,
      },
      {
        id: 2,
        skillId: 3,
        skillName: 'server',
        headcount: 2,
        assignedCount: 1,
      },
    ],
  },
  {
    id: 2,
    locationId: 1,
    startTime: '2026-03-24T09:00:00Z',
    endTime: '2026-03-24T17:00:00Z',
    state: 'PARTIALLY_FILLED',
    skills: [
      {
        id: 3,
        skillId: 1,
        skillName: 'bartender',
        headcount: 1,
        assignedCount: 1,
      },
      {
        id: 4,
        skillId: 3,
        skillName: 'server',
        headcount: 2,
        assignedCount: 0,
      },
    ],
  },
  {
    id: 3,
    locationId: 1,
    startTime: '2026-03-25T09:00:00Z',
    endTime: '2026-03-25T17:00:00Z',
    state: 'FILLED',
    skills: [
      {
        id: 5,
        skillId: 1,
        skillName: 'bartender',
        headcount: 1,
        assignedCount: 1,
      },
      {
        id: 6,
        skillId: 3,
        skillName: 'server',
        headcount: 2,
        assignedCount: 2,
      },
    ],
  },
  {
    id: 4,
    locationId: 1,
    startTime: '2026-03-26T17:00:00Z',
    endTime: '2026-03-27T01:00:00Z',
    state: 'OPEN',
    skills: [
      {
        id: 7,
        skillId: 2,
        skillName: 'line cook',
        headcount: 1,
        assignedCount: 0,
      },
      {
        id: 8,
        skillId: 3,
        skillName: 'server',
        headcount: 3,
        assignedCount: 1,
      },
    ],
  },
  {
    id: 5,
    locationId: 1,
    startTime: '2026-03-27T10:00:00Z',
    endTime: '2026-03-27T18:00:00Z',
    state: 'OPEN',
    skills: [
      { id: 9, skillId: 4, skillName: 'host', headcount: 1, assignedCount: 0 },
    ],
  },
  {
    id: 6,
    locationId: 1,
    startTime: '2026-03-28T09:00:00Z',
    endTime: '2026-03-28T17:00:00Z',
    state: 'CANCELLED',
    skills: [
      {
        id: 10,
        skillId: 1,
        skillName: 'bartender',
        headcount: 1,
        assignedCount: 0,
      },
    ],
  },
];

const LOCATION = mockLocations.find((l) => l.id === 1);
const TZ = LOCATION?.timezone ?? 'UTC';
const LOCATION_NAME = LOCATION?.name ?? 'Unknown';

function getStateBadge(state: string) {
  const map: Record<
    string,
    { variant: 'default' | 'secondary' | 'outline' | 'destructive' }
  > = {
    OPEN: { variant: 'default' },
    PARTIALLY_FILLED: { variant: 'secondary' },
    FILLED: { variant: 'default' },
    CANCELLED: { variant: 'destructive' },
  };
  return (
    <Badge variant={map[state]?.variant || 'outline'}>
      {state.replace(/_/g, ' ')}
    </Badge>
  );
}

function localToUtc(dateStr: string, timeStr: string, tz: string): string {
  // Parse local time components
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);

  // Create a Date in the target timezone
  const localDate = new Date(year, month - 1, day, hour, minute);

  // Format this Date as if it were in the target timezone, then parse back
  // to find the offset between what we "see" and what UTC is
  const localStr = localDate.toLocaleString('en-US', { timeZone: tz });
  const utcFromLocal = new Date(localStr);
  const offsetMs = utcFromLocal.getTime() - localDate.getTime();

  return new Date(localDate.getTime() - offsetMs).toISOString();
}

export default function ManagerShifts() {
  const [shifts, setShifts] = useState<ShiftItem[]>(INITIAL_SHIFTS);
  const [createOpen, setCreateOpen] = useState(false);
  const [shiftDate, setShiftDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [skillSlots, setSkillSlots] = useState<
    Array<{ skillId: string; headcount: number }>
  >([{ skillId: '', headcount: 1 }]);

  const addSkillSlot = () => {
    setSkillSlots((prev) => [...prev, { skillId: '', headcount: 1 }]);
  };

  const removeSkillSlot = (index: number) => {
    setSkillSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    const skillEntries = skillSlots
      .filter((s) => s.skillId)
      .map((s, i) => {
        const skill = mockSkills.find((sk) => sk.id === parseInt(s.skillId));
        return {
          id: Date.now() + i,
          skillId: parseInt(s.skillId),
          skillName: skill?.name ?? 'unknown',
          headcount: s.headcount,
          assignedCount: 0,
        };
      });

    const startUtc = localToUtc(shiftDate, startTime, TZ);
    const endUtc = localToUtc(shiftDate, endTime, TZ);

    setShifts((prev) => [
      {
        id: Date.now(),
        locationId: 1,
        startTime: startUtc,
        endTime: endUtc,
        state: 'OPEN',
        skills: skillEntries,
      },
      ...prev,
    ]);

    toast.success('Shift created');
    setCreateOpen(false);
    setShiftDate('');
    setStartTime('09:00');
    setEndTime('17:00');
    setSkillSlots([{ skillId: '', headcount: 1 }]);
  };

  const handleCancel = (id: number) => {
    setShifts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, state: 'CANCELLED' } : s)),
    );
    toast.success('Shift cancelled');
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: TZ,
    });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: TZ,
    });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Shifts</h1>
          <p className="text-muted-foreground mt-1">
            {LOCATION_NAME} — create and manage shifts
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Shift
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Shift</DialogTitle>
              <DialogDescription>
                Add a new shift with skill requirements
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={LOCATION_NAME} disabled />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={shiftDate}
                  onChange={(e) => setShiftDate(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Skill Slots</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addSkillSlot}
                    className="gap-1 text-xs"
                  >
                    <Plus className="w-3 h-3" /> Add Skill
                  </Button>
                </div>
                {skillSlots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select
                      value={slot.skillId}
                      onValueChange={(val) => {
                        setSkillSlots((prev) =>
                          prev.map((s, j) =>
                            j === i ? { ...s, skillId: val } : s,
                          ),
                        );
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select skill..." />
                      </SelectTrigger>
                      <SelectContent>
                        {mockSkills.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      value={slot.headcount}
                      onChange={(e) => {
                        setSkillSlots((prev) =>
                          prev.map((s, j) =>
                            j === i
                              ? {
                                  ...s,
                                  headcount: parseInt(e.target.value) || 1,
                                }
                              : s,
                          ),
                        );
                      }}
                      className="w-20"
                    />
                    {skillSlots.length > 1 && (
                      <button
                        onClick={() => removeSkillSlot(i)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!shiftDate}>
                Create Shift
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="card-shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Skill Slots</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.map((shift) => (
              <TableRow key={shift.id}>
                <TableCell>
                  <Link
                    href={`/manager/shifts/${shift.id}`}
                    className="font-medium hover:text-primary transition-colors"
                  >
                    {formatDate(shift.startTime)}
                  </Link>
                </TableCell>
                <TableCell>
                  {formatTime(shift.startTime)} &ndash;{' '}
                  {formatTime(shift.endTime)}
                </TableCell>
                <TableCell>{getStateBadge(shift.state)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {shift.skills.map((s) => (
                      <Badge
                        key={s.id}
                        variant="outline"
                        className="text-[10px] font-normal"
                      >
                        {s.skillName}: {s.assignedCount}/{s.headcount}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {shift.state !== 'CANCELLED' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleCancel(shift.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
