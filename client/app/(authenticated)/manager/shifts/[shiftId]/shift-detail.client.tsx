'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, MapPin, Trash2, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useShift } from '@/hooks/use-shifts';
import {
  useAllSlotAssignments,
  useEligibleStaff,
  useAssignStaff,
  useRemoveAssignment,
} from '@/hooks/use-assignments';
import { useLocations } from '@/hooks/use-reference-data';
import type {
  AssignmentResponseDto,
  SlotAssignmentsResponseDto,
} from '@/types/scheduling';

function getStateBadge(state: string): React.ReactElement {
  const map: Record<
    string,
    { variant: 'default' | 'secondary' | 'outline' | 'destructive' }
  > = {
    ASSIGNED: { variant: 'default' },
    SWAP_REQUESTED: { variant: 'secondary' },
    SWAP_PENDING_APPROVAL: { variant: 'secondary' },
    DROP_REQUESTED: { variant: 'outline' },
    DROP_PENDING_APPROVAL: { variant: 'outline' },
    CANCELLED: { variant: 'destructive' },
  };
  return (
    <Badge variant={map[state]?.variant || 'outline'}>
      {state.replace(/_/g, ' ')}
    </Badge>
  );
}

export default function ShiftDetailView({ shiftId }: { shiftId: number }) {
  const { data: shift, isLoading: isLoadingShift } = useShift(shiftId);
  const slotIds = shift?.skills.map((s) => s.id) || [];
  const { data: slots = [], isLoading: isLoadingSlots } = useAllSlotAssignments(shiftId, slotIds);
  const { data: locations = [] } = useLocations();

  const [activeSlotId, setActiveSlotId] = useState<number | null>(null);

  const { data: eligibleStaff = [], isLoading: isLoadingEligible } = useEligibleStaff(
    shiftId,
    activeSlotId ?? 0,
  );

  const assignStaffMutation = useAssignStaff();
  const removeAssignmentMutation = useRemoveAssignment();

  // Find location for timezone
  const location = shift
    ? locations.find((l) => l.id === shift.locationId)
    : undefined;
  const tz = location?.timezone ?? 'UTC';
  const locationName = location?.name ?? 'Unknown';

  const handleAssign = (staffMemberId: number, staffName: string) => {
    if (!activeSlotId) return;
    assignStaffMutation.mutate({
      shiftId,
      slotId: activeSlotId,
      data: { staffMemberId },
    }, {
      onSuccess: () => {
        toast.success(`${staffName} assigned`);
      }
    });
  };

  const handleRemove = (slotId: number, assignmentId: number) => {
    removeAssignmentMutation.mutate({
      shiftId,
      slotId,
      assignmentId,
    });
  };

  if (isLoadingShift) {
    return (
      <div className="p-8 flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="p-8">
        <Link
          href="/manager/shifts"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Shifts
        </Link>
        <p className="text-muted-foreground">Shift not found.</p>
      </div>
    );
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: tz,
    });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: tz,
    });

  return (
    <div className="p-8">
      <Link
        href="/manager/shifts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Shifts
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Shift #{shift.id}</h1>
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {formatDate(shift.startTime)}, {formatTime(shift.startTime)} &ndash;{' '}
            {formatTime(shift.endTime)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            {locationName}
          </span>
          <Badge variant={shift.state === 'FILLED' ? 'default' : 'secondary'}>
            {shift.state.replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Skill Slots & Assignments */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-base">Skill Slots</CardTitle>
            <CardDescription>
              Current assignments for each skill requirement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingSlots ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">No skill slots defined for this shift.</p>
            ) : (
              slots.map((slot: SlotAssignmentsResponseDto) => (
                <div key={slot.slotId} className={`space-y-3 p-3 rounded-lg border transition-colors ${activeSlotId === slot.slotId ? 'border-primary ring-1 ring-primary/20' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="cursor-pointer" onClick={() => setActiveSlotId(slot.slotId)}>
                      <p className="text-sm font-medium capitalize">
                        {slot.skillName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {slot.assignedCount} of {slot.headcount} filled
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          slot.assignedCount >= slot.headcount
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {slot.assignedCount}/{slot.headcount}
                      </Badge>
                      <Button
                        size="sm"
                        variant={activeSlotId === slot.slotId ? "default" : "outline"}
                        className="h-8 gap-1.5"
                        onClick={() => setActiveSlotId(slot.slotId)}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Assign
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {slot.assignments.map((a: AssignmentResponseDto) => (
                      <div
                        key={a.assignmentId}
                        className="flex items-center justify-between p-2.5 rounded-md bg-muted/30 border text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{a.staffName}</span>
                          {getStateBadge(a.state)}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive h-7 px-2"
                          disabled={removeAssignmentMutation.isPending}
                          onClick={() => handleRemove(slot.slotId, a.assignmentId)}
                        >
                          {removeAssignmentMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    ))}
                    {slot.assignments.length === 0 && (
                      <p className="text-xs text-muted-foreground italic pl-1">No staff assigned yet.</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Eligible Staff */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-base">Eligible Staff</CardTitle>
            <CardDescription>
              {activeSlotId
                ? `Available staff for ${slots.find((s: SlotAssignmentsResponseDto) => s.slotId === activeSlotId)?.skillName || 'selected slot'}`
                : 'Select a skill slot to see eligible staff'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!activeSlotId ? (
              <div className="py-20 text-center border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">Select a skill slot on the left to assign staff</p>
              </div>
            ) : isLoadingEligible ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : eligibleStaff.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No eligible staff found for this slot.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Warnings</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eligibleStaff.map((staff) => (
                    <TableRow key={staff.staffMemberId}>
                      <TableCell className="font-medium">{staff.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {staff.hoursThisWeek}h
                      </TableCell>
                      <TableCell>
                        {staff.warnings.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {staff.warnings.map((w) => (
                              <Badge
                                key={w.code}
                                variant="outline"
                                className="text-[10px] text-accent"
                              >
                                {w.code.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 h-7"
                          disabled={assignStaffMutation.isPending}
                          onClick={() =>
                            handleAssign(staff.staffMemberId, staff.name)
                          }
                        >
                          {assignStaffMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                          Assign
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
