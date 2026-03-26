import { DataSource, Repository } from 'typeorm';
import { Temporal } from '@js-temporal/polyfill';
import {
  Location,
  Skill,
  StaffSkill,
  LocationCertification,
  StaffAvailability,
  ManagerLocation,
  DayOfWeek,
} from '../staffing/entities';
import {
  Shift,
  ShiftSkill,
  Assignment,
  ShiftState,
  AssignmentState,
  Schedule,
  ScheduleState,
} from '../scheduling/entities';
import { User } from '../users/entity/user.entity';
import { Employee } from '../users/entity/employee.entity';
import { EmployeeRole } from '../users/user.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function upsertLocation(
  repo: Repository<Location>,
  data: { name: string; timezone: string; brand: string },
): Promise<Location> {
  const existing = await repo.findOne({ where: { name: data.name } });
  if (existing) {
    console.log(`Location "${data.name}" already exists`);
    return existing;
  }
  const saved = await repo.save(repo.create(data));
  console.log(`Created location: ${data.name}`);
  return saved;
}

async function upsertSkill(
  repo: Repository<Skill>,
  name: string,
): Promise<Skill> {
  const existing = await repo.findOne({ where: { name } });
  if (existing) return existing;
  const saved = await repo.save(repo.create({ name }));
  console.log(`Created skill: ${name}`);
  return saved;
}

async function upsertUser(
  userRepo: Repository<User>,
  email: string,
  name: string,
): Promise<User> {
  const existing = await userRepo.findOne({ where: { email } });
  if (existing) return existing;
  return userRepo.save(userRepo.create({ email, name }));
}

async function upsertEmployee(
  employeeRepo: Repository<Employee>,
  userRepo: Repository<User>,
  email: string,
  name: string,
  role: EmployeeRole,
  homeTimezone: string,
  desiredHoursPerWeek?: number,
): Promise<Employee> {
  const existing = await employeeRepo.findOne({
    where: { user: { email } },
    relations: ['user'],
  });
  if (existing) {
    console.log(`Employee "${email}" already exists`);
    return existing;
  }
  const user = await upsertUser(userRepo, email, name);
  const emp = await employeeRepo.save(
    employeeRepo.create({
      externalId: user.externalId,
      role,
      homeTimezone,
      ...(desiredHoursPerWeek !== undefined ? { desiredHoursPerWeek } : {}),
    }),
  );
  console.log(`Created ${role}: ${email}`);
  return emp;
}

async function linkManagerLocation(
  repo: Repository<ManagerLocation>,
  managerId: ManagerLocation['managerId'],
  locationId: ManagerLocation['locationId'],
): Promise<void> {
  const existing = await repo.findOne({ where: { managerId, locationId } });
  if (!existing) {
    await repo.save(repo.create({ managerId, locationId }));
  }
}

async function linkCertification(
  repo: Repository<LocationCertification>,
  staffMemberId: LocationCertification['staffMemberId'],
  locationId: LocationCertification['locationId'],
): Promise<void> {
  const existing = await repo.findOne({ where: { staffMemberId, locationId } });
  if (!existing) {
    await repo.save(repo.create({ staffMemberId, locationId }));
  }
}

async function linkSkill(
  repo: Repository<StaffSkill>,
  staffMemberId: StaffSkill['staffMemberId'],
  skillId: StaffSkill['skillId'],
): Promise<void> {
  const existing = await repo.findOne({ where: { staffMemberId, skillId } });
  if (!existing) {
    await repo.save(repo.create({ staffMemberId, skillId }));
  }
}

async function linkAvailability(
  repo: Repository<StaffAvailability>,
  staffMemberId: StaffAvailability['staffMemberId'],
  dayOfWeek: DayOfWeek,
  wallStartTime: string,
  wallEndTime: string,
): Promise<void> {
  const existing = await repo.findOne({
    where: { staffMemberId, dayOfWeek, wallStartTime, wallEndTime },
  });
  if (!existing) {
    await repo.save(
      repo.create({ staffMemberId, dayOfWeek, wallStartTime, wallEndTime }),
    );
  }
}

async function upsertShift(
  repo: Repository<Shift>,
  locationId: Shift['locationId'],
  startTime: Date,
  endTime: Date,
  state: ShiftState,
  scheduleId?: number,
): Promise<Shift> {
  const existing = await repo.findOne({
    where: { locationId, startTime, endTime },
  });
  if (existing) return existing;
  return repo.save(
    repo.create({ locationId, startTime, endTime, state, scheduleId }),
  );
}

async function upsertSchedule(
  repo: Repository<Schedule>,
  locationId: number,
  weekOf: string,
  state: ScheduleState,
  publishedAt?: Date,
  publishedByManagerId?: number,
): Promise<Schedule> {
  const existing = await repo.findOne({
    where: { locationId, weekOf },
  });
  if (existing) return existing;
  return repo.save(
    repo.create({
      locationId,
      weekOf,
      state,
      publishedAt,
      publishedByManagerId,
    }),
  );
}

async function upsertShiftSkill(
  repo: Repository<ShiftSkill>,
  shiftId: ShiftSkill['shiftId'],
  skillId: ShiftSkill['skillId'],
  headcount: number,
): Promise<ShiftSkill> {
  const existing = await repo.findOne({ where: { shiftId, skillId } });
  if (existing) return existing;
  return repo.save(repo.create({ shiftId, skillId, headcount }));
}

async function upsertAssignment(
  repo: Repository<Assignment>,
  shiftSkillId: Assignment['shiftSkillId'],
  staffMemberId: Assignment['staffMemberId'],
  state: AssignmentState,
  assignedByManagerId?: number,
): Promise<Assignment> {
  const existing = await repo.findOne({
    where: { shiftSkillId, staffMemberId },
  });
  if (existing) return existing;
  return repo.save(
    repo.create({ shiftSkillId, staffMemberId, state, assignedByManagerId }),
  );
}

function toDate(zdt: Temporal.ZonedDateTime, h: number, m = 0): Date {
  return new Date(
    zdt
      .with({ hour: h, minute: m, second: 0, nanosecond: 0 })
      .toInstant()
      .toString(),
  );
}

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------

