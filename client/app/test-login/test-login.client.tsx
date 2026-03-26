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
import { CalendarClock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTestingEmployees, useTestingLogin } from '@/hooks/use-testing';
import type { EmployeeRole } from '@/types/scheduling';

const roleLabels: Record<EmployeeRole, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  STAFF: 'Staff',
};

const roleRoutes: Record<EmployeeRole, string> = {
  ADMIN: '/admin',
  MANAGER: '/manager/shifts',
  STAFF: '/staff/schedule',
};

export default function TestLoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<EmployeeRole | ''>('');
  const [selectedEmployeeEmail, setSelectedEmployeeEmail] = useState('');

  const { data: employees = [], isLoading: isLoadingEmployees } =
    useTestingEmployees();
  const loginMutation = useTestingLogin();

  const filteredEmployees = selectedRole
    ? employees.filter((e) => e.role === selectedRole)
    : [];

  const handleLogin = () => {
    const employee = employees.find((e) => e.email === selectedEmployeeEmail);
    if (!employee) return;

    loginMutation.mutate(employee.email, {
      onSuccess: () => {
        toast.success(`Logged in as ${employee.name}`);
        router.push(roleRoutes[employee.role as EmployeeRole]);
      },
    });
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
            Select a role and employee to log in (Testing Only)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Select
              value={selectedRole}
              onValueChange={(val) => {
                setSelectedRole(val as EmployeeRole);
                setSelectedEmployeeEmail('');
              }}
              disabled={isLoadingEmployees}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    isLoadingEmployees ? 'Loading...' : 'Select a role...'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(roleLabels) as EmployeeRole[]).map((role) => (
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
              value={selectedEmployeeEmail}
              onValueChange={setSelectedEmployeeEmail}
              disabled={!selectedRole || isLoadingEmployees}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !selectedRole
                      ? 'Select a role first'
                      : isLoadingEmployees
                        ? 'Loading...'
                        : 'Select an employee...'
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
            disabled={!selectedEmployeeEmail || loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              'Log In'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
