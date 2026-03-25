'use client';

import Link from 'next/link';
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
import {
  mockShifts,
  mockAssignments,
  mockEligibleStaff,
} from '@/lib/mock-data';
import { ArrowLeft, Clock, MapPin, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

function getStateBadge(state: string) {
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

export default function ShiftDetailView({
  params,
}: {
  params: { shiftId: string };
}) {
  const shiftId = parseInt(params.shiftId);
  const shift = mockShifts.find((s) => s.id === shiftId) || mockShifts[0];

  const handleAssign = (staffName: string) => {
    toast.success(`${staffName} assigned to shift`);
  };

  const handleRemove = (staffName: string) => {
    toast.success(`${staffName} removed from shift`);
  };

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
            {new Date(shift.startTime).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
            ,{' '}
            {new Date(shift.startTime).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}{' '}
            –{' '}
            {new Date(shift.endTime).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            Downtown
          </span>
          <Badge variant={shift.state === 'FILLED' ? 'default' : 'secondary'}>
            {shift.state.replace('_', ' ')}
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
            {shift.skills.map((slot) => (
              <div key={slot.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {slot.skillName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {slot.assignedCount} of {slot.headcount} filled
                    </p>
                  </div>
                  <Badge
                    variant={
                      slot.assignedCount >= slot.headcount
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {slot.assignedCount}/{slot.headcount}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  {mockAssignments
                    .filter(
                      () =>
                        slot.skillName === 'bartender' ||
                        slot.skillName === 'server',
                    )
                    .slice(0, slot.assignedCount)
                    .map((a) => (
                      <div
                        key={a.assignmentId}
                        className="flex items-center justify-between p-2.5 rounded-md border text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{a.staffName}</span>
                          {getStateBadge(a.state)}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive h-7 px-2"
                          onClick={() => handleRemove(a.staffName)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Eligible Staff */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-base">Eligible Staff</CardTitle>
            <CardDescription>
              Available staff that meet all constraints
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                {mockEligibleStaff.map((staff) => (
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
                        onClick={() => handleAssign(staff.name)}
                      >
                        <UserPlus className="w-3 h-3" />
                        Assign
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
