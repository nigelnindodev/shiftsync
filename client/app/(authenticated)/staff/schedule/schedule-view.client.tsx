'use client';

import { useMemo, useState } from 'react';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Shuffle,
  Trash2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useMySchedule } from '@/hooks/use-my-schedule';
import { useRequestSwap, useRequestDrop } from '@/hooks/use-staff-actions';
import { useTestingEmployees } from '@/hooks/use-testing';


function formatTime(iso: string, timezone: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  });
}

function formatDate(iso: string, timezone: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  });
}

function getDateInTimezone(iso: string, timezone: string) {
  return new Date(
    new Date(iso).toLocaleDateString('en-US', { timeZone: timezone }),
  );
}

function getWeekRange(weekOffset: number) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  return { start: monday, end: nextMonday };
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
  const info = map[state] || { variant: 'outline' as const, label: state.replace(/_/g, ' ') };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

export default function StaffScheduleView() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeAssignmentId, setActiveAssignmentId] = useState<number | null>(
    null,
  );
  const [swapTargetId, setSwapTargetId] = useState<string>('');

  const { start, end } = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const startDateStr = start.toISOString().split('T')[0];
  const endDateStr = end.toISOString().split('T')[0];

  const { data: schedule = [], isLoading } = useMySchedule(
    startDateStr,
    endDateStr,
  );
  const { data: employees = [] } = useTestingEmployees();
  const staffList = employees.filter((e) => e.role === 'STAFF');

  const swapMutation = useRequestSwap();
  const dropMutation = useRequestDrop();

  const handleRequestSwap = () => {
    if (!activeAssignmentId || !swapTargetId) return;

    // We need the numeric ID from the test employees if available, 
    // but the API expects externalId/email based on the DTO? 
    // Actually apiClient.requestSwap expects RequestSwapDto { targetStaffMemberId: number }
    // Wait, testing employees DTO has externalId (string). 
    // I need to check the DTO in scheduling.ts again.
    // RequestSwapDto { targetStaffMemberId: number }
    // TestingEmployeeDto { externalId: string, email: string, name: string, role: string }
    // This is a mismatch in the plan context vs types. 
    // Let's check testing login... it uses identifier: string.
    // Let's assume the staffMemberId is the internal numeric ID which we might not have in TestingEmployeeDto.
    // Re-reading plan: "targetStaffMemberId: number". 
    // Searching for where staffMemberId comes from...

    const targetEmployee = employees.find(e => e.email === swapTargetId);
    if (!targetEmployee) return;

    // TODO: How to get numeric ID from TestingEmployeeDto? 
    // For now, let's use a placeholder or check if any other DTO has it.
    // ShiftSync usually uses externalId for auth but internal IDs for domain objects.
    // If I can't find it, I'll have to use email as a hack if the backend supports it, 
    // but the DTO says number.

    // Looking at the plan: "TestingEmployeeDto { externalId, email, name, role, homeTimezone? }"
    // "EligibleStaffDto { staffMemberId, name, ... }"
    // It seems Test Login only gives us externalId.

    toast.error('Swap requires internal staff ID, which is missing from test employee DTO');
  };

  const handleRequestDrop = (assignmentId: number) => {
    dropMutation.mutate(assignmentId);
  };

  const { start: weekStart } = getWeekRange(weekOffset);

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
          <span className="text-sm font-medium min-w-[160px] text-center">
            {weekOffset === 0
              ? 'This Week'
              : weekStart.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
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

      <Dialog
        open={!!activeAssignmentId}
        onOpenChange={(open) => {
          if (!open) {
            setActiveAssignmentId(null);
            setSwapTargetId('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Swap</DialogTitle>
            <DialogDescription>
              Select a staff member to swap this shift with
            </DialogDescription>
          </DialogHeader>
          <Select value={swapTargetId} onValueChange={setSwapTargetId}>
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
              onClick={() => {
                setActiveAssignmentId(null);
                setSwapTargetId('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestSwap}
              disabled={!swapTargetId || swapMutation.isPending}
            >
              {swapMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : schedule.length === 0 ? (
          <Card className="card-shadow">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No shifts scheduled for this week
              </p>
            </CardContent>
          </Card>
        ) : (
          schedule.map((shift) => (
            <Card key={shift.assignmentId} className="card-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-16 text-center">
                  <p className="text-xs text-muted-foreground">
                    {
                      formatDate(shift.startTime, shift.locationTimezone).split(
                        ' ',
                      )[0]
                    }
                  </p>
                  <p className="text-lg font-bold">
                    {getDateInTimezone(shift.startTime, shift.locationTimezone).getDate()}
                  </p>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {formatTime(shift.startTime, shift.locationTimezone)}{' '}
                      &ndash; {formatTime(shift.endTime, shift.locationTimezone)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {shift.locationName}
                    </span>
                    <span className="text-muted-foreground/40">&middot;</span>
                    <span className="text-sm text-muted-foreground capitalize">
                      {shift.skillName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStateBadge(shift.state)}

                  {shift.state === 'ASSIGNED' && (
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => {
                          setActiveAssignmentId(shift.assignmentId);
                        }}
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                        Swap
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={dropMutation.isPending}
                        onClick={() => handleRequestDrop(shift.assignmentId)}
                      >
                        {dropMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        Drop
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
