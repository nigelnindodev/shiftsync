'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { mockTestingEmployees } from '@/lib/mock-data';
import { CalendarClock } from 'lucide-react';
import { toast } from 'sonner';

type Role = 'ADMIN' | 'MANAGER' | 'STAFF';

const roleLabels: Record<Role, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  STAFF: 'Staff',
};

const roleRoutes: Record<Role, string> = {
  ADMIN: '/admin',
  MANAGER: '/manager/shifts',
  STAFF: '/staff/schedule',
};

export default function TestLoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role | ''>('');
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const filteredEmployees = selectedRole
    ? mockTestingEmployees.filter((e) => e.role === selectedRole)
    : [];

  const handleLogin = () => {
    const employee = mockTestingEmployees.find(
      (e) => e.email === selectedEmployee,
    );
    if (!employee) return;

    localStorage.setItem('shiftsync-role', employee.role);
    localStorage.setItem('shiftsync-name', employee.name);
    toast.success(`Logged in as ${employee.name}`);
    router.push(roleRoutes[employee.role as Role]);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md card-shadow-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
            <CalendarClock className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">ShiftSync</CardTitle>
          <CardDescription>
            Select a role and employee to log in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Select
              value={selectedRole}
              onValueChange={(val) => {
                setSelectedRole(val as Role);
                setSelectedEmployee('');
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a role..." />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(roleLabels) as Role[]).map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleLabels[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Employee</label>
            <Select
              value={selectedEmployee}
              onValueChange={setSelectedEmployee}
              disabled={!selectedRole}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    selectedRole
                      ? 'Select an employee...'
                      : 'Select a role first'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredEmployees.map((emp) => (
                  <SelectItem key={emp.email} value={emp.email}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            onClick={handleLogin}
            disabled={!selectedEmployee}
          >
            Log In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
