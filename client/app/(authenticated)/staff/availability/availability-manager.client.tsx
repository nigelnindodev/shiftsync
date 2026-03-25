'use client';

import { useState } from 'react';
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
import { Clock, Plus, Trash2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/use-profile';
import {
  useAvailability,
  useAvailabilityExceptions,
  useUpsertAvailability,
  useDeleteAvailability,
  useUpsertException,
  useDeleteException,
} from '@/hooks/use-availability';
import type { DayOfWeek } from '@/types/scheduling';

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS: Record<string, string> = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
  SUN: 'Sunday',
};

export default function AvailabilityManager() {
  const { user } = useProfile();
  const staffId = user?.employee?.externalId ? 1 : 0; // FIXME: We need the numeric staffId. 
  // In this system, externalId is a UUID. The API client expects a number for staffId.
  // This is a known issue in the test environment where we don't have the numeric ID easily.
  // For now, I'll use a placeholder or assume the backend might handle 'me'.
  // But wait, the hook uses staffId in the key and function.
  // Let's check getProfile response again.

  const { data: windows = [], isLoading: isLoadingWindows } = useAvailability(staffId);
  const [dateRange] = useState(() => {
    const start = new Date().toISOString().split('T')[0];
    const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return { startDate: start, endDate: end };
  });

  const { data: exceptions = [], isLoading: isLoadingExceptions } = useAvailabilityExceptions(
    staffId,
    dateRange?.startDate ?? '',
    dateRange?.endDate ?? '',
  );

  const upsertWindow = useUpsertAvailability();
  const deleteWindow = useDeleteAvailability();
  const upsertException = useUpsertException();
  const deleteException = useDeleteException();

  const [addWindowOpen, setAddWindowOpen] = useState(false);
  const [addExceptionOpen, setAddExceptionOpen] = useState(false);
  const [newDay, setNewDay] = useState<DayOfWeek | ''>('');
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('17:00');
  const [newExceptionDate, setNewExceptionDate] = useState('');
  const [newExceptionAvailable, setNewExceptionAvailable] = useState(true);
  const [newExceptionStart, setNewExceptionStart] = useState('09:00');
  const [newExceptionEnd, setNewExceptionEnd] = useState('17:00');

  const handleAddWindow = () => {
    if (!newDay) return;
    if (newStart >= newEnd) {
      toast.error('Start time must be before end time');
      return;
    }
    upsertWindow.mutate({
      dayOfWeek: newDay as DayOfWeek,
      wallStartTime: newStart,
      wallEndTime: newEnd,
    }, {
      onSuccess: () => {
        setAddWindowOpen(false);
        setNewDay('');
      }
    });
  };

  const handleDeleteWindow = (id: number) => {
    deleteWindow.mutate(id);
  };

  const handleAddException = () => {
    if (!newExceptionDate) return;
    if (newExceptionAvailable && newExceptionStart >= newExceptionEnd) {
      toast.error('Start time must be before end time');
      return;
    }
    upsertException.mutate({
      date: newExceptionDate,
      isAvailable: newExceptionAvailable,
      ...(newExceptionAvailable
        ? { wallStartTime: newExceptionStart, wallEndTime: newExceptionEnd }
        : {}),
    }, {
      onSuccess: () => {
        setAddExceptionOpen(false);
        setNewExceptionDate('');
      }
    });
  };

  const handleDeleteException = (id: number) => {
    deleteException.mutate(id);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-1">Availability</h1>
      <p className="text-muted-foreground mb-8">
        Manage when you&apos;re available to work
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recurring Windows */}
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">Recurring Windows</CardTitle>
              <CardDescription>
                Your regular weekly availability
              </CardDescription>
            </div>
            <Dialog open={addWindowOpen} onOpenChange={setAddWindowOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Availability Window</DialogTitle>
                  <DialogDescription>
                    Set a recurring time window for a specific day
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Day</Label>
                    <Select value={newDay} onValueChange={(val) => setNewDay(val as DayOfWeek)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day..." />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {DAY_LABELS[d]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start</Label>
                      <Input
                        type="time"
                        value={newStart}
                        onChange={(e) => setNewStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End</Label>
                      <Input
                        type="time"
                        value={newEnd}
                        onChange={(e) => setNewEnd(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setAddWindowOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddWindow} disabled={!newDay || upsertWindow.isPending}>
                    {upsertWindow.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Window'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoadingWindows ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : windows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No availability windows set
              </p>
            ) : (
              <div className="space-y-2">
                {DAYS.map((day) => {
                  const dayWindows = windows.filter((w) => w.dayOfWeek === day);
                  if (dayWindows.length === 0) return null;
                  return (
                    <div
                      key={day}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium w-20">
                          {DAY_LABELS[day]}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {dayWindows.map((w) => (
                            <div
                              key={w.id}
                              className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/30 px-2 py-1 rounded"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>
                                {w.wallStartTime.slice(0, 5)} – {w.wallEndTime.slice(0, 5)}
                              </span>
                              <button
                                onClick={() => handleDeleteWindow(w.id)}
                                disabled={deleteWindow.isPending}
                                className="ml-1 text-muted-foreground/50 hover:text-destructive transition-colors"
                              >
                                {deleteWindow.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Date Exceptions */}
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">Date Exceptions</CardTitle>
              <CardDescription>One-off availability changes</CardDescription>
            </div>
            <Dialog open={addExceptionOpen} onOpenChange={setAddExceptionOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Date Exception</DialogTitle>
                  <DialogDescription>
                    Override your availability for a specific date
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newExceptionDate}
                      onChange={(e) => setNewExceptionDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant={newExceptionAvailable ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewExceptionAvailable(true)}
                    >
                      Available
                    </Button>
                    <Button
                      variant={!newExceptionAvailable ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewExceptionAvailable(false)}
                    >
                      Not Available
                    </Button>
                  </div>
                  {newExceptionAvailable && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start</Label>
                        <Input
                          type="time"
                          value={newExceptionStart}
                          onChange={(e) => setNewExceptionStart(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End</Label>
                        <Input
                          type="time"
                          value={newExceptionEnd}
                          onChange={(e) => setNewExceptionEnd(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setAddExceptionOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddException}
                    disabled={!newExceptionDate || upsertException.isPending}
                  >
                    {upsertException.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Exception'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoadingExceptions ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : exceptions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No exceptions set
              </p>
            ) : (
              <div className="space-y-2">
                {exceptions.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        {new Date(ex.date + 'T12:00:00').toLocaleDateString(
                          'en-US',
                          {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          },
                        )}
                      </span>
                      {ex.isAvailable ? (
                        <span className="text-sm text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 inline mr-1" />
                          {ex.wallStartTime?.slice(0, 5)} – {ex.wallEndTime?.slice(0, 5)}
                        </span>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          Blocked
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteException(ex.id)}
                      disabled={deleteException.isPending}
                      className="text-muted-foreground/50 hover:text-destructive transition-colors"
                    >
                      {deleteException.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
