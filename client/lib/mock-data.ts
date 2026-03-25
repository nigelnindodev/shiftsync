// Mock data for UI prototyping. Matches server DTO shapes.

export const mockProfile = {
  externalId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  email: 'manager.downtown@coastaleats.com',
  name: 'Sam Downtown',
  employee: {
    externalId: 'emp-a1b2c3d4',
    role: 'MANAGER' as const,
    homeTimezone: 'America/New_York',
    desiredHoursPerWeek: 40,
    desiredHoursNote: 'Full time',
  },
};

export const mockLocations = [
  { id: 1, name: 'Downtown', timezone: 'America/New_York' },
  { id: 2, name: 'Midtown', timezone: 'America/New_York' },
  { id: 3, name: 'Pier', timezone: 'America/Los_Angeles' },
  { id: 4, name: 'Harbor', timezone: 'America/Los_Angeles' },
];

export const mockSkills = [
  { id: 1, name: 'bartender' },
  { id: 2, name: 'line cook' },
  { id: 3, name: 'server' },
  { id: 4, name: 'host' },
];

export const mockTestingEmployees = [
  // Admins
  {
    externalId: 'ext-001',
    email: 'nigel@coastaleats.com',
    name: 'Nigel',
    role: 'ADMIN',
    homeTimezone: 'America/New_York',
  },
  {
    externalId: 'ext-002',
    email: 'alex@coastaleats.com',
    name: 'Alex',
    role: 'ADMIN',
    homeTimezone: 'America/New_York',
  },
  // Managers
  {
    externalId: 'ext-003',
    email: 'manager.downtown@coastaleats.com',
    name: 'Sam Downtown',
    role: 'MANAGER',
    homeTimezone: 'America/New_York',
  },
  {
    externalId: 'ext-004',
    email: 'manager.midtown@coastaleats.com',
    name: 'Morgan Midtown',
    role: 'MANAGER',
    homeTimezone: 'America/New_York',
  },
  {
    externalId: 'ext-005',
    email: 'manager.pier@coastaleats.com',
    name: 'Pat Pier',
    role: 'MANAGER',
    homeTimezone: 'America/Los_Angeles',
  },
  {
    externalId: 'ext-006',
    email: 'manager.harbor@coastaleats.com',
    name: 'Chris Harbor',
    role: 'MANAGER',
    homeTimezone: 'America/Los_Angeles',
  },
  // Staff
  {
    externalId: 'ext-007',
    email: 'john@coastaleats.com',
    name: 'John Bartender',
    role: 'STAFF',
    homeTimezone: 'America/New_York',
  },
  {
    externalId: 'ext-008',
    email: 'sarah@coastaleats.com',
    name: 'Sarah Server',
    role: 'STAFF',
    homeTimezone: 'America/New_York',
  },
  {
    externalId: 'ext-009',
    email: 'maria@coastaleats.com',
    name: 'Maria Line Cook',
    role: 'STAFF',
    homeTimezone: 'America/New_York',
  },
  {
    externalId: 'ext-010',
    email: 'david@coastaleats.com',
    name: 'David Bartender',
    role: 'STAFF',
    homeTimezone: 'America/New_York',
  },
  {
    externalId: 'ext-011',
    email: 'emma@coastaleats.com',
    name: 'Emma Host',
    role: 'STAFF',
    homeTimezone: 'America/Los_Angeles',
  },
  {
    externalId: 'ext-012',
    email: 'carlos@coastaleats.com',
    name: 'Carlos Line Cook',
    role: 'STAFF',
    homeTimezone: 'America/Los_Angeles',
  },
  {
    externalId: 'ext-013',
    email: 'lisa@coastaleats.com',
    name: 'Lisa Server',
    role: 'STAFF',
    homeTimezone: 'America/Los_Angeles',
  },
  {
    externalId: 'ext-014',
    email: 'james@coastaleats.com',
    name: 'James Bartender',
    role: 'STAFF',
    homeTimezone: 'America/Los_Angeles',
  },
  {
    externalId: 'ext-015',
    email: 'alexandra@coastaleats.com',
    name: 'Alexandra Server',
    role: 'STAFF',
    homeTimezone: 'America/New_York',
  },
];

export const mockStaffSchedule = [
  {
    assignmentId: 101,
    shiftId: 1,
    state: 'ASSIGNED',
    startTime: '2026-03-23T09:00:00Z',
    endTime: '2026-03-23T17:00:00Z',
    locationId: 1,
    locationName: 'Downtown',
    locationTimezone: 'America/New_York',
    skillId: 1,
    skillName: 'bartender',
  },
  {
    assignmentId: 102,
    shiftId: 2,
    state: 'ASSIGNED',
    startTime: '2026-03-24T09:00:00Z',
    endTime: '2026-03-24T17:00:00Z',
    locationId: 1,
    locationName: 'Downtown',
    locationTimezone: 'America/New_York',
    skillId: 1,
    skillName: 'bartender',
  },
  {
    assignmentId: 103,
    shiftId: 3,
    state: 'ASSIGNED',
    startTime: '2026-03-25T09:00:00Z',
    endTime: '2026-03-25T17:00:00Z',
    locationId: 2,
    locationName: 'Midtown',
    locationTimezone: 'America/New_York',
    skillId: 2,
    skillName: 'line cook',
  },
  {
    assignmentId: 104,
    shiftId: 4,
    state: 'SWAP_REQUESTED',
    startTime: '2026-03-26T12:00:00Z',
    endTime: '2026-03-26T20:00:00Z',
    locationId: 1,
    locationName: 'Downtown',
    locationTimezone: 'America/New_York',
    skillId: 3,
    skillName: 'server',
  },
  {
    assignmentId: 105,
    shiftId: 5,
    state: 'DROP_REQUESTED',
    startTime: '2026-03-28T14:00:00Z',
    endTime: '2026-03-28T22:00:00Z',
    locationId: 1,
    locationName: 'Downtown',
    locationTimezone: 'America/New_York',
    skillId: 1,
    skillName: 'bartender',
  },
];

