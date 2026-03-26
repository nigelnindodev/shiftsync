'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, X, Loader2 } from 'lucide-react';
import { useProfile } from '@/hooks/use-profile';
import { usePendingApprovals } from '@/hooks/use-approvals';
import { useApproveSwapDrop } from '@/hooks/use-assignments';
import { useManagerLocations } from '@/hooks/use-reference-data';

export default function ApprovalsView() {
  useProfile(); // intentionally invoked for auth side-effects

  const { data: locations = [], isLoading: isLoadingLocations } =
    useManagerLocations();
  const [locationId, setLocationId] = useState<number | null>(null);

  const selectedLocationId = locationId ?? locations[0]?.id ?? 0;

  const {
    data: approvals = [],
    isLoading,
    error,
    refetch,
  } = usePendingApprovals(selectedLocationId);
  const approveMutation = useApproveSwapDrop();
  const [pendingId, setPendingId] = useState<number | null>(null);

  const handleDecision = (
    shiftId: number,
    slotId: number,
    assignmentId: number,
    approved: boolean,
  ) => {
    setPendingId(assignmentId);
    approveMutation.mutate(
      { shiftId, slotId, assignmentId, data: { approved } },
      { onSettled: () => setPendingId(null) },
    );
  };

  return (
    <div className="p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-1">Pending Approvals</h1>
          <p className="text-muted-foreground">
            Swap and drop requests awaiting your approval
          </p>
        </div>
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
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="card-shadow">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-3">
              Failed to load approvals
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : approvals.length === 0 ? (
        <Card className="card-shadow">
          <CardContent className="py-12 text-center">
            <Check className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              All caught up — no pending approvals
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="card-shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Skill</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="w-[140px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvals.map((req) => {
                const isPending = pendingId === req.assignmentId;
                return (
                  <TableRow key={req.assignmentId}>
                    <TableCell>
                      <Badge
                        variant={
                          req.state === 'SWAP_PENDING_APPROVAL'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {req.state === 'SWAP_PENDING_APPROVAL'
                          ? 'Swap'
                          : 'Drop'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {req.staffName}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{req.shiftDate}</p>
                        <p className="text-muted-foreground text-xs">
                          {req.shiftTime}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {req.skillName}
                    </TableCell>
                    <TableCell>
                      {req.swapTargetName ? (
                        <span className="text-sm text-muted-foreground">
                          → {req.swapTargetName}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Open claim
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 h-7"
                          disabled={isPending}
                          onClick={() =>
                            handleDecision(
                              req.shiftId,
                              req.slotId,
                              req.assignmentId,
                              true,
                            )
                          }
                        >
                          {isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-muted-foreground hover:text-destructive"
                          disabled={isPending}
                          onClick={() =>
                            handleDecision(
                              req.shiftId,
                              req.slotId,
                              req.assignmentId,
                              false,
                            )
                          }
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
