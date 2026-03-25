'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockPendingApprovals } from '@/lib/mock-data';
import { Clock, MapPin, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function SwapRequestsView() {
  const [requests, setRequests] = useState(mockPendingApprovals);

  const handleAccept = (id: number) => {
    setRequests((prev) => prev.filter((r) => r.assignmentId !== id));
    toast.success('Swap accepted — pending manager approval');
  };

  const handleClaim = (id: number) => {
    setRequests((prev) => prev.filter((r) => r.assignmentId !== id));
    toast.success('Drop claimed — pending manager approval');
  };

  const handleReject = (id: number) => {
    setRequests((prev) => prev.filter((r) => r.assignmentId !== id));
    toast.success('Request dismissed');
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-1">Swap & Drop Requests</h1>
      <p className="text-muted-foreground mb-8">
        Pending requests for your shifts
      </p>

      <div className="space-y-3">
        {requests.length === 0 && (
          <Card className="card-shadow">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No pending requests</p>
            </CardContent>
          </Card>
        )}

        {requests.map((req) => (
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
                    onClick={() => handleAccept(req.assignmentId)}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => handleClaim(req.assignmentId)}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Claim
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleReject(req.assignmentId)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
