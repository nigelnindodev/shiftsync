import { DataSource } from 'typeorm';
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
} from '../scheduling/entities';
import { User } from '../users/entity/user.entity';
import { UserProfile } from '../users/entity/profile.entity';
import { UserRole } from '../users/user.types';

async function seed() {
  console.log('Connecting to database...');
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.PG_HOST ?? '0.0.0.0',
    port: parseInt(process.env.PG_PORT ?? '5432', 10),
    username: process.env.PG_USERNAME ?? 'changeuser',
    password: process.env.PG_PASSWORD ?? 'changepass',
    database: process.env.PG_DATABASE ?? 'change_dbname',
    entities: [__dirname + '/../**/*.entity.ts'],
    synchronize: true,
    logging: true,
  });

  await dataSource.initialize();
  console.log('Connected. Running seed...');

  const locationRepo = dataSource.getRepository(Location);
  const skillRepo = dataSource.getRepository(Skill);
  const staffSkillRepo = dataSource.getRepository(StaffSkill);
  const locationCertRepo = dataSource.getRepository(LocationCertification);
  const availabilityRepo = dataSource.getRepository(StaffAvailability);
  const managerLocationRepo = dataSource.getRepository(ManagerLocation);
  const userRepo = dataSource.getRepository(User);
  const profileRepo = dataSource.getRepository(UserProfile);
  const shiftRepo = dataSource.getRepository(Shift);
  const shiftSkillRepo = dataSource.getRepository(ShiftSkill);
  const assignmentRepo = dataSource.getRepository(Assignment);

  // --- Locations ---
  const locations = [
    { name: 'Downtown', timezone: 'America/New_York', brand: 'Coastal Eats' },
    { name: 'Midtown', timezone: 'America/New_York', brand: 'Coastal Eats' },
    { name: 'Pier', timezone: 'America/Los_Angeles', brand: 'Coastal Eats' },
    { name: 'Harbor', timezone: 'America/Los_Angeles', brand: 'Coastal Eats' },
  ];

  const savedLocations: Location[] = [];
  for (const loc of locations) {
    const existing = await locationRepo.findOne({ where: { name: loc.name } });
    if (existing) {
      savedLocations.push(existing);
      console.log(`Location "${loc.name}" already exists`);
    } else {
      const saved = await locationRepo.save(locationRepo.create(loc));
      savedLocations.push(saved);
      console.log(`Created location: ${loc.name}`);
    }
  }

  // --- Skills ---
  const skillNames = ['bartender', 'line cook', 'server', 'host'];
  const savedSkills: Skill[] = [];
  for (const name of skillNames) {
    const existing = await skillRepo.findOne({ where: { name } });
    if (existing) {
      savedSkills.push(existing);
      console.log(`Skill "${name}" already exists`);
    } else {
      const saved = await skillRepo.save(skillRepo.create({ name }));
      savedSkills.push(saved);
      console.log(`Created skill: ${name}`);
    }
  }

  // --- Admin Users ---
  const admins = [
    {
      email: 'nigel@coastaleats.com',
      name: 'Nigel (Admin)',
      role: UserRole.ADMIN,
    },
    {
      email: 'alex@coastaleats.com',
      name: 'Alex (Admin)',
      role: UserRole.ADMIN,
    },
  ];

  for (const admin of admins) {
    let user = await userRepo.findOne({ where: { email: admin.email } });
    let profile: UserProfile | null = null;
    if (user) {
      profile = await profileRepo.findOne({
        where: { user: { email: admin.email } },
        relations: ['user'],
      });
    }
    if (profile) {
      console.log(`Admin "${admin.email}" already exists`);
    } else {
      if (!user) {
        user = await userRepo.save(
          userRepo.create({ email: admin.email, name: admin.name }),
        );
      }
      await profileRepo.save(
        profileRepo.create({
          externalId: user.externalId,
          role: admin.role,
          homeTimezone: 'America/New_York',
        }),
      );
      console.log(`Created admin: ${admin.email}`);
    }
  }

  // --- Manager Users ---
  const managers = [
    {
      email: 'manager.downtown@coastaleats.com',
      name: 'Sam Downtown',
      location: savedLocations[0],
    },
    {
      email: 'manager.midtown@coastaleats.com',
      name: 'Morgan Midtown',
      location: savedLocations[1],
    },
    {
      email: 'manager.pier@coastaleats.com',
      name: 'Pat Pier',
      location: savedLocations[2],
    },
    {
      email: 'manager.harbor@coastaleats.com',
      name: 'Chris Harbor',
      location: savedLocations[3],
    },
  ];

  for (const mgr of managers) {
    let profile = await profileRepo.findOne({
      where: { user: { email: mgr.email } },
      relations: ['user'],
    });
    if (!profile) {
      let user = await userRepo.findOne({ where: { email: mgr.email } });
      if (!user) {
        user = await userRepo.save(
          userRepo.create({ email: mgr.email, name: mgr.name }),
        );
      }
      profile = await profileRepo.save(
        profileRepo.create({
          externalId: user.externalId,
          role: UserRole.MANAGER,
          homeTimezone: mgr.location.timezone,
        }),
      );
      console.log(`Created manager: ${mgr.email}`);
    } else {
      console.log(`Manager "${mgr.email}" already exists`);
    }
    const existingMapping = await managerLocationRepo.findOne({
      where: { managerId: profile.id, locationId: mgr.location.id },
    });
    if (!existingMapping) {
      await managerLocationRepo.save(
        managerLocationRepo.create({
          managerId: profile.id,
          locationId: mgr.location.id,
        }),
      );
    }
  }

  // --- Staff Members ---
  const staffData = [
    {
      email: 'john@coastaleats.com',
      name: 'John Bartender',
      timezone: 'America/New_York',
      locationIds: [0, 1],
      skillIds: [0, 2],
      availability: {
        [DayOfWeek.MON]: ['09:00', '17:00'],
        [DayOfWeek.TUE]: ['09:00', '17:00'],
        [DayOfWeek.WED]: ['09:00', '17:00'],
        [DayOfWeek.THU]: ['09:00', '17:00'],
        [DayOfWeek.FRI]: ['09:00', '17:00'],
      },
    },
    {
      email: 'sarah@coastaleats.com',
      name: 'Sarah Server',
      timezone: 'America/New_York',
      locationIds: [0],
      skillIds: [2, 3],
      availability: {
        [DayOfWeek.MON]: ['10:00', '18:00'],
        [DayOfWeek.TUE]: ['10:00', '18:00'],
        [DayOfWeek.WED]: ['10:00', '18:00'],
        [DayOfWeek.THU]: ['10:00', '18:00'],
        [DayOfWeek.SAT]: ['10:00', '22:00'],
      },
    },
    {
      email: 'maria@coastaleats.com',
      name: 'Maria Line Cook',
      timezone: 'America/New_York',
      locationIds: [0, 1],
      skillIds: [1],
      availability: {
        [DayOfWeek.MON]: ['08:00', '16:00'],
        [DayOfWeek.TUE]: ['08:00', '16:00'],
        [DayOfWeek.WED]: ['08:00', '16:00'],
        [DayOfWeek.THU]: ['08:00', '16:00'],
        [DayOfWeek.FRI]: ['08:00', '16:00'],
      },
    },
    {
      email: 'david@coastaleats.com',
      name: 'David Bartender',
      timezone: 'America/New_York',
      locationIds: [1],
      skillIds: [0, 2],
      availability: {
        [DayOfWeek.TUE]: ['12:00', '20:00'],
        [DayOfWeek.WED]: ['12:00', '20:00'],
        [DayOfWeek.THU]: ['12:00', '20:00'],
        [DayOfWeek.FRI]: ['12:00', '22:00'],
        [DayOfWeek.SAT]: ['12:00', '22:00'],
      },
    },
    {
      email: 'emma@coastaleats.com',
      name: 'Emma Host',
      timezone: 'America/Los_Angeles',
      locationIds: [2, 3],
      skillIds: [3, 2],
      availability: {
        [DayOfWeek.MON]: ['09:00', '17:00'],
        [DayOfWeek.TUE]: ['09:00', '17:00'],
        [DayOfWeek.WED]: ['09:00', '17:00'],
        [DayOfWeek.THU]: ['09:00', '17:00'],
        [DayOfWeek.FRI]: ['09:00', '17:00'],
      },
    },
    {
      email: 'carlos@coastaleats.com',
      name: 'Carlos Line Cook',
      timezone: 'America/Los_Angeles',
      locationIds: [2],
      skillIds: [1, 0],
      availability: {
        [DayOfWeek.MON]: ['10:00', '18:00'],
        [DayOfWeek.TUE]: ['10:00', '18:00'],
        [DayOfWeek.WED]: ['10:00', '18:00'],
        [DayOfWeek.SAT]: ['10:00', '22:00'],
        [DayOfWeek.SUN]: ['10:00', '22:00'],
      },
    },
    {
      email: 'lisa@coastaleats.com',
      name: 'Lisa Server',
      timezone: 'America/Los_Angeles',
      locationIds: [3],
      skillIds: [2],
      availability: {
        [DayOfWeek.TUE]: ['11:00', '19:00'],
        [DayOfWeek.WED]: ['11:00', '19:00'],
        [DayOfWeek.THU]: ['11:00', '19:00'],
        [DayOfWeek.FRI]: ['11:00', '23:00'],
        [DayOfWeek.SAT]: ['11:00', '23:00'],
      },
    },
    {
      email: 'james@coastaleats.com',
      name: 'James Bartender',
      timezone: 'America/Los_Angeles',
      locationIds: [2, 3],
      skillIds: [0, 3],
      availability: {
        [DayOfWeek.WED]: ['09:00', '17:00'],
        [DayOfWeek.THU]: ['09:00', '17:00'],
        [DayOfWeek.FRI]: ['14:00', '22:00'],
        [DayOfWeek.SAT]: ['14:00', '23:00'],
        [DayOfWeek.SUN]: ['14:00', '22:00'],
      },
    },
  ];

  const savedStaff: Array<{
    profile: UserProfile;
    data: (typeof staffData)[0];
  }> = [];
  for (const staff of staffData) {
    let user = await userRepo.findOne({ where: { email: staff.email } });
    let profile: UserProfile | null = null;
    if (user) {
      profile = await profileRepo.findOne({
        where: { user: { email: staff.email } },
        relations: ['user'],
      });
    }
    if (!profile) {
      if (!user) {
        user = await userRepo.save(
          userRepo.create({ email: staff.email, name: staff.name }),
        );
      }
      profile = await profileRepo.save(
        profileRepo.create({
          externalId: user.externalId,
          role: UserRole.STAFF,
          homeTimezone: staff.timezone,
          desiredHoursPerWeek: 40,
        }),
      );
      console.log(`Created staff: ${staff.email}`);
    } else {
      console.log(`Staff "${staff.email}" already exists`);
    }
    savedStaff.push({ profile, data: staff });

    // Certifications
    for (const locIdx of staff.locationIds) {
      const existing = await locationCertRepo.findOne({
        where: {
          staffMemberId: profile.id,
          locationId: savedLocations[locIdx].id,
        },
      });
      if (!existing) {
        await locationCertRepo.save(
          locationCertRepo.create({
            staffMemberId: profile.id,
            locationId: savedLocations[locIdx].id,
          }),
        );
      }
    }

    // Skills
    for (const skillIdx of staff.skillIds) {
      const existing = await staffSkillRepo.findOne({
        where: { staffMemberId: profile.id, skillId: savedSkills[skillIdx].id },
      });
      if (!existing) {
        await staffSkillRepo.save(
          staffSkillRepo.create({
            staffMemberId: profile.id,
            skillId: savedSkills[skillIdx].id,
          }),
        );
      }
    }

    // Availability
    for (const [day, [start, end]] of Object.entries(staff.availability) as [
      string,
      [string, string],
    ][]) {
      const existing = await availabilityRepo.findOne({
        where: {
          staffMemberId: profile.id,
          dayOfWeek: day as DayOfWeek,
          wallStartTime: start,
          wallEndTime: end,
        },
      });
      if (!existing) {
        await availabilityRepo.save(
          availabilityRepo.create({
            staffMemberId: profile.id,
            dayOfWeek: day as DayOfWeek,
            wallStartTime: start,
            wallEndTime: end,
          }),
        );
      }
    }
  }

  // --- Sample Shifts (2 weeks ahead) ---
  const now = Temporal.Now.instant();
  const downtown = savedLocations[0];
  const downtownTimezone = downtown.timezone;

  for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
    const baseDate = now
      .toZonedDateTimeISO(downtownTimezone)
      .add({ days: dayOffset });
    const shiftDate = new Date(
      baseDate
        .with({ hour: 10, minute: 0, second: 0, nanosecond: 0 })
        .toInstant()
        .toString(),
    );
    const shiftEnd = new Date(
      baseDate
        .with({ hour: 18, minute: 0, second: 0, nanosecond: 0 })
        .toInstant()
        .toString(),
    );

    const existingShift = await shiftRepo.findOne({
      where: {
        locationId: downtown.id,
        startTime: new Date(shiftDate),
        endTime: new Date(shiftEnd),
      },
    });

    if (!existingShift) {
      const shift = await shiftRepo.save(
        shiftRepo.create({
          locationId: downtown.id,
          startTime: shiftDate,
          endTime: shiftEnd,
          state: ShiftState.OPEN,
        }),
      );

      const bartenderSlot = await shiftSkillRepo.save(
        shiftSkillRepo.create({
          shiftId: shift.id,
          skillId: savedSkills[0].id,
          headcount: 1,
        }),
      );

      const serverSlot = await shiftSkillRepo.save(
        shiftSkillRepo.create({
          shiftId: shift.id,
          skillId: savedSkills[2].id,
          headcount: 2,
        }),
      );

      if (dayOffset % 3 === 0) {
        await assignmentRepo.save(
          assignmentRepo.create({
            shiftSkillId: bartenderSlot.id,
            staffMemberId: savedStaff[0].profile.id,
            state: AssignmentState.ASSIGNED,
          }),
        );
        await shiftRepo.update(shift.id, {
          state: ShiftState.PARTIALLY_FILLED,
        });
      }

      if (dayOffset % 5 === 0) {
        await assignmentRepo.save(
          assignmentRepo.create({
            shiftSkillId: serverSlot.id,
            staffMemberId: savedStaff[1].profile.id,
            state: AssignmentState.ASSIGNED,
          }),
        );
        await shiftRepo.update(shift.id, {
          state: ShiftState.PARTIALLY_FILLED,
        });
      }

      console.log(`Created shift: ${shiftDate.toISOString()} at Downtown`);
    }
  }

  console.log('Seed complete!');
  await dataSource.destroy();
}

seed().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
