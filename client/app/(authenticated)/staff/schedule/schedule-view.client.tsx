'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { mockStaffSchedule, mockTestingEmployees } from '@/lib/mock-data';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Shuffle,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

function formatTime(iso: string, timezone: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function getStateBadge(state: string) {
  const map: Record<
    string,
    {
      variant: 'default' | 'secondary' | 'outline' | 'destructive';
      label: string;
    }
  > = {
    ASSIGNED: { variant: 'default', label: 'Assigned' },
    SWAP_REQUESTED: { variant: 'secondary', label: 'Swap Requested' },
    SWAP_PENDING_APPROVAL: { variant: 'secondary', label: 'Swap Pending' },
    DROP_REQUESTED: { variant: 'outline', label: 'Drop Requested' },
    DROP_PENDING_APPROVAL: { variant: 'outline', label: 'Drop Pending' },
    CANCELLED: { variant: 'destructive', label: 'Cancelled' },
  };
  const info = map[state] || { variant: 'outline' as const, label: state };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

export default function StaffScheduleView() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [swapTarget, setSwapTarget] = useState('');
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);

  const staffList = mockTestingEmployees.filter((e) => e.role === 'STAFF');

  const handleRequestSwap = () => {
    toast.success('Swap request submitted');
    setSwapDialogOpen(false);
    setSwapTarget('');
  };

  const handleRequestDrop = () => {
    toast.success('Drop request submitted');
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Schedule</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your upcoming shifts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((w) => w - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {weekOffset === 0
              ? 'This Week'
              : `${weekOffset > 0 ? '+' : ''}${weekOffset} weeks`}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((w) => w + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {mockStaffSchedule.map((shift) => (
          <Card key={shift.assignmentId} className="card-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-16 text-center">
                <p className="text-xs text-muted-foreground">
                  {formatDate(shift.startTime).split(' ')[0]}
                </p>
                <p className="text-lg font-bold">
                  {new Date(shift.startTime).getDate()}
                </p>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {formatTime(shift.startTime, shift.locationTimezone)} –{' '}
                    {formatTime(shift.endTime, shift.locationTimezone)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {shift.locationName}
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-sm text-muted-foreground capitalize">
                    {shift.skillName}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {getStateBadge(shift.state)}

                {shift.state === 'ASSIGNED' && (
                  <div className="flex gap-1">
                    <Dialog
                      open={swapDialogOpen}
                      onOpenChange={setSwapDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <Shuffle className="w-3.5 h-3.5" />
                          Swap
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Request Swap</DialogTitle>
                          <DialogDescription>
                            Select a staff member to swap this shift with
                          </DialogDescription>
                        </DialogHeader>
                        <Select
                          value={swapTarget}
                          onValueChange={setSwapTarget}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a staff member..." />
                          </SelectTrigger>
                          <SelectContent>
                            {staffList.map((s) => (
                              <SelectItem key={s.email} value={s.email}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setSwapDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleRequestSwap}
                            disabled={!swapTarget}
                          >
                            Submit Request
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={handleRequestDrop}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Drop
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
