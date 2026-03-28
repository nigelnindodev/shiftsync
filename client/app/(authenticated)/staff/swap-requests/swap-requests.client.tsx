'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react';
import { useStaffPendingRequests } from '@/hooks/use-staff-pending-requests';
import { useAcceptSwap, useClaimDrop } from '@/hooks/use-staff-actions';
import type { PendingApprovalState } from '@/types/scheduling';

function badgeForState(state: PendingApprovalState) {
  switch (state) {
    case 'SWAP_REQUESTED':
      return { label: 'Incoming Swap', variant: 'secondary' as const };
    case 'SWAP_PENDING_APPROVAL':
      return { label: 'Swap Pending', variant: 'secondary' as const };
    case 'DROP_REQUESTED':
      return { label: 'Open Drop', variant: 'outline' as const };
    case 'DROP_PENDING_APPROVAL':
      return { label: 'Drop Pending', variant: 'outline' as const };
  }
}

export default function SwapRequestsView() {
  const {
    data: requests,
    isLoading,
    isError,
    refetch,
  } = useStaffPendingRequests();

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Swap & Drop Requests</h1>
        <p className="text-muted-foreground mt-1">
          Pending swap and drop requests relevant to you
        </p>
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
                Failed to load requests
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : !requests || requests.length === 0 ? (
          <Card className="card-shadow">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No pending requests</p>
            </CardContent>
          </Card>
        ) : (
          requests.map((req) => {
            const isAccepting = pendingAcceptId === req.assignmentId;
            const isClaiming = pendingClaimId === req.assignmentId;
            const badge = badgeForState(req.state);

            return (
              <Card key={req.assignmentId} className="card-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-16 text-center">
                    <p className="text-xs text-muted-foreground">
                      {req.shiftDate}
                    </p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {req.shiftTime}
                      </span>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {req.staffName}
                      </span>
                      {req.swapTargetName && (
                        <>
                          <span className="text-muted-foreground/40">
                            &rarr;
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {req.swapTargetName}
                          </span>
                        </>
                      )}
                      <span className="text-muted-foreground/40">&middot;</span>
                      <span className="text-sm text-muted-foreground capitalize">
                        {req.skillName}
                      </span>
                      <span className="text-muted-foreground/40">&middot;</span>
                      <span className="text-sm text-muted-foreground">
                        {req.locationName}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {(req.state === 'SWAP_REQUESTED' ||
                      req.state === 'SWAP_PENDING_APPROVAL') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={isAccepting}
                        onClick={() => handleAccept(req.assignmentId)}
                      >
                        {isAccepting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Accept
                      </Button>
                    )}
                    {req.state === 'DROP_REQUESTED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={isClaiming}
                        onClick={() => handleClaim(req.assignmentId)}
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
