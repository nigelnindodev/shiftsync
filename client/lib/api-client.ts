import type {
  ApproveSwapDropDto,
  AssignmentResponseDto,
  CreateAssignmentDto,
  CreateShiftDto,
  CreateStaffDto,
  EligibleStaffDto,
  LocationResponseDto,
  PendingApprovalDto,
  RequestSwapDto,
  ShiftResponseDto,
  SkillResponseDto,
  StaffAvailabilityExceptionResponseDto,
  StaffAvailabilityResponseDto,
  StaffLocationDto,
  StaffScheduleEntryDto,
  TestingEmployeeDto,
  UpsertAvailabilityDto,
  UpsertExceptionDto,
} from '@/types/scheduling';
import type {
  ExternalEmployeeDetailsDto,
  UpdateEmployeeDto,
} from '@/types/user';
import { UnauthorizedError } from './errors';

const serverUrl = process.env.NEXT_PUBLIC_SERVER_BASE_URL;

async function handleResponse(response: Response) {
  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    const text = await response.text();
    throw new Error(`${response.status}: ${text}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export const apiClient = {
  // ---------------------------------------------------------------------------
  // User Profile
  // ---------------------------------------------------------------------------

  async getProfile(): Promise<ExternalEmployeeDetailsDto> {
    const response = await fetch(`${serverUrl}/user/profile`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
  },

  async updateProfile(
    data: UpdateEmployeeDto,
  ): Promise<ExternalEmployeeDetailsDto> {
    const response = await fetch(`${serverUrl}/user/profile`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // ---------------------------------------------------------------------------
  // Testing
  // ---------------------------------------------------------------------------

  async getTestingEmployees(): Promise<TestingEmployeeDto[]> {
    const response = await fetch(`${serverUrl}/testing/employees`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
  },

  async testingLogin(identifier: string): Promise<void> {
    const response = await fetch(`${serverUrl}/testing/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier }),
    });
    await handleResponse(response);
  },

  async testingLogout(): Promise<void> {
    const response = await fetch(`${serverUrl}/testing/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    await handleResponse(response);
  },

  async resetDatabase(): Promise<{ message: string }> {
    const response = await fetch(`${serverUrl}/testing/reset-database`, {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse(response);
  },

  // ---------------------------------------------------------------------------
  // Reference Data
  // ---------------------------------------------------------------------------

  async getLocations(): Promise<LocationResponseDto[]> {
    const response = await fetch(`${serverUrl}/locations`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
  },

  async getManagerLocations(): Promise<LocationResponseDto[]> {
    const response = await fetch(`${serverUrl}/manager/locations`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
  },

  async getSkills(): Promise<SkillResponseDto[]> {
    const response = await fetch(`${serverUrl}/skills`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
  },

  // ---------------------------------------------------------------------------
  // Staff Schedule
  // ---------------------------------------------------------------------------

  async getMySchedule(
    startDate: string,
    endDate: string,
  ): Promise<StaffScheduleEntryDto[]> {
    const params = new URLSearchParams({ startDate, endDate });
    const response = await fetch(`${serverUrl}/staff/me/schedule?${params}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
  },

  // ---------------------------------------------------------------------------
  // Staff Availability
  // ---------------------------------------------------------------------------

  async getAvailability(
    staffId: number,
  ): Promise<StaffAvailabilityResponseDto[]> {
    const response = await fetch(`${serverUrl}/staff/availability/${staffId}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
  },

  async upsertAvailability(data: UpsertAvailabilityDto): Promise<void> {
    const response = await fetch(`${serverUrl}/staff/availability`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    await handleResponse(response);
  },

  async deleteAvailability(availabilityId: number): Promise<void> {
    const response = await fetch(
      `${serverUrl}/staff/availability/${availabilityId}`,
      { method: 'DELETE', credentials: 'include' },
    );
    await handleResponse(response);
  },

  async getAvailabilityExceptions(
    staffId: number,
    startDate: string,
    endDate: string,
  ): Promise<StaffAvailabilityExceptionResponseDto[]> {
    const params = new URLSearchParams({ startDate, endDate });
    const response = await fetch(
      `${serverUrl}/staff/availability/${staffId}/exceptions?${params}`,
      {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      },
    );
    return handleResponse(response);
  },

  async upsertException(data: UpsertExceptionDto): Promise<void> {
    const response = await fetch(`${serverUrl}/staff/availability/exceptions`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    await handleResponse(response);
  },

  async deleteException(exceptionId: number): Promise<void> {
    const response = await fetch(
      `${serverUrl}/staff/availability/exceptions/${exceptionId}`,
      { method: 'DELETE', credentials: 'include' },
    );
    await handleResponse(response);
  },

  // ---------------------------------------------------------------------------
  // Staff Swap / Drop Actions
  // ---------------------------------------------------------------------------

  async requestSwap(assignmentId: number, data: RequestSwapDto): Promise<void> {
    const response = await fetch(
      `${serverUrl}/staff/me/assignments/${assignmentId}/swap`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    );
    await handleResponse(response);
  },

  async acceptSwap(assignmentId: number): Promise<void> {
    const response = await fetch(
      `${serverUrl}/staff/me/assignments/${assignmentId}/swap/accept`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      },
    );
    await handleResponse(response);
  },

  async requestDrop(assignmentId: number): Promise<void> {
    const response = await fetch(
      `${serverUrl}/staff/me/assignments/${assignmentId}/drop`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      },
    );
    await handleResponse(response);
  },

  async claimDrop(assignmentId: number): Promise<void> {
    const response = await fetch(
      `${serverUrl}/staff/me/assignments/${assignmentId}/drop/claim`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      },
    );
    await handleResponse(response);
  },

  // ---------------------------------------------------------------------------
  // Manager — Shifts
  // ---------------------------------------------------------------------------

  async getShifts(
    locationId: number,
    startDate: string,
    endDate: string,
  ): Promise<ShiftResponseDto[]> {
    const params = new URLSearchParams({
      locationId: String(locationId),
      startDate,
      endDate,
    });
    const response = await fetch(`${serverUrl}/shifts?${params}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
  },

  async getShift(shiftId: number): Promise<ShiftResponseDto> {
    const response = await fetch(`${serverUrl}/shifts/${shiftId}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
  },

  async createShift(data: CreateShiftDto): Promise<ShiftResponseDto> {
    const response = await fetch(`${serverUrl}/shifts`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async cancelShift(shiftId: number): Promise<void> {
    const response = await fetch(`${serverUrl}/shifts/${shiftId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    await handleResponse(response);
  },

  // ---------------------------------------------------------------------------
  // Manager — Assignments
  // ---------------------------------------------------------------------------

  async getAssignments(
    shiftId: number,
    slotId: number,
  ): Promise<AssignmentResponseDto[]> {
    const response = await fetch(
      `${serverUrl}/shifts/${shiftId}/skills/${slotId}/assignments`,
      {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      },
    );
    return handleResponse(response);
  },

  async getEligibleStaff(
    shiftId: number,
    slotId: number,
  ): Promise<EligibleStaffDto[]> {
    const response = await fetch(
      `${serverUrl}/shifts/${shiftId}/skills/${slotId}/eligible-staff`,
      {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      },
    );
    return handleResponse(response);
  },

  async assignStaff(
    shiftId: number,
    slotId: number,
    data: CreateAssignmentDto,
  ): Promise<void> {
    const response = await fetch(
      `${serverUrl}/shifts/${shiftId}/skills/${slotId}/assignments`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    );
    await handleResponse(response);
  },

  async removeAssignment(
    shiftId: number,
    slotId: number,
    assignmentId: number,
  ): Promise<void> {
    const response = await fetch(
      `${serverUrl}/shifts/${shiftId}/skills/${slotId}/assignments/${assignmentId}`,
      {
        method: 'DELETE',
        credentials: 'include',
      },
    );
    await handleResponse(response);
  },

  async approveSwapDrop(
    shiftId: number,
    slotId: number,
    assignmentId: number,
    data: ApproveSwapDropDto,
  ): Promise<void> {
    const response = await fetch(
      `${serverUrl}/shifts/${shiftId}/skills/${slotId}/assignments/${assignmentId}/swap-drop`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    );
    await handleResponse(response);
  },

  // ---------------------------------------------------------------------------
  // Manager — Pending Approvals
  // ---------------------------------------------------------------------------

  async getPendingApprovals(locationId: number): Promise<PendingApprovalDto[]> {
    const params = new URLSearchParams({ locationId: String(locationId) });
    const response = await fetch(
      `${serverUrl}/shifts/pending-approvals?${params}`,
      {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      },
    );
    return handleResponse(response);
  },

  // ---------------------------------------------------------------------------
  // Manager — Staff
  // ---------------------------------------------------------------------------

  async getStaffForLocation(locationId: number): Promise<StaffLocationDto[]> {
    const response = await fetch(
      `${serverUrl}/manager/locations/${locationId}/staff`,
      {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      },
    );
    return handleResponse(response);
  },

  async createStaff(
    locationId: number,
    data: CreateStaffDto,
  ): Promise<StaffLocationDto> {
    const response = await fetch(
      `${serverUrl}/manager/locations/${locationId}/staff`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    );
    return handleResponse(response);
  },
};
