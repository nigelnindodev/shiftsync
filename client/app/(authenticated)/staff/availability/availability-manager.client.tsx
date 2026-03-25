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
import { mockAvailability, mockExceptions } from '@/lib/mock-data';
import { Clock, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
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
  const [windows, setWindows] = useState(mockAvailability);
  const [exceptions, setExceptions] =
    useState<
      Array<{
        id: number;
        date: string;
        isAvailable: boolean;
        wallStartTime?: string;
        wallEndTime?: string;
      }>
    >(mockExceptions);
  const [addWindowOpen, setAddWindowOpen] = useState(false);
  const [addExceptionOpen, setAddExceptionOpen] = useState(false);
  const [newDay, setNewDay] = useState('');
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('17:00');
  const [newExceptionDate, setNewExceptionDate] = useState('');
  const [newExceptionAvailable, setNewExceptionAvailable] = useState(true);
  const [newExceptionStart, setNewExceptionStart] = useState('09:00');
  const [newExceptionEnd, setNewExceptionEnd] = useState('17:00');

  const handleAddWindow = () => {
    if (!newDay) return;
    setWindows((prev) => [
      ...prev,
      {
        id: Date.now(),
        dayOfWeek: newDay,
        wallStartTime: newStart,
        wallEndTime: newEnd,
      },
    ]);
    toast.success('Availability window added');
    setAddWindowOpen(false);
    setNewDay('');
  };

  const handleDeleteWindow = (id: number) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
    toast.success('Availability window removed');
  };

  const handleAddException = () => {
    if (!newExceptionDate) return;
    setExceptions((prev) => [
      ...prev,
      {
        id: Date.now(),
        date: newExceptionDate,
        isAvailable: newExceptionAvailable,
        ...(newExceptionAvailable
          ? { wallStartTime: newExceptionStart, wallEndTime: newExceptionEnd }
          : {}),
      },
    ]);
    toast.success('Exception added');
    setAddExceptionOpen(false);
    setNewExceptionDate('');
  };

  const handleDeleteException = (id: number) => {
    setExceptions((prev) => prev.filter((e) => e.id !== id));
    toast.success('Exception removed');
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
                    <Select value={newDay} onValueChange={setNewDay}>
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
                  <Button onClick={handleAddWindow} disabled={!newDay}>
                    Add Window
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {windows.length === 0 ? (
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
                        {dayWindows.map((w) => (
                          <div
                            key={w.id}
                            className="flex items-center gap-1.5 text-sm text-muted-foreground"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {w.wallStartTime} – {w.wallEndTime}
                            </span>
                            <button
                              onClick={() => handleDeleteWindow(w.id)}
                              className="ml-1 text-muted-foreground/50 hover:text-destructive transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {DAYS.every((d) => !windows.some((w) => w.dayOfWeek === d)) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No windows configured
                  </p>
                )}
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
                    disabled={!newExceptionDate}
                  >
                    Add Exception
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {exceptions.length === 0 ? (
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
                          {ex.wallStartTime} – {ex.wallEndTime}
                        </span>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          Blocked
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteException(ex.id)}
                      className="text-muted-foreground/50 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
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