export async function runSeed(
  externalDs?: DataSource,
  checkDataExists = false,
): Promise<void> {
  const ownConnection = !externalDs;
  let dataSource: DataSource;

  if (externalDs) {
    dataSource = externalDs;
  } else {
    console.log('Connecting to database...');
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.PG_HOST ?? '0.0.0.0',
      port: parseInt(process.env.PG_PORT ?? '5432', 10),
      username: process.env.PG_USERNAME ?? 'changeuser',
      password: process.env.PG_PASSWORD ?? 'changepass',
      database: process.env.PG_DATABASE ?? 'change_dbname_shiftsync',
      entities: [__dirname + '/../**/*.entity.ts'],
      synchronize: true,
      logging: true,
    });
    await dataSource.initialize();
  }

  if (checkDataExists) {
    const adminCount: Array<{ count: string }> = await dataSource.query(
      `SELECT COUNT(*) FROM employee WHERE role = 'ADMIN'`,
    );
    if (parseInt(adminCount[0].count, 10) > 0) {
      console.log('Seed data already exists, skipping...');
      if (ownConnection) await dataSource.destroy();
      return;
    }
  }

  console.log('Running seed...');

  const locationRepo = dataSource.getRepository(Location);
  const skillRepo = dataSource.getRepository(Skill);
  const staffSkillRepo = dataSource.getRepository(StaffSkill);
  const locationCertRepo = dataSource.getRepository(LocationCertification);
  const availabilityRepo = dataSource.getRepository(StaffAvailability);
  const managerLocationRepo = dataSource.getRepository(ManagerLocation);
  const userRepo = dataSource.getRepository(User);
  const employeeRepo = dataSource.getRepository(Employee);
  const shiftRepo = dataSource.getRepository(Shift);
  const shiftSkillRepo = dataSource.getRepository(ShiftSkill);
  const assignmentRepo = dataSource.getRepository(Assignment);
  const scheduleRepo = dataSource.getRepository(Schedule);

  // -------------------------------------------------------------------------
  // Locations  (index 0=Downtown ET, 1=Midtown ET, 2=Pier PT, 3=Harbor PT)
  // -------------------------------------------------------------------------
  const locations = await Promise.all([
    upsertLocation(locationRepo, {
      name: 'Downtown',
      timezone: 'America/New_York',
      brand: 'Coastal Eats',
    }),
    upsertLocation(locationRepo, {
      name: 'Midtown',
      timezone: 'America/New_York',
      brand: 'Coastal Eats',
    }),
    upsertLocation(locationRepo, {
      name: 'Pier',
      timezone: 'America/Los_Angeles',
      brand: 'Coastal Eats',
    }),
    upsertLocation(locationRepo, {
      name: 'Harbor',
      timezone: 'America/Los_Angeles',
      brand: 'Coastal Eats',
    }),
  ]);

  // -------------------------------------------------------------------------
  // Skills  (index 0=bartender, 1=line cook, 2=server, 3=host)
  // -------------------------------------------------------------------------
  const skills = await Promise.all([
    upsertSkill(skillRepo, 'bartender'),
    upsertSkill(skillRepo, 'line cook'),
    upsertSkill(skillRepo, 'server'),
    upsertSkill(skillRepo, 'host'),
  ]);

  // -------------------------------------------------------------------------
  // Admins
  // -------------------------------------------------------------------------
  for (const a of [
    { email: 'nigel@coastaleats.com', name: 'Nigel (Admin)' },
    { email: 'alex@coastaleats.com', name: 'Alex (Admin)' },
  ]) {
    await upsertEmployee(
      employeeRepo,
      userRepo,
      a.email,
      a.name,
      EmployeeRole.ADMIN,
      'America/New_York',
    );
  }

  // -------------------------------------------------------------------------
  // Managers
  //
  // Layout:
  //   Sam       → Downtown only
  //   Jordan    → Downtown + Midtown        (multi-location ET manager)
  //   Morgan    → Midtown only
  //   Riley     → Midtown + Pier            (cross-timezone manager)
  //   Pat       → Pier only
  //   Taylor    → Pier + Harbor             (multi-location PT manager)
  //   Chris     → Harbor only
  //   Casey     → Downtown + Harbor         (coast-to-coast manager)
  // -------------------------------------------------------------------------
  type ManagerDefinition = {
    email: string;
    name: string;
    tz: string;
    locationIdxs: number[];
  };
  const managerDefinitions: ManagerDefinition[] = [
    {
      email: 'manager.sam@coastaleats.com',
      name: 'Sam Chen',
      tz: 'America/New_York',
      locationIdxs: [0],
    },
    {
      email: 'manager.jordan@coastaleats.com',
      name: 'Jordan Rivera',
      tz: 'America/New_York',
      locationIdxs: [0, 1],
    },
    {
      email: 'manager.morgan@coastaleats.com',
      name: 'Morgan Lee',
      tz: 'America/New_York',
      locationIdxs: [1],
    },
    {
      email: 'manager.riley@coastaleats.com',
      name: 'Riley Nguyen',
      tz: 'America/New_York',
      locationIdxs: [1, 2],
    },
    {
      email: 'manager.pat@coastaleats.com',
      name: 'Pat Okafor',
      tz: 'America/Los_Angeles',
      locationIdxs: [2],
    },
    {
      email: 'manager.taylor@coastaleats.com',
      name: 'Taylor Kim',
      tz: 'America/Los_Angeles',
      locationIdxs: [2, 3],
    },
    {
      email: 'manager.chris@coastaleats.com',
      name: 'Chris Ortega',
      tz: 'America/Los_Angeles',
      locationIdxs: [3],
    },
    {
      email: 'manager.casey@coastaleats.com',
      name: 'Casey Adeyemi',
      tz: 'America/New_York',
      locationIdxs: [0, 3],
    },
  ];

  const savedManagers: Employee[] = [];
  for (const managerDefinition of managerDefinitions) {
    const emp = await upsertEmployee(
      employeeRepo,
      userRepo,
      managerDefinition.email,
      managerDefinition.name,
      EmployeeRole.MANAGER,
      managerDefinition.tz,
    );
    savedManagers.push(emp);
    for (const idx of managerDefinition.locationIdxs) {
      await linkManagerLocation(managerLocationRepo, emp.id, locations[idx].id);
    }
  }

  const managerByLocationIdx: Record<number, number> = {
    0: savedManagers[0].id, // Downtown → Sam
    1: savedManagers[2].id, // Midtown → Morgan
    2: savedManagers[4].id, // Pier → Pat
    3: savedManagers[6].id, // Harbor → Chris
  };

  // -------------------------------------------------------------------------
  // Staff
  //
  // Index reference (used in scenario blocks below):
  //  0  John        bartender+server  ET   Downtown+Midtown
  //  1  Sarah       server+host       ET   Downtown
  //  2  Maria       line cook         ET   Downtown+Midtown
  //  3  David       bartender+server  ET   Midtown
  //  4  Emma        host+server       PT   Pier+Harbor
  //  5  Carlos      line cook+bar     PT   Pier
  //  6  Lisa        server            PT   Harbor
  //  7  James       bartender+host    PT   Pier+Harbor
  //  8  Alexandra   server            ET→PT Downtown+Pier  ← timezone tangle
  //  9  Marcus      bartender         ET   Downtown+Midtown
  // 10  Priya       server+host       ET   Downtown+Midtown+Pier
  // 11  Nina        line cook         PT   Pier+Harbor
  // 12  Tomás       bartender+server  PT   Harbor+Pier
  // 13  Keiko       host+server       ET   Midtown
  // 14  Brendan     server            ET   Downtown
  // -------------------------------------------------------------------------
  type StaffDef = {
    email: string;
    name: string;
    tz: string;
    locationIdxs: number[];
    skillIdxs: number[];
    desired: number;
    availability: Partial<Record<DayOfWeek, [string, string]>>;
  };

  const staffDefs: StaffDef[] = [
    // 0 — John: ET weekday bartender, also Downtown+Midtown
    {
      email: 'john@coastaleats.com',
      name: 'John Bartender',
      tz: 'America/New_York',
      locationIdxs: [0, 1],
      skillIdxs: [0, 2],
      desired: 40,
      availability: {
        [DayOfWeek.MON]: ['09:00', '17:00'],
        [DayOfWeek.TUE]: ['09:00', '17:00'],
        [DayOfWeek.WED]: ['09:00', '17:00'],
        [DayOfWeek.THU]: ['09:00', '17:00'],
        [DayOfWeek.FRI]: ['09:00', '17:00'],
      },
    },
    // 1 — Sarah: ET Downtown server, no Friday, has Saturday nights
    {
      email: 'sarah@coastaleats.com',
      name: 'Sarah Server',
      tz: 'America/New_York',
      locationIdxs: [0],
      skillIdxs: [2, 3],
      desired: 32,
      availability: {
        [DayOfWeek.MON]: ['10:00', '18:00'],
        [DayOfWeek.TUE]: ['10:00', '18:00'],
        [DayOfWeek.WED]: ['10:00', '18:00'],
        [DayOfWeek.THU]: ['10:00', '18:00'],
        [DayOfWeek.SAT]: ['10:00', '22:00'],
      },
    },
    // 2 — Maria: ET line cook, Downtown+Midtown, strict 8-16
    {
      email: 'maria@coastaleats.com',
      name: 'Maria Line Cook',
      tz: 'America/New_York',
      locationIdxs: [0, 1],
      skillIdxs: [1],
      desired: 40,
      availability: {
        [DayOfWeek.MON]: ['08:00', '16:00'],
        [DayOfWeek.TUE]: ['08:00', '16:00'],
        [DayOfWeek.WED]: ['08:00', '16:00'],
        [DayOfWeek.THU]: ['08:00', '16:00'],
        [DayOfWeek.FRI]: ['08:00', '16:00'],
      },
    },
    // 3 — David: ET Midtown bartender, afternoons/evenings
    {
      email: 'david@coastaleats.com',
      name: 'David Bartender',
      tz: 'America/New_York',
      locationIdxs: [1],
      skillIdxs: [0, 2],
      desired: 32,
      availability: {
        [DayOfWeek.TUE]: ['12:00', '20:00'],
        [DayOfWeek.WED]: ['12:00', '20:00'],
        [DayOfWeek.THU]: ['12:00', '20:00'],
        [DayOfWeek.FRI]: ['12:00', '22:00'],
        [DayOfWeek.SAT]: ['12:00', '22:00'],
      },
    },
    // 4 — Emma: PT host/server, Pier+Harbor
    {
      email: 'emma@coastaleats.com',
      name: 'Emma Host',
      tz: 'America/Los_Angeles',
      locationIdxs: [2, 3],
      skillIdxs: [3, 2],
      desired: 30,
      availability: {
        [DayOfWeek.MON]: ['09:00', '17:00'],
        [DayOfWeek.TUE]: ['09:00', '17:00'],
        [DayOfWeek.WED]: ['09:00', '17:00'],
        [DayOfWeek.THU]: ['09:00', '17:00'],
        [DayOfWeek.FRI]: ['09:00', '17:00'],
      },
    },
    // 5 — Carlos: PT line cook+bartender, Pier only
    {
      email: 'carlos@coastaleats.com',
      name: 'Carlos Line Cook',
      tz: 'America/Los_Angeles',
      locationIdxs: [2],
      skillIdxs: [1, 0],
      desired: 35,
      availability: {
        [DayOfWeek.MON]: ['10:00', '18:00'],
        [DayOfWeek.TUE]: ['10:00', '18:00'],
        [DayOfWeek.WED]: ['10:00', '18:00'],
        [DayOfWeek.SAT]: ['10:00', '22:00'],
        [DayOfWeek.SUN]: ['10:00', '22:00'],
      },
    },
    // 6 — Lisa: PT server, Harbor only, Tue-Sat
    {
      email: 'lisa@coastaleats.com',
      name: 'Lisa Server',
      tz: 'America/Los_Angeles',
      locationIdxs: [3],
      skillIdxs: [2],
      desired: 30,
      availability: {
        [DayOfWeek.TUE]: ['11:00', '19:00'],
        [DayOfWeek.WED]: ['11:00', '19:00'],
        [DayOfWeek.THU]: ['11:00', '19:00'],
        [DayOfWeek.FRI]: ['11:00', '23:00'],
        [DayOfWeek.SAT]: ['11:00', '23:00'],
      },
    },
    // 7 — James: PT bartender+host, Pier+Harbor, has Sunday availability
    {
      email: 'james@coastaleats.com',
      name: 'James Bartender',
      tz: 'America/Los_Angeles',
      locationIdxs: [2, 3],
      skillIdxs: [0, 3],
      desired: 32,
      availability: {
        [DayOfWeek.WED]: ['09:00', '17:00'],
        [DayOfWeek.THU]: ['09:00', '17:00'],
        [DayOfWeek.FRI]: ['14:00', '22:00'],
        [DayOfWeek.SAT]: ['14:00', '23:00'],
        [DayOfWeek.SUN]: ['14:00', '22:00'],
      },
    },
    // 8 — Alexandra: TIMEZONE TANGLE — ET home, certified Downtown(ET) + Pier(PT)
    {
      email: 'alexandra@coastaleats.com',
      name: 'Alexandra Server',
      tz: 'America/New_York',
      locationIdxs: [0, 2],
      skillIdxs: [2],
      desired: 32,
      availability: {
        [DayOfWeek.MON]: ['09:00', '17:00'],
        [DayOfWeek.TUE]: ['09:00', '17:00'],
        [DayOfWeek.WED]: ['09:00', '17:00'],
        [DayOfWeek.THU]: ['09:00', '17:00'],
        [DayOfWeek.FRI]: ['09:00', '17:00'],
      },
    },
    // 9 — Marcus: ET bartender, Downtown+Midtown, wide hours incl. weekends
    {
      email: 'marcus@coastaleats.com',
      name: 'Marcus Bartender',
      tz: 'America/New_York',
      locationIdxs: [0, 1],
      skillIdxs: [0],
      desired: 40,
      availability: {
        [DayOfWeek.MON]: ['09:00', '23:00'],
        [DayOfWeek.TUE]: ['09:00', '23:00'],
        [DayOfWeek.WED]: ['09:00', '23:00'],
        [DayOfWeek.THU]: ['09:00', '23:00'],
        [DayOfWeek.FRI]: ['09:00', '23:00'],
        [DayOfWeek.SAT]: ['09:00', '23:00'],
        [DayOfWeek.SUN]: ['09:00', '23:00'],
      },
    },
    // 10 — Priya: ET server+host, tri-location Downtown+Midtown+Pier (cross-coast)
    {
      email: 'priya@coastaleats.com',
      name: 'Priya Server',
      tz: 'America/New_York',
      locationIdxs: [0, 1, 2],
      skillIdxs: [2, 3],
      desired: 35,
      availability: {
        [DayOfWeek.TUE]: ['10:00', '20:00'],
        [DayOfWeek.WED]: ['10:00', '20:00'],
        [DayOfWeek.THU]: ['10:00', '20:00'],
        [DayOfWeek.FRI]: ['10:00', '22:00'],
        [DayOfWeek.SAT]: ['10:00', '22:00'],
      },
    },
    // 11 — Nina: PT line cook, Pier+Harbor
    {
      email: 'nina@coastaleats.com',
      name: 'Nina Line Cook',
      tz: 'America/Los_Angeles',
      locationIdxs: [2, 3],
      skillIdxs: [1],
      desired: 32,
      availability: {
        [DayOfWeek.MON]: ['08:00', '16:00'],
        [DayOfWeek.TUE]: ['08:00', '16:00'],
        [DayOfWeek.WED]: ['08:00', '16:00'],
        [DayOfWeek.THU]: ['08:00', '16:00'],
        [DayOfWeek.FRI]: ['08:00', '16:00'],
      },
    },
    // 12 — Tomás: PT bartender+server, Harbor+Pier, evenings/weekends
    {
      email: 'tomas@coastaleats.com',
      name: 'Tomás Bartender',
      tz: 'America/Los_Angeles',
      locationIdxs: [3, 2],
      skillIdxs: [0, 2],
      desired: 30,
      availability: {
        [DayOfWeek.WED]: ['14:00', '22:00'],
        [DayOfWeek.THU]: ['14:00', '22:00'],
        [DayOfWeek.FRI]: ['14:00', '23:00'],
        [DayOfWeek.SAT]: ['14:00', '23:00'],
        [DayOfWeek.SUN]: ['14:00', '22:00'],
      },
    },
    // 13 — Keiko: ET host+server, Midtown only
    {
      email: 'keiko@coastaleats.com',
      name: 'Keiko Host',
      tz: 'America/New_York',
      locationIdxs: [1],
      skillIdxs: [3, 2],
      desired: 25,
      availability: {
        [DayOfWeek.MON]: ['11:00', '19:00'],
        [DayOfWeek.TUE]: ['11:00', '19:00'],
        [DayOfWeek.WED]: ['11:00', '19:00'],
        [DayOfWeek.SAT]: ['11:00', '22:00'],
        [DayOfWeek.SUN]: ['11:00', '20:00'],
      },
    },
    // 14 — Brendan: ET server, Downtown only, Fri+Sat nights specialist
    {
      email: 'brendan@coastaleats.com',
      name: 'Brendan Server',
      tz: 'America/New_York',
      locationIdxs: [0],
      skillIdxs: [2],
      desired: 20,
      availability: {
        [DayOfWeek.FRI]: ['17:00', '23:00'],
        [DayOfWeek.SAT]: ['17:00', '23:00'],
        [DayOfWeek.SUN]: ['14:00', '22:00'],
      },
    },
  ];

  const savedStaff: Array<{ employee: Employee; def: StaffDef }> = [];
  for (const def of staffDefs) {
    const emp = await upsertEmployee(
      employeeRepo,
      userRepo,
      def.email,
      def.name,
      EmployeeRole.STAFF,
      def.tz,
      def.desired,
    );
    savedStaff.push({ employee: emp, def });

    for (const idx of def.locationIdxs) {
      await linkCertification(locationCertRepo, emp.id, locations[idx].id);
    }
    for (const idx of def.skillIdxs) {
      await linkSkill(staffSkillRepo, emp.id, skills[idx].id);
    }
    for (const [day, [start, end]] of Object.entries(def.availability) as [
      DayOfWeek,
      [string, string],
    ][]) {
      await linkAvailability(availabilityRepo, emp.id, day, start, end);
    }
  }

  // Convenient references by name
  const john = savedStaff[0].employee;
  const sarah = savedStaff[1].employee;
  // maria      = savedStaff[2]
  const david = savedStaff[3].employee;
  const emma = savedStaff[4].employee;
  // carlos     = savedStaff[5]
  const lisa = savedStaff[6].employee;
  const james = savedStaff[7].employee;
  // alexandra  = savedStaff[8]  (timezone tangle)
  const marcus = savedStaff[9].employee;
  const priya = savedStaff[10].employee;
  // nina       = savedStaff[11]
  const tomas = savedStaff[12].employee;
  // keiko      = savedStaff[13]
  const brendan = savedStaff[14].employee;

  // -------------------------------------------------------------------------
  // Time anchors
  // All dates anchored to current Monday so seed is always "live"
  // -------------------------------------------------------------------------
  const now = Temporal.Now.instant();
  let weekStart = now.toZonedDateTimeISO('America/New_York');
  while (weekStart.dayOfWeek !== 1) {
    weekStart = weekStart.subtract({ days: 1 });
  }
  weekStart = weekStart.with({ hour: 0, minute: 0, second: 0, nanosecond: 0 });

  // weekStart = this Monday 00:00 ET
  // nextWeekStart = next Monday 00:00 ET
  const nextWeekStart = weekStart.add({ days: 7 });

  function formatDateYMD(zdt: Temporal.ZonedDateTime): string {
    const y = zdt.year;
    const m = String(zdt.month).padStart(2, '0');
    const d = String(zdt.day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const currentWeekOf = formatDateYMD(weekStart);
  const nextWeekOf = formatDateYMD(nextWeekStart);

  // Create schedules for current and next week at all locations
  const schedulesByLocation: Record<
    number,
    { current: Schedule; next: Schedule }
  > = {};
  for (let locIdx = 0; locIdx < locations.length; locIdx++) {
    const currentWeekSchedule = await upsertSchedule(
      scheduleRepo,
      locations[locIdx].id,
      currentWeekOf,
      ScheduleState.PUBLISHED,
      new Date(),
      managerByLocationIdx[locIdx],
    );
    const nextWeekSchedule = await upsertSchedule(
      scheduleRepo,
      locations[locIdx].id,
      nextWeekOf,
      ScheduleState.BUILDING,
    );
    schedulesByLocation[locIdx] = {
      current: currentWeekSchedule,
      next: nextWeekSchedule,
    };
  }

  // =========================================================================
  // PUBLISHED BACKGROUND SCHEDULE — current + next week at all locations
  // Gives the evaluator an already-published week to inspect immediately.
  // =========================================================================

  // Helper: create a standard day shift (10:00–18:00) with skill slots at a location
  async function seedDayShift(
    location: Location,
    locationIdx: number,
    dayOffset: number, // days from weekStart
    skillSlots: { skillIdx: number; headcount: number }[],
    published = true,
  ): Promise<Shift> {
    const base = weekStart.add({ days: dayOffset });
    const baseInLocTz = base.withTimeZone(location.timezone);
    const scheduleId = published
      ? schedulesByLocation[locationIdx].current.id
      : schedulesByLocation[locationIdx].next.id;
    const shift = await upsertShift(
      shiftRepo,
      location.id,
      toDate(baseInLocTz, 10),
      toDate(baseInLocTz, 18),
      published ? ShiftState.LOCKED : ShiftState.OPEN,
      scheduleId,
    );
    for (const slot of skillSlots) {
      await upsertShiftSkill(
        shiftSkillRepo,
        shift.id,
        skills[slot.skillIdx].id,
        slot.headcount,
      );
    }
    return shift;
  }

  // Seed 2 full weeks of day shifts across all 4 locations
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    // Downtown — published current week, open next week
    await seedDayShift(
      locations[0],
      0,
      dayOffset,
      [
        { skillIdx: 0, headcount: 2 }, // 2 bartenders
        { skillIdx: 2, headcount: 3 }, // 3 servers
        { skillIdx: 3, headcount: 1 }, // 1 host
        { skillIdx: 1, headcount: 2 }, // 2 line cooks
      ],
      dayOffset < 7,
    );

    // Midtown
    await seedDayShift(
      locations[1],
      1,
      dayOffset,
      [
        { skillIdx: 0, headcount: 2 },
        { skillIdx: 2, headcount: 2 },
        { skillIdx: 3, headcount: 1 },
        { skillIdx: 1, headcount: 1 },
      ],
      dayOffset < 7,
    );

    // Pier
    await seedDayShift(
      locations[2],
      2,
      dayOffset,
      [
        { skillIdx: 0, headcount: 1 },
        { skillIdx: 2, headcount: 2 },
        { skillIdx: 3, headcount: 1 },
        { skillIdx: 1, headcount: 2 },
      ],
      dayOffset < 7,
    );

    // Harbor
    await seedDayShift(
      locations[3],
      3,
      dayOffset,
      [
        { skillIdx: 0, headcount: 1 },
        { skillIdx: 2, headcount: 2 },
        { skillIdx: 3, headcount: 1 },
        { skillIdx: 1, headcount: 1 },
      ],
      dayOffset < 7,
    );
  }

  // =========================================================================
  // EVENING / WEEKEND SHIFTS (premium — Fri/Sat evenings tagged by time)
  // Created for current + next two weekends across locations
  // =========================================================================
  type EveningConfig = { locIdx: number; candidates: Array<Employee['id']> };
  const eveningConfigs: EveningConfig[] = [
    { locIdx: 0, candidates: [sarah.id, marcus.id, brendan.id, priya.id] }, // Downtown
    { locIdx: 1, candidates: [david.id, priya.id, tomas.id] }, // Midtown
    { locIdx: 2, candidates: [james.id, tomas.id, priya.id] }, // Pier
    { locIdx: 3, candidates: [lisa.id, tomas.id, james.id] }, // Harbor
  ];
  for (let weekOffset = 0; weekOffset < 2; weekOffset++) {
    for (const { locIdx, candidates } of eveningConfigs) {
      for (const fridayOffset of [4, 5]) {
        // Fri=4, Sat=5 from Monday
        const base = weekStart.add({ days: weekOffset * 7 + fridayOffset });
        const baseInLocTz = base.withTimeZone(locations[locIdx].timezone);
        const isCurrentWeek = weekOffset === 0;
        const scheduleId = isCurrentWeek
          ? schedulesByLocation[locIdx].current.id
          : schedulesByLocation[locIdx].next.id;
        const eveningShift = await upsertShift(
          shiftRepo,
          locations[locIdx].id,
          toDate(baseInLocTz, 18),
          toDate(baseInLocTz, 23),
          isCurrentWeek ? ShiftState.LOCKED : ShiftState.OPEN,
          scheduleId,
        );

        const barSlot = await upsertShiftSkill(
          shiftSkillRepo,
          eveningShift.id,
          skills[0].id,
          1,
        );
        const srvSlot = await upsertShiftSkill(
          shiftSkillRepo,
          eveningShift.id,
          skills[2].id,
          2,
        );

        // Assign one staff to each slot for week 0 only (current week)
        if (weekOffset === 0 && candidates.length >= 2) {
          await upsertAssignment(
            assignmentRepo,
            barSlot.id,
            candidates[0],
            AssignmentState.ASSIGNED,
            managerByLocationIdx[locIdx],
          );
          await upsertAssignment(
            assignmentRepo,
            srvSlot.id,
            candidates[1],
            AssignmentState.ASSIGNED,
            managerByLocationIdx[locIdx],
          );
        }
      }
    }
  }

  // =========================================================================
  // OVERNIGHT SHIFT — covers "11pm–3am must be one shift" requirement
  // Four instances across locations for easy testing
  // =========================================================================
  type OvernightConfig = { locIdx: number; staffId: Employee['id'] };
  const overnightConfigs: OvernightConfig[] = [
    { locIdx: 0, staffId: marcus.id }, // Downtown
    { locIdx: 0, staffId: brendan.id }, // Downtown (second instance same location)
    { locIdx: 2, staffId: james.id }, // Pier
    { locIdx: 3, staffId: tomas.id }, // Harbor
  ];
  for (const { locIdx, staffId } of overnightConfigs) {
    for (let weekOffset = 0; weekOffset < 2; weekOffset++) {
      const base = weekStart.add({ days: weekOffset * 7 + 4 }); // Friday night
      const baseInLocalTimezone = base.withTimeZone(locations[locIdx].timezone);
      const isCurrentWeek = weekOffset === 0;
      const scheduleId = isCurrentWeek
        ? schedulesByLocation[locIdx].current.id
        : schedulesByLocation[locIdx].next.id;
      const overnightShift = await upsertShift(
        shiftRepo,
        locations[locIdx].id,
        toDate(baseInLocalTimezone, 23),
        toDate(baseInLocalTimezone.add({ days: 1 }), 3),
        isCurrentWeek ? ShiftState.LOCKED : ShiftState.OPEN,
        scheduleId,
      );
      const oSlot = await upsertShiftSkill(
        shiftSkillRepo,
        overnightShift.id,
        skills[0].id,
        1,
      );
      await upsertAssignment(
        assignmentRepo,
        oSlot.id,
        staffId,
        AssignmentState.ASSIGNED,
        managerByLocationIdx[locIdx],
      );
    }
  }

  // =========================================================================
  // SCENARIO 1 — "The Sunday Night Chaos"
  // Staff member assigned to a Sunday evening shift calls out.
  // Multiple instances: Downtown, Midtown, Pier, Harbor.
  // Each is PUBLISHED and ASSIGNED so evaluator can simulate a callout.
  // =========================================================================
  let nextSunday = weekStart;
  while (nextSunday.dayOfWeek !== 7) nextSunday = nextSunday.add({ days: 1 });

  const chaosInstances: Array<{
    locIdx: number;
    staffId: Employee['id'];
    skillIdx: number;
  }> = [
    { locIdx: 0, staffId: james.id, skillIdx: 0 }, // Downtown — bartender James (PT staff at ET location — also tests cross-tz)
    { locIdx: 1, staffId: david.id, skillIdx: 0 }, // Midtown  — bartender David
    { locIdx: 2, staffId: carlos_id(), skillIdx: 1 }, // Pier     — line cook Carlos
    { locIdx: 3, staffId: lisa.id, skillIdx: 2 }, // Harbor   — server Lisa
  ];

  function carlos_id() {
    return savedStaff[5].employee.id;
  }

  for (const inst of chaosInstances) {
    const chaosShift = await upsertShift(
      shiftRepo,
      locations[inst.locIdx].id,
      toDate(nextSunday, 19),
      toDate(nextSunday, 23),
      ShiftState.LOCKED,
      schedulesByLocation[inst.locIdx].current.id,
    );
    const chaosSlot = await upsertShiftSkill(
      shiftSkillRepo,
      chaosShift.id,
      skills[inst.skillIdx].id,
      1,
    );
    await upsertAssignment(
      assignmentRepo,
      chaosSlot.id,
      inst.staffId,
      AssignmentState.ASSIGNED,
      managerByLocationIdx[inst.locIdx],
    );
  }

  // =========================================================================
  // SCENARIO 2 — "The Overtime Trap"
  // Staff member approaching or over 40h this week.
  // Four people in varying states: warning (35h), at-limit (40h), over (48h blocked), 6-consecutive-days.
  // =========================================================================

  // 2a — John: 35h this week (5×7h) — warning territory
  for (let d = 0; d < 5; d++) {
    const base = weekStart.add({ days: d });
    const otShift = await upsertShift(
      shiftRepo,
      locations[0].id,
      toDate(base, 9),
      toDate(base, 16),
      ShiftState.LOCKED,
      schedulesByLocation[0].current.id,
    );
    const otSlot = await upsertShiftSkill(
      shiftSkillRepo,
      otShift.id,
      skills[0].id,
      1,
    );
    await upsertAssignment(
      assignmentRepo,
      otSlot.id,
      john.id,
      AssignmentState.ASSIGNED,
      managerByLocationIdx[0],
    );
  }

  // 2b — Marcus: 40h this week (5×8h) — at the limit, adding anything triggers warning
  for (let d = 0; d < 5; d++) {
    const base = weekStart.add({ days: d });
    const otShift = await upsertShift(
      shiftRepo,
      locations[0].id,
      toDate(base, 10),
      toDate(base, 18),
      ShiftState.LOCKED,
      schedulesByLocation[0].current.id,
    );
    const otSlot = await upsertShiftSkill(
      shiftSkillRepo,
      otShift.id,
      skills[0].id,
      1,
    );
    await upsertAssignment(
      assignmentRepo,
      otSlot.id,
      marcus.id,
      AssignmentState.ASSIGNED,
      managerByLocationIdx[0],
    );
  }

  // 2c — David: 6 consecutive days this week (Mon–Sat, 6h each) — consecutive-day warning
  for (let d = 0; d < 6; d++) {
    const base = weekStart.add({ days: d });
    const otShift = await upsertShift(
      shiftRepo,
      locations[1].id,
      toDate(base, 13),
      toDate(base, 19),
      ShiftState.LOCKED,
      schedulesByLocation[1].current.id,
    );
    const otSlot = await upsertShiftSkill(
      shiftSkillRepo,
      otShift.id,
      skills[0].id,
      1,
    );
    await upsertAssignment(
      assignmentRepo,
      otSlot.id,
      david.id,
      AssignmentState.ASSIGNED,
      managerByLocationIdx[1],
    );
  }

  // 2d — Priya: 40h next week already pre-assigned — manager building next week's schedule hits the wall
  for (let d = 0; d < 5; d++) {
    const base = nextWeekStart.add({ days: d });
    const otShift = await upsertShift(
      shiftRepo,
      locations[0].id,
      toDate(base, 10),
      toDate(base, 18),
      ShiftState.OPEN,
      schedulesByLocation[0].next.id,
    );
    const otSlot = await upsertShiftSkill(
      shiftSkillRepo,
      otShift.id,
      skills[2].id,
      1,
    );
    await upsertAssignment(
      assignmentRepo,
      otSlot.id,
      priya.id,
      AssignmentState.ASSIGNED,
      managerByLocationIdx[0],
    );
  }

  // =========================================================================
  // SCENARIO 3 — "The Timezone Tangle"
  // Alexandra: home timezone ET, certified at Downtown (ET) and Pier (PT).
  // Her availability is stored as "09:00–17:00" wall time.
  // Shifts at Pier that overlap her availability window in ET but not PT are seeded
  // so the evaluator can test how the system interprets her window.
  // =========================================================================
  const alexandra = savedStaff[8].employee;

  // Instance A: Pier shift 09:00–17:00 PT = 12:00–20:00 ET — outside her ET window
  for (let weekOffset = 0; weekOffset < 2; weekOffset++) {
    const base = weekStart.add({ days: weekOffset * 7 + 1 }); // Tuesday
    const baseInLocTz = base.withTimeZone(locations[2].timezone); // Pier is PT
    const isCurrentWeek = weekOffset === 0;
    const scheduleId = isCurrentWeek
      ? schedulesByLocation[2].current.id
      : schedulesByLocation[2].next.id;
    const tzShift = await upsertShift(
      shiftRepo,
      locations[2].id,
      toDate(baseInLocTz, 9),
      toDate(baseInLocTz, 17),
      isCurrentWeek ? ShiftState.LOCKED : ShiftState.OPEN,
      scheduleId,
    );
    await upsertShiftSkill(shiftSkillRepo, tzShift.id, skills[2].id, 2);
    // Assignment intentionally left unassigned — evaluator tests if system allows assigning Alexandra
  }

  // Instance B: Downtown shift 09:00–17:00 ET — clearly within her window
  for (let weekOffset = 0; weekOffset < 2; weekOffset++) {
    const base = weekStart.add({ days: weekOffset * 7 + 2 }); // Wednesday
    const baseInLocTz = base.withTimeZone(locations[0].timezone); // Downtown is ET
    const isCurrentWeek = weekOffset === 0;
    const scheduleId = isCurrentWeek
      ? schedulesByLocation[0].current.id
      : schedulesByLocation[0].next.id;
    const tzShift = await upsertShift(
      shiftRepo,
      locations[0].id,
      toDate(baseInLocTz, 9),
      toDate(baseInLocTz, 17),
      isCurrentWeek ? ShiftState.LOCKED : ShiftState.OPEN,
      scheduleId,
    );
    const tzSlot = await upsertShiftSkill(
      shiftSkillRepo,
      tzShift.id,
      skills[2].id,
      1,
    );
    await upsertAssignment(
      assignmentRepo,
      tzSlot.id,
      alexandra.id,
      AssignmentState.ASSIGNED,
      managerByLocationIdx[0],
    );
  }

  // =========================================================================
  // SCENARIO 4 — "The Simultaneous Assignment"
  // A high-demand bartender (Marcus) with one open slot at the same time at two locations.
  // Taylor (Pier+Harbor manager) and Jordan (Downtown+Midtown manager) both have
  // visibility of shifts that Marcus could fill. The slot is left OPEN for the evaluator
  // to attempt concurrent assignment via two browser sessions.
  // Four distinct time slots seeded to make repeated testing easy.
  // =========================================================================
  for (let weekOffset = 0; weekOffset < 2; weekOffset++) {
    for (const dayOffset of [1, 3]) {
      // Tuesday, Thursday
      const base = nextWeekStart.add({ days: weekOffset * 7 + dayOffset });

      // Open bartender slot at Downtown (managed by Jordan/Sam/Casey)
      const dtShift = await upsertShift(
        shiftRepo,
        locations[0].id,
        toDate(base, 10),
        toDate(base, 18),
        ShiftState.OPEN,
        schedulesByLocation[0].next.id,
      );
      await upsertShiftSkill(shiftSkillRepo, dtShift.id, skills[0].id, 1);

      // Open bartender slot at Midtown same time (managed by Jordan/Morgan/Riley)
      const mtShift = await upsertShift(
        shiftRepo,
        locations[1].id,
        toDate(base, 10),
        toDate(base, 18),
        ShiftState.OPEN,
        schedulesByLocation[1].next.id,
      );
      await upsertShiftSkill(shiftSkillRepo, mtShift.id, skills[0].id, 1);

      // Marcus is certified at both — evaluator logs in as two managers and races
    }
  }

  // =========================================================================
  // SCENARIO 5 — "The Fairness Complaint"
  // Past premium Saturday night shifts (18:00–22:00) at Downtown.
  // Sarah gets the lion's share; Emma and Brendan get very few; Priya gets none.
  // 6 weeks of history across 3 Downtown-certified servers.
  // =========================================================================
  const fairnessHistory: Array<{ weeksAgo: number; staffId: Employee['id'] }> =
    [
      { weeksAgo: 1, staffId: sarah.id },
      { weeksAgo: 2, staffId: sarah.id },
      { weeksAgo: 3, staffId: sarah.id },
      { weeksAgo: 4, staffId: brendan.id },
      { weeksAgo: 5, staffId: sarah.id },
      { weeksAgo: 6, staffId: brendan.id },
      // Priya (idx 10) and Emma are never assigned Saturday Downtown evenings
    ];

  // Also seed Midtown Saturday nights so fairness report covers multiple locations
  const midtownFairnessHistory: Array<{
    weeksAgo: number;
    staffId: Employee['id'];
  }> = [
    { weeksAgo: 1, staffId: david.id },
    { weeksAgo: 2, staffId: david.id },
    { weeksAgo: 3, staffId: priya.id },
    { weeksAgo: 4, staffId: david.id },
    { weeksAgo: 5, staffId: priya.id },
    { weeksAgo: 6, staffId: david.id },
  ];

  const thisSaturday = weekStart.add({ days: 5 });

  for (const { weeksAgo, staffId } of fairnessHistory) {
    const fDate = thisSaturday.subtract({ weeks: weeksAgo });
    const fShift = await upsertShift(
      shiftRepo,
      locations[0].id,
      toDate(fDate, 18),
      toDate(fDate, 22),
      ShiftState.COMPLETED,
    );
    const fSlot = await upsertShiftSkill(
      shiftSkillRepo,
      fShift.id,
      skills[2].id,
      1,
    );
    await upsertAssignment(
      assignmentRepo,
      fSlot.id,
      staffId,
      AssignmentState.ASSIGNED,
      managerByLocationIdx[0],
    );
  }

  for (const { weeksAgo, staffId } of midtownFairnessHistory) {
    const fDate = thisSaturday.subtract({ weeks: weeksAgo });
    const fShift = await upsertShift(
      shiftRepo,
      locations[1].id,
      toDate(fDate, 18),
      toDate(fDate, 22),
      ShiftState.COMPLETED,
    );
    const fSlot = await upsertShiftSkill(
      shiftSkillRepo,
      fShift.id,
      skills[2].id,
      1,
    );
    await upsertAssignment(
      assignmentRepo,
      fSlot.id,
      staffId,
      AssignmentState.ASSIGNED,
      managerByLocationIdx[1],
    );
  }

  // =========================================================================
  // SCENARIO 6 — "The Regret Swap"
  // Staff A has requested a swap; manager has not yet approved.
  // Staff A wants to cancel. Four instances across different staff and locations.
  // =========================================================================
  const regretInstances: Array<{
    locIdx: number;
    skillIdx: number;
    staffA: Employee['id'];
    dayOffset: number; // from nextWeekStart
  }> = [
    { locIdx: 0, skillIdx: 2, staffA: sarah.id, dayOffset: 1 }, // Downtown  — Sarah
    { locIdx: 1, skillIdx: 0, staffA: david.id, dayOffset: 2 }, // Midtown   — David
    { locIdx: 2, skillIdx: 0, staffA: james.id, dayOffset: 3 }, // Pier      — James
    { locIdx: 3, skillIdx: 2, staffA: lisa.id, dayOffset: 4 }, // Harbor    — Lisa
  ];

  for (const inst of regretInstances) {
    const base = nextWeekStart.add({ days: inst.dayOffset });
    const baseInLocationTimezone = base.withTimeZone(
      locations[inst.locIdx].timezone,
    );
    const swapShift = await upsertShift(
      shiftRepo,
      locations[inst.locIdx].id,
      toDate(baseInLocationTimezone, 10),
      toDate(baseInLocationTimezone, 18),
      ShiftState.OPEN, // Not LOCKED — swap requests only allowed on non-locked shifts
      schedulesByLocation[inst.locIdx].next.id, // Next week's schedule (BUILDING)
    );
    const swapSlot = await upsertShiftSkill(
      shiftSkillRepo,
      swapShift.id,
      skills[inst.skillIdx].id,
      1,
    );
    await upsertAssignment(
      assignmentRepo,
      swapSlot.id,
      inst.staffA,
      AssignmentState.SWAP_REQUESTED,
      managerByLocationIdx[inst.locIdx],
    ); // swap is pending; no Staff B acceptance yet
  }

  // =========================================================================
  // SCENARIO 7 — "The 10-Hour Rest Violation"
  // (Not in the original 6, but called out in the gap analysis)
  // Staff assigned back-to-back with < 10h rest so the constraint fires visibly.
  // Three instances for repeated testing.
  // =========================================================================
  const restViolationInstances: Array<{
    locIdx: number;
    skillIdx: number;
    staffId: Employee['id'];
    dayOffset: number;
  }> = [
    { locIdx: 0, skillIdx: 0, staffId: marcus.id, dayOffset: 7 }, // next Mon
    { locIdx: 1, skillIdx: 0, staffId: john.id, dayOffset: 8 }, // next Tue
    { locIdx: 2, skillIdx: 0, staffId: james.id, dayOffset: 9 }, // next Wed
  ];

  for (const inst of restViolationInstances) {
    const base = weekStart.add({ days: inst.dayOffset }); // dayOffset 7,8,9 = next week
    // Evening shift: 15:00–23:00
    const eveningShift = await upsertShift(
      shiftRepo,
      locations[inst.locIdx].id,
      toDate(base, 15),
      toDate(base, 23),
      ShiftState.OPEN,
      schedulesByLocation[inst.locIdx].next.id,
    );
    const eveningSlot = await upsertShiftSkill(
      shiftSkillRepo,
      eveningShift.id,
      skills[inst.skillIdx].id,
      1,
    );
    await upsertAssignment(
      assignmentRepo,
      eveningSlot.id,
      inst.staffId,
      AssignmentState.ASSIGNED,
      managerByLocationIdx[inst.locIdx],
    );

    // Morning shift next day: 07:00–15:00 — only 8h rest, violates the 10h rule
    const nextDay = base.add({ days: 1 });
    const morningShift = await upsertShift(
      shiftRepo,
      locations[inst.locIdx].id,
      toDate(nextDay, 7),
      toDate(nextDay, 15),
      ShiftState.OPEN,
      schedulesByLocation[inst.locIdx].next.id,
    );
    const morningSlot = await upsertShiftSkill(
      shiftSkillRepo,
      morningShift.id,
      skills[inst.skillIdx].id,
      1,
    );
    await upsertAssignment(
      assignmentRepo,
      morningSlot.id,
      inst.staffId,
      AssignmentState.ASSIGNED,
      managerByLocationIdx[inst.locIdx],
    );
  }

  // =========================================================================
  // SCENARIO 8 — "The Drop Request"
  // (Gap from analysis: drop requests were missing entirely)
  // Staff offering shifts up for grabs — multiple instances, different locations.
  // =========================================================================
  const dropInstances: Array<{
    locIdx: number;
    skillIdx: number;
    staffId: Employee['id'];
    dayOffset: number;
  }> = [
    { locIdx: 0, skillIdx: 2, staffId: brendan.id, dayOffset: 7 }, // Downtown
    { locIdx: 1, skillIdx: 0, staffId: david.id, dayOffset: 8 }, // Midtown
    { locIdx: 2, skillIdx: 1, staffId: carlos_id(), dayOffset: 9 }, // Pier
    { locIdx: 3, skillIdx: 2, staffId: emma.id, dayOffset: 10 }, // Harbor
  ];

  for (const inst of dropInstances) {
    const base = weekStart.add({ days: inst.dayOffset }); // dayOffset 7,8,9,10 = next week
    const dropShift = await upsertShift(
      shiftRepo,
      locations[inst.locIdx].id,
      toDate(base, 10),
      toDate(base, 18),
      ShiftState.OPEN, // Not LOCKED — drop requests only allowed on non-locked shifts
      schedulesByLocation[inst.locIdx].next.id,
    );
    const dropSlot = await upsertShiftSkill(
      shiftSkillRepo,
      dropShift.id,
      skills[inst.skillIdx].id,
      1,
    );
    await upsertAssignment(
      assignmentRepo,
      dropSlot.id,
      inst.staffId,
      AssignmentState.DROP_REQUESTED,
      managerByLocationIdx[inst.locIdx],
    );
  }

  // =========================================================================
  // Done
  // =========================================================================
  console.log('Seed complete!');
  if (ownConnection) await dataSource.destroy();
}

// Only run standalone when executed directly (e.g. `npm run seed`)
if (require.main === module) {
  runSeed().catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  });
}
