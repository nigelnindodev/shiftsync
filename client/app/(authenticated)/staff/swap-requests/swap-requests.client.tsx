'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/use-profile';
import { usePendingApprovals } from '@/hooks/use-approvals';
import { useAcceptSwap, useClaimDrop } from '@/hooks/use-staff-actions';

export default function SwapRequestsView() {
  useProfile();

  // Use locationId 1 (Downtown) as default for demo/test data
  const locationId = 1;
  const { data: requests = [], isLoading } = usePendingApprovals(locationId);

  const acceptSwap = useAcceptSwap();
  const claimDrop = useClaimDrop();

  const handleAccept = (assignmentId: number) => {
    acceptSwap.mutate(assignmentId);
  };

  const handleClaim = (assignmentId: number) => {
    claimDrop.mutate(assignmentId);
  };

  const handleReject = () => {
    // API doesn't have a 'dismiss' for others' requests, so we just toast for now
    toast.info('Request dismissed locally');
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-1">Swap & Drop Requests</h1>
      <p className="text-muted-foreground mb-8">
        Pending requests for your shifts
      </p>

      <div className="space-y-3">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <Card className="card-shadow">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No pending requests</p>
            </CardContent>
          </Card>
        ) : (
          requests.map((req) => (
            <Card key={req.assignmentId} className="card-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{req.staffName}</span>
                    <Badge
                      variant={
                        req.state === 'SWAP_PENDING_APPROVAL'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {req.state === 'SWAP_PENDING_APPROVAL' ? 'Swap' : 'Drop'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {req.shiftDate}, {req.shiftTime}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {req.locationName} · {req.skillName}
                    </span>
                  </div>
                  {req.swapTargetName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Swap with: {req.swapTargetName}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  {req.state === 'SWAP_PENDING_APPROVAL' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={acceptSwap.isPending}
                      onClick={() => handleAccept(req.assignmentId)}
                    >
                      {acceptSwap.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Accept
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={claimDrop.isPending}
                      onClick={() => handleClaim(req.assignmentId)}
                    >
                      {claimDrop.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Claim
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={handleReject}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