export const mockAvailability = [
  { id: 1, dayOfWeek: 'MON', wallStartTime: '09:00', wallEndTime: '17:00' },
  { id: 2, dayOfWeek: 'TUE', wallStartTime: '09:00', wallEndTime: '17:00' },
  { id: 3, dayOfWeek: 'WED', wallStartTime: '09:00', wallEndTime: '17:00' },
  { id: 4, dayOfWeek: 'THU', wallStartTime: '09:00', wallEndTime: '17:00' },
  { id: 5, dayOfWeek: 'FRI', wallStartTime: '09:00', wallEndTime: '17:00' },
];

export const mockExceptions = [
  { id: 1, date: '2026-03-28', isAvailable: false },
  {
    id: 2,
    date: '2026-04-01',
    isAvailable: true,
    wallStartTime: '10:00',
    wallEndTime: '14:00',
  },
];

export const mockShifts = [
  {
    id: 1,
    locationId: 1,
    startTime: '2026-03-23T09:00:00Z',
    endTime: '2026-03-23T17:00:00Z',
    state: 'OPEN',
    skills: [
      {
        id: 1,
        skillId: 1,
        skillName: 'bartender',
        headcount: 1,
        assignedCount: 1,
      },
      {
        id: 2,
        skillId: 3,
        skillName: 'server',
        headcount: 2,
        assignedCount: 1,
      },
    ],
  },
  {
    id: 2,
    locationId: 1,
    startTime: '2026-03-24T09:00:00Z',
    endTime: '2026-03-24T17:00:00Z',
    state: 'PARTIALLY_FILLED',
    skills: [
      {
        id: 3,
        skillId: 1,
        skillName: 'bartender',
        headcount: 1,
        assignedCount: 1,
      },
      {
        id: 4,
        skillId: 3,
        skillName: 'server',
        headcount: 2,
        assignedCount: 0,
      },
    ],
  },
  {
    id: 3,
    locationId: 1,
    startTime: '2026-03-25T09:00:00Z',
    endTime: '2026-03-25T17:00:00Z',
    state: 'FILLED',
    skills: [
      {
        id: 5,
        skillId: 1,
        skillName: 'bartender',
        headcount: 1,
        assignedCount: 1,
      },
      {
        id: 6,
        skillId: 3,
        skillName: 'server',
        headcount: 2,
        assignedCount: 2,
      },
    ],
  },
  {
    id: 4,
    locationId: 1,
    startTime: '2026-03-26T17:00:00Z',
    endTime: '2026-03-27T01:00:00Z',
    state: 'OPEN',
    skills: [
      {
        id: 7,
        skillId: 2,
        skillName: 'line cook',
        headcount: 1,
        assignedCount: 0,
      },
      {
        id: 8,
        skillId: 3,
        skillName: 'server',
        headcount: 3,
        assignedCount: 1,
      },
    ],
  },
  {
    id: 5,
    locationId: 1,
    startTime: '2026-03-27T10:00:00Z',
    endTime: '2026-03-27T18:00:00Z',
    state: 'OPEN',
    skills: [
      { id: 9, skillId: 4, skillName: 'host', headcount: 1, assignedCount: 0 },
    ],
  },
  {
    id: 6,
    locationId: 1,
    startTime: '2026-03-28T09:00:00Z',
    endTime: '2026-03-28T17:00:00Z',
    state: 'CANCELLED',
    skills: [
      {
        id: 10,
        skillId: 1,
        skillName: 'bartender',
        headcount: 1,
        assignedCount: 0,
      },
    ],
  },
];

export const mockAssignments = [
  {
    assignmentId: 201,
    staffMemberId: 7,
    staffName: 'John Bartender',
    state: 'ASSIGNED',
  },
  {
    assignmentId: 202,
    staffMemberId: 8,
    staffName: 'Sarah Server',
    state: 'ASSIGNED',
  },
  {
    assignmentId: 203,
    staffMemberId: 9,
    staffName: 'Maria Line Cook',
    state: 'SWAP_REQUESTED',
  },
  {
    assignmentId: 204,
    staffMemberId: 15,
    staffName: 'Alexandra Server',
    state: 'ASSIGNED',
  },
];

export const mockEligibleStaff = [
  { staffMemberId: 7, name: 'John Bartender', hoursThisWeek: 32, warnings: [] },
  {
    staffMemberId: 10,
    name: 'David Bartender',
    hoursThisWeek: 24,
    warnings: [],
  },
  {
    staffMemberId: 12,
    name: 'Carlos Line Cook',
    hoursThisWeek: 35,
    warnings: [
      {
        code: 'WEEKLY_HOURS_APPROACHING',
        message: 'Employee will reach 40 hours this week',
      },
    ],
  },
];

export const mockPendingApprovals = [
  {
    assignmentId: 203,
    staffMemberId: 9,
    staffName: 'Maria Line Cook',
    state: 'SWAP_PENDING_APPROVAL',
    shiftDate: '2026-03-25',
    shiftTime: '09:00 - 17:00',
    locationName: 'Downtown',
    skillName: 'line cook',
    swapTargetName: 'Carlos Line Cook',
  },
  {
    assignmentId: 205,
    staffMemberId: 14,
    staffName: 'James Bartender',
    state: 'DROP_PENDING_APPROVAL',
    shiftDate: '2026-03-27',
    shiftTime: '14:00 - 22:00',
    locationName: 'Downtown',
    skillName: 'bartender',
    swapTargetName: null,
  },
];
