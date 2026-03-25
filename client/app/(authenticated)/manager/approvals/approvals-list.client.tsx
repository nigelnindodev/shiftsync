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
import { mockPendingApprovals } from '@/lib/mock-data';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ApprovalsView() {
  const [approvals, setApprovals] = useState(mockPendingApprovals);

  const handleApprove = (id: number) => {
    setApprovals((prev) => prev.filter((a) => a.assignmentId !== id));
    toast.success('Approved');
  };

  const handleReject = (id: number) => {
    setApprovals((prev) => prev.filter((a) => a.assignmentId !== id));
    toast.success('Rejected');
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-1">Pending Approvals</h1>
      <p className="text-muted-foreground mb-8">
        Swap and drop requests awaiting your approval
      </p>

      {approvals.length === 0 ? (
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
              {approvals.map((req) => (
                <TableRow key={req.assignmentId}>
                  <TableCell>
                    <Badge
                      variant={
                        req.state === 'SWAP_PENDING_APPROVAL'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {req.state === 'SWAP_PENDING_APPROVAL' ? 'Swap' : 'Drop'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{req.staffName}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{req.shiftDate}</p>
                      <p className="text-muted-foreground text-xs">
                        {req.shiftTime}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{req.skillName}</TableCell>
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
                        onClick={() => handleApprove(req.assignmentId)}
                      >
                        <Check className="w-3 h-3" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleReject(req.assignmentId)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
