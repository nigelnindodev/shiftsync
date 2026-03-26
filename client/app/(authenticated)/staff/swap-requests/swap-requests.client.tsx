'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  MapPin,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useMySchedule } from '@/hooks/use-my-schedule';
import { useAcceptSwap, useClaimDrop } from '@/hooks/use-staff-actions';

const PENDING_STATES = new Set([
  'SWAP_PENDING_APPROVAL',
  'DROP_PENDING_APPROVAL',
]);

function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekRange(weekOffset: number) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  return {
    startDate: formatDateYMD(monday),
    endDate: formatDateYMD(nextMonday),
    weekLabel: monday,
  };
}

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

export default function SwapRequestsView() {
  const [weekOffset, setWeekOffset] = useState(0);
  const { startDate, endDate, weekLabel } = useMemo(
    () => getWeekRange(weekOffset),
    [weekOffset],
  );

  const {
    data: schedule,
    isLoading,
    isError,
    refetch,
  } = useMySchedule(startDate, endDate);

  const pendingRequests = useMemo(
    () => (schedule ?? []).filter((entry) => PENDING_STATES.has(entry.state)),
    [schedule],
  );

  const acceptSwap = useAcceptSwap();
  const claimDrop = useClaimDrop();
  const [pendingAcceptId, setPendingAcceptId] = useState<number | null>(null);
  const [pendingClaimId, setPendingClaimId] = useState<number | null>(null);

  const handleAccept = (assignmentId: number) => {
    setPendingAcceptId(assignmentId);
    acceptSwap.mutate(assignmentId, {
      onSettled: () => setPendingAcceptId(null),
    });
  };

  const handleClaim = (assignmentId: number) => {
    setPendingClaimId(assignmentId);
    claimDrop.mutate(assignmentId, {
      onSettled: () => setPendingClaimId(null),
    });
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Swap & Drop Requests</h1>
          <p className="text-muted-foreground mt-1">
            Pending requests on your shifts
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
              : weekLabel.toLocaleDateString('en-US', {
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

      <div className="space-y-3">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <Card className="card-shadow">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-3">
                Failed to load schedule
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : pendingRequests.length === 0 ? (
          <Card className="card-shadow">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No pending requests this week
              </p>
            </CardContent>
          </Card>
        ) : (
          pendingRequests.map((entry) => {
            const isAccepting = pendingAcceptId === entry.assignmentId;
            const isClaiming = pendingClaimId === entry.assignmentId;
            return (
              <Card key={entry.assignmentId} className="card-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-16 text-center">
                    <p className="text-xs text-muted-foreground">
                      {
                        formatDate(
                          entry.startTime,
                          entry.locationTimezone,
                        ).split(' ')[0]
                      }
                    </p>
                    <p className="text-lg font-bold">
                      {new Date(entry.startTime).toLocaleDateString('en-US', {
                        day: 'numeric',
                        timeZone: entry.locationTimezone,
                      })}
                    </p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {formatTime(entry.startTime, entry.locationTimezone)}{' '}
                        &ndash;{' '}
                        {formatTime(entry.endTime, entry.locationTimezone)}
                      </span>
                      <Badge
                        variant={
                          entry.state === 'SWAP_PENDING_APPROVAL'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {entry.state === 'SWAP_PENDING_APPROVAL'
                          ? 'Swap'
                          : 'Drop'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {entry.locationName}
                      </span>
                      <span className="text-muted-foreground/40">&middot;</span>
                      <span className="text-sm text-muted-foreground capitalize">
                        {entry.skillName}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {entry.state === 'SWAP_PENDING_APPROVAL' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={isAccepting}
                        onClick={() => handleAccept(entry.assignmentId)}
                      >
                        {isAccepting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Accept
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={isClaiming}
                        onClick={() => handleClaim(entry.assignmentId)}
                      >
                        {isClaiming ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Claim
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
