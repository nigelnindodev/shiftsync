'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { mockShifts, mockSkills } from '@/lib/mock-data';
import { Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

function getStateBadge(state: string) {
  const map: Record<
    string,
    { variant: 'default' | 'secondary' | 'outline' | 'destructive' }
  > = {
    OPEN: { variant: 'default' },
    PARTIALLY_FILLED: { variant: 'secondary' },
    FILLED: { variant: 'default' },
    CANCELLED: { variant: 'destructive' },
  };
  return (
    <Badge variant={map[state]?.variant || 'outline'}>
      {state.replace('_', ' ')}
    </Badge>
  );
}

export default function ManagerShifts() {
  const [createOpen, setCreateOpen] = useState(false);
  const [shiftDate, setShiftDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [skillSlots, setSkillSlots] = useState<
    Array<{ skillId: string; headcount: number }>
  >([{ skillId: '', headcount: 1 }]);

  const addSkillSlot = () => {
    setSkillSlots((prev) => [...prev, { skillId: '', headcount: 1 }]);
  };

  const removeSkillSlot = (index: number) => {
    setSkillSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    toast.success('Shift created');
    setCreateOpen(false);
    setShiftDate('');
    setStartTime('09:00');
    setEndTime('17:00');
    setSkillSlots([{ skillId: '', headcount: 1 }]);
  };

  const handleCancel = (id: number) => {
    toast.success(`Shift #${id} cancelled`);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Shifts</h1>
          <p className="text-muted-foreground mt-1">
            Downtown — create and manage shifts
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Shift
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Shift</DialogTitle>
              <DialogDescription>
                Add a new shift with skill requirements
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value="Downtown" disabled />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={shiftDate}
                  onChange={(e) => setShiftDate(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Skill Slots</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addSkillSlot}
                    className="gap-1 text-xs"
                  >
                    <Plus className="w-3 h-3" /> Add Skill
                  </Button>
                </div>
                {skillSlots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select
                      value={slot.skillId}
                      onValueChange={(val) => {
                        const next = [...skillSlots];
                        next[i].skillId = val;
                        setSkillSlots(next);
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select skill..." />
                      </SelectTrigger>
                      <SelectContent>
                        {mockSkills.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      value={slot.headcount}
                      onChange={(e) => {
                        const next = [...skillSlots];
                        next[i].headcount = parseInt(e.target.value) || 1;
                        setSkillSlots(next);
                      }}
                      className="w-20"
                    />
                    {skillSlots.length > 1 && (
                      <button
                        onClick={() => removeSkillSlot(i)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!shiftDate}>
                Create Shift
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="card-shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Skill Slots</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockShifts.map((shift) => (
              <TableRow key={shift.id}>
                <TableCell>
                  <Link
                    href={`/manager/shifts/${shift.id}`}
                    className="font-medium hover:text-primary transition-colors"
                  >
                    {new Date(shift.startTime).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Link>
                </TableCell>
                <TableCell>
                  {new Date(shift.startTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}{' '}
                  –{' '}
                  {new Date(shift.endTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </TableCell>
                <TableCell>{getStateBadge(shift.state)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {shift.skills.map((s) => (
                      <Badge
                        key={s.id}
                        variant="outline"
                        className="text-[10px] font-normal"
                      >
                        {s.skillName}: {s.assignedCount}/{s.headcount}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {shift.state !== 'CANCELLED' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleCancel(shift.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
