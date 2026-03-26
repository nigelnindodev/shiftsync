'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, X, Loader2 } from 'lucide-react';
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
import { useProfile } from '@/hooks/use-profile';
import { useShifts, useCreateShift, useCancelShift } from '@/hooks/use-shifts';
import { useLocations, useSkills } from '@/hooks/use-reference-data';

/** Converts a local date + time in the given IANA timezone to a UTC ISO string. */
function localToUtc(dateStr: string, timeStr: string, tz: string): string {
  if (!dateStr || !timeStr) return '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);

    // Create a Date that represents this wall-clock time in UTC
    const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute));

    // Get the offset in this timezone at this moment
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(utcDate);

    const get = (type: string) => parts.find((p) => p.type === type)?.value;
    const tzYear = Number(get('year'));
    const tzMonth = Number(get('month'));
    const tzDay = Number(get('day'));
    const tzHour = Number(get('hour'));
    const tzMinute = Number(get('minute'));

    // What UTC time would produce that wall-clock time in the target timezone?
    const tzDate = new Date(
      Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute),
    );
    const offsetMs = tzDate.getTime() - utcDate.getTime();

    return new Date(utcDate.getTime() - offsetMs).toISOString();
  } catch {
    return '';
  }
}

function formatDate(iso: string, tz: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: tz,
  });
}

function formatTime(iso: string, tz: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz,
  });
}

function getStateBadge(state: string): React.ReactElement {
  const variant = ((): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (state) {
      case 'OPEN':
        return 'destructive';
      case 'PARTIALLY_FILLED':
        return 'secondary';
      case 'FILLED':
        return 'default';
      case 'CANCELLED':
        return 'outline';
      default:
        return 'outline';
    }
  })();
  return <Badge variant={variant}>{state.replace(/_/g, ' ')}</Badge>;
}

interface SkillSlotInput {
  id: number;
  skillId: string;
  headcount: number;
}

export default function ShiftsList() {
  useProfile(); // intentionally invoked for auth side-effects

  const { data: locations = [] } = useLocations();
  const { data: skills = [] } = useSkills();

  const activeLocationId = locations[0]?.id ?? 1;
  const activeLocation = locations.find((l) => l.id === activeLocationId);
  const TZ = activeLocation?.timezone ?? 'America/New_York';

  const [weekOffset, setWeekOffset] = useState(0);
  const now = new Date();
  const startOfWeek = new Date(now);
  const mondayOffset = (now.getDay() + 6) % 7;
  startOfWeek.setDate(now.getDate() - mondayOffset + weekOffset * 7);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const { data: shifts = [], isLoading: isLoadingShifts } = useShifts(
    activeLocationId,
    startOfWeek.toISOString().split('T')[0],
    endOfWeek.toISOString().split('T')[0],
  );

  const createShiftMutation = useCreateShift();
  const cancelShiftMutation = useCancelShift();

  const [createOpen, setCreateOpen] = useState(false);
  const [shiftDate, setShiftDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [skillSlots, setSkillSlots] = useState<SkillSlotInput[]>([
    { id: 1, skillId: '', headcount: 1 },
  ]);

  const addSkillSlot = () => {
    setSkillSlots((prev) => [
      ...prev,
      { id: Date.now(), skillId: '', headcount: 1 },
    ]);
  };

  const removeSkillSlot = (id: number) => {
    setSkillSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleCreate = () => {
    if (!shiftDate) {
      toast.error('Please select a date');
      return;
    }

    const startUtc = localToUtc(shiftDate, startTime, TZ);
    const endUtc = localToUtc(shiftDate, endTime, TZ);

    if (!startUtc || !endUtc || endUtc <= startUtc) {
      toast.error('End time must be after start time');
      return;
    }

    const skillEntries = skillSlots
      .filter((s) => s.skillId)
      .map((s) => ({
        skillId: parseInt(s.skillId),
        headcount: s.headcount,
      }));

    if (skillEntries.length === 0) {
      toast.error('Select at least one skill');
      return;
    }

    createShiftMutation.mutate(
      {
        locationId: activeLocationId,
        startTime: startUtc,
        endTime: endUtc,
        skills: skillEntries,
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setShiftDate('');
          setStartTime('09:00');
          setEndTime('17:00');
          setSkillSlots([{ id: 1, skillId: '', headcount: 1 }]);
        },
      },
    );
  };

  const handleCancel = (id: number) => {
    cancelShiftMutation.mutate(id);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Shifts</h1>
          <p className="text-muted-foreground mt-1">
            {activeLocation?.name ?? 'All Locations'} — create and manage shifts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border rounded-lg px-1 py-1 bg-background shadow-sm mr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeekOffset((w) => w - 1)}
            >
              <Plus className="w-4 h-4 rotate-45" />
            </Button>
            <span className="text-xs font-medium min-w-[140px] text-center">
              {weekOffset === 0
                ? 'This Week'
                : startOfWeek.toLocaleDateString()}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeekOffset((w) => w + 1)}
            >
              <Plus className="w-4 h-4" />
            </Button>
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
                  <Input value={activeLocation?.name ?? ''} disabled />
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
                  {skillSlots.map((slot) => (
                    <div key={slot.id} className="flex items-center gap-2">
                      <Select
                        value={slot.skillId}
                        onValueChange={(val) => {
                          setSkillSlots((prev) =>
                            prev.map((s) =>
                              s.id === slot.id ? { ...s, skillId: val } : s,
                            ),
                          );
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select skill..." />
                        </SelectTrigger>
                        <SelectContent>
                          {skills.map((s) => (
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
                            prev.map((s) =>
                              s.id === slot.id
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
                          onClick={() => removeSkillSlot(slot.id)}
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
                <Button
                  onClick={handleCreate}
                  disabled={!shiftDate || createShiftMutation.isPending}
                >
                  {createShiftMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Create Shift'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="card-shadow">
        {isLoadingShifts ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
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
              {shifts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No shifts found for this period
                  </TableCell>
                </TableRow>
              ) : (
                shifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell>
                      <Link
                        href={`/manager/shifts/${shift.id}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {formatDate(shift.startTime, TZ)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {formatTime(shift.startTime, TZ)} &ndash;{' '}
                      {formatTime(shift.endTime, TZ)}
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
                          disabled={cancelShiftMutation.isPending}
                          onClick={() => handleCancel(shift.id)}
                        >
                          {cancelShiftMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
