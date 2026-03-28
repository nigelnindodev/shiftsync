import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { of } from 'rxjs';
import { AssignmentService } from './assignment.service';
import { AssignmentRepository } from '../repositories';
import { ShiftRepository } from '../repositories';
import { ShiftSkillRepository } from '../repositories';
import { DomainEventRepository } from '../repositories';
import { EmployeeRepository } from '../../users/employee.repository';
import { SchedulingConstraintService } from '../constraints/scheduling-constraint.service';
import { ClockService } from '../../common/clock/clock.service';
import {
  StaffSkillRepository,
  LocationCertificationRepository,
  StaffAvailabilityRepository,
} from '../../staffing/repositories';
import { clearDatabase } from '../../../test/db-utils';

import { User } from '../../users/entity/user.entity';
import { Employee } from '../../users/entity/employee.entity';
import { Token } from '../../auth/entity/tokens.entity';
import { Location } from '../../staffing/entities/location.entity';
import { ManagerLocation } from '../../staffing/entities/manager-location.entity';
import { Skill } from '../../staffing/entities/skill.entity';
import { StaffSkill } from '../../staffing/entities/staff-skill.entity';
import { LocationCertification } from '../../staffing/entities/location-certification.entity';
import {
  StaffAvailability,
  DayOfWeek,
} from '../../staffing/entities/staff-availability.entity';
import { StaffAvailabilityException } from '../../staffing/entities/staff-availability-exception.entity';
import { Shift, ShiftState } from '../entities/shift.entity';
import { ShiftSkill as ShiftSkillEntity } from '../entities/shift-skill.entity';
import { Assignment, AssignmentState } from '../entities/assignment.entity';
import { DomainEvent } from '../entities/domain-event.entity';
import { EmployeeRole } from '../../users/user.types';
import { SchedulingEventPatterns } from '../events/scheduling-events';
import { SCHEDULING_EVENTS_CLIENT } from '../scheduling.constants';

describe('AssignmentService (Integration)', () => {
  let module: TestingModule;
  let assignmentService: AssignmentService;
  let dataSource: DataSource;
  let emitMock: jest.Mock;

  beforeAll(async () => {
    emitMock = jest.fn(() => of(undefined));
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.PG_HOST,
          port: parseInt(process.env.PG_PORT || '5432', 10),
          username: process.env.PG_USERNAME,
          password: process.env.PG_PASSWORD,
          database: process.env.PG_DATABASE,
          entities: [__dirname + '/../../**/*.entity.{ts,js}'],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([
          User,
          Employee,
          Token,
          Location,
          ManagerLocation,
          Skill,
          StaffSkill,
          LocationCertification,
          StaffAvailability,
          StaffAvailabilityException,
          Shift,
          ShiftSkillEntity,
          Assignment,
          DomainEvent,
        ]),
      ],
      providers: [
        AssignmentService,
        AssignmentRepository,
        ShiftRepository,
        ShiftSkillRepository,
        DomainEventRepository,
        EmployeeRepository,
        SchedulingConstraintService,
        {
          provide: ClockService,
          useValue: { now: () => new Date('2026-03-23T12:00:00Z') },
        },
        StaffSkillRepository,
        LocationCertificationRepository,
        StaffAvailabilityRepository,
        {
          provide: SCHEDULING_EVENTS_CLIENT,
          useValue: { emit: emitMock },
        },
      ],
    }).compile();

    assignmentService = module.get<AssignmentService>(AssignmentService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  beforeEach(async () => {
    await clearDatabase(dataSource);
    emitMock.mockClear();
  });

  async function createEmployee(userName = 'Test User') {
    const user = await dataSource.getRepository(User).save({
      email: `${userName.toLowerCase().replace(/ /g, '.')}@example.com`,
      name: userName,
    });
    const employee = await dataSource.getRepository(Employee).save({
      externalId: user.externalId,
      role: EmployeeRole.STAFF,
      homeTimezone: 'UTC',
      desiredHoursPerWeek: 40,
    });
    return { user, employee };
  }

  async function createLocation() {
    return dataSource.getRepository(Location).save({
      name: 'Test Location',
      timezone: 'UTC',
      brand: 'Brand',
    });
  }

  async function createSkill() {
    return dataSource.getRepository(Skill).save({
      name: 'Test Skill',
      isActive: true,
    });
  }

  async function createShiftWithSlot(locationId: number, skillId: number) {
    const shift = await dataSource.getRepository(Shift).save({
      locationId,
      startTime: new Date('2026-03-24T10:00:00Z'),
      endTime: new Date('2026-03-24T18:00:00Z'),
      state: ShiftState.OPEN,
    });
    const shiftSkill = await dataSource.getRepository(ShiftSkillEntity).save({
      shiftId: shift.id,
      skillId,
      headcount: 1,
    });
    return { shift, shiftSkill };
  }

  async function certifyEmployee(
    employeeId: number,
    locationId: number,
    skillId: number,
  ) {
    await dataSource.getRepository(StaffSkill).save({
      staffMemberId: employeeId,
      skillId,
    });
    await dataSource.getRepository(LocationCertification).save({
      staffMemberId: employeeId,
      locationId,
    });
    await dataSource.getRepository(StaffAvailability).save({
      staffMemberId: employeeId,
      dayOfWeek: DayOfWeek.TUE,
      wallStartTime: '08:00:00',
      wallEndTime: '20:00:00',
    });
  }

  describe('assignStaff', () => {
    it('creates assignment when constraints pass and emits AssignmentCreated event', async () => {
      const { employee } = await createEmployee();
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(employee.id, location.id, skill.id);

      const { shift, shiftSkill } = await createShiftWithSlot(
        location.id,
        skill.id,
      );

      const result = await assignmentService.assignStaff(
        shift.id,
        shiftSkill.id,
        employee.id,
      );

      expect(result.assignmentId).toBeDefined();
      expect(result.staffMemberId).toBe(employee.id);
      expect(result.state).toBe(AssignmentState.ASSIGNED);

      const updatedShift = await dataSource.getRepository(Shift).findOneBy({
        id: shift.id,
      });
      expect(updatedShift?.state).toBe(ShiftState.FILLED);

      const events = await dataSource.getRepository(DomainEvent).find({
        where: { aggregateId: result.assignmentId },
      });
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe(
        SchedulingEventPatterns.ASSIGNMENT_CREATED,
      );

      expect(emitMock).toHaveBeenCalledWith(
        SchedulingEventPatterns.ASSIGNMENT_CREATED,
        expect.objectContaining({
          assignmentId: result.assignmentId,
          shiftSkillId: shiftSkill.id,
          shiftId: shift.id,
          staffMemberId: employee.id,
          eventId: events[0].id,
        }),
      );
    });

    it('sets shift state to FILLED when all slots are filled', async () => {
      const { employee: emp1 } = await createEmployee('User 1');
      const { employee: emp2 } = await createEmployee('User 2');
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(emp1.id, location.id, skill.id);
      await certifyEmployee(emp2.id, location.id, skill.id);

      const shift = await dataSource.getRepository(Shift).save({
        locationId: location.id,
        startTime: new Date('2026-03-24T10:00:00Z'),
        endTime: new Date('2026-03-24T18:00:00Z'),
        state: ShiftState.OPEN,
      });
      const shiftSkill = await dataSource.getRepository(ShiftSkillEntity).save({
        shiftId: shift.id,
        skillId: skill.id,
        headcount: 2,
      });

      await assignmentService.assignStaff(shift.id, shiftSkill.id, emp1.id);
      await assignmentService.assignStaff(shift.id, shiftSkill.id, emp2.id);

      const updatedShift = await dataSource.getRepository(Shift).findOneBy({
        id: shift.id,
      });
      expect(updatedShift?.state).toBe(ShiftState.FILLED);
    });

    it('rejects assignment with constraint violation', async () => {
      const { employee } = await createEmployee();
      const location = await createLocation();
      const skill = await createSkill();

      const { shift, shiftSkill } = await createShiftWithSlot(
        location.id,
        skill.id,
      );

      await expect(
        assignmentService.assignStaff(shift.id, shiftSkill.id, employee.id),
      ).rejects.toThrow('Constraint violations prevented assignment');

      const assignments = await dataSource.getRepository(Assignment).find({
        where: { shiftSkillId: shiftSkill.id },
      });
      expect(assignments).toHaveLength(0);

      const events = await dataSource.getRepository(DomainEvent).find({
        where: { aggregateType: 'Assignment' },
      });
      expect(events).toHaveLength(0);
    });

    it('creates assignment but keeps shift LOCKED', async () => {
      const { employee } = await createEmployee();
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(employee.id, location.id, skill.id);

      const shift = await dataSource.getRepository(Shift).save({
        locationId: location.id,
        startTime: new Date('2026-03-24T10:00:00Z'),
        endTime: new Date('2026-03-24T18:00:00Z'),
        state: ShiftState.LOCKED,
      });
      const shiftSkill = await dataSource.getRepository(ShiftSkillEntity).save({
        shiftId: shift.id,
        skillId: skill.id,
        headcount: 1,
      });

      await assignmentService.assignStaff(shift.id, shiftSkill.id, employee.id);

      const updatedShift = await dataSource.getRepository(Shift).findOneBy({
        id: shift.id,
      });
      expect(updatedShift?.state).toBe(ShiftState.LOCKED);
    });
  });

  describe('removeAssignment', () => {
    it('cancels assignment and emits AssignmentRemoved event', async () => {
      const { employee } = await createEmployee();
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(employee.id, location.id, skill.id);

      const { shift, shiftSkill } = await createShiftWithSlot(
        location.id,
        skill.id,
      );

      const assignment = await dataSource.getRepository(Assignment).save({
        staffMemberId: employee.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.ASSIGNED,
      });

      await assignmentService.removeAssignment(
        shift.id,
        shiftSkill.id,
        assignment.id,
      );

      const updatedAssignment = await dataSource
        .getRepository(Assignment)
        .findOneBy({ id: assignment.id });
      expect(updatedAssignment?.state).toBe(AssignmentState.CANCELLED);

      const events = await dataSource.getRepository(DomainEvent).find({
        where: { aggregateId: assignment.id },
      });
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe(
        SchedulingEventPatterns.ASSIGNMENT_REMOVED,
      );

      expect(emitMock).toHaveBeenCalledWith(
        SchedulingEventPatterns.ASSIGNMENT_REMOVED,
        expect.objectContaining({
          assignmentId: assignment.id,
          shiftSkillId: shiftSkill.id,
          shiftId: shift.id,
          staffMemberId: employee.id,
          eventId: events[0].id,
        }),
      );
    });

    it('recalculates shift state after removal', async () => {
      const { employee } = await createEmployee();
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(employee.id, location.id, skill.id);

      const shift = await dataSource.getRepository(Shift).save({
        locationId: location.id,
        startTime: new Date('2026-03-24T10:00:00Z'),
        endTime: new Date('2026-03-24T18:00:00Z'),
        state: ShiftState.FILLED,
      });
      const shiftSkill = await dataSource.getRepository(ShiftSkillEntity).save({
        shiftId: shift.id,
        skillId: skill.id,
        headcount: 1,
      });

      const assignment = await dataSource.getRepository(Assignment).save({
        staffMemberId: employee.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.ASSIGNED,
      });

      await assignmentService.removeAssignment(
        shift.id,
        shiftSkill.id,
        assignment.id,
      );

      const updatedShift = await dataSource.getRepository(Shift).findOneBy({
        id: shift.id,
      });
      expect(updatedShift?.state).toBe(ShiftState.OPEN);
    });

    it('throws NotFoundException for non-existent assignment', async () => {
      const location = await createLocation();
      const skill = await createSkill();
      const { shift, shiftSkill } = await createShiftWithSlot(
        location.id,
        skill.id,
      );

      await expect(
        assignmentService.removeAssignment(shift.id, shiftSkill.id, 99999),
      ).rejects.toThrow('Assignment not found');
    });

    it('cancels assignment but keeps shift LOCKED', async () => {
      const { employee } = await createEmployee();
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(employee.id, location.id, skill.id);

      const shift = await dataSource.getRepository(Shift).save({
        locationId: location.id,
        startTime: new Date('2026-03-24T10:00:00Z'),
        endTime: new Date('2026-03-24T18:00:00Z'),
        state: ShiftState.LOCKED,
      });
      const shiftSkill = await dataSource.getRepository(ShiftSkillEntity).save({
        shiftId: shift.id,
        skillId: skill.id,
        headcount: 1,
      });

      const assignment = await dataSource.getRepository(Assignment).save({
        staffMemberId: employee.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.ASSIGNED,
      });

      await assignmentService.removeAssignment(
        shift.id,
        shiftSkill.id,
        assignment.id,
      );

      const updatedShift = await dataSource.getRepository(Shift).findOneBy({
        id: shift.id,
      });
      expect(updatedShift?.state).toBe(ShiftState.LOCKED);
    });
  });

  describe('getAssignmentsForSlot', () => {
    it('returns assignments for a slot', async () => {
      const { employee } = await createEmployee();
      const location = await createLocation();
      const skill = await createSkill();

      const { shiftSkill } = await createShiftWithSlot(location.id, skill.id);

      await dataSource.getRepository(Assignment).save({
        staffMemberId: employee.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.ASSIGNED,
      });

      const result = await assignmentService.getAssignmentsForSlot(
        shiftSkill.id,
      );

      expect(result).toHaveLength(1);
      expect(result[0].staffMemberId).toBe(employee.id);
    });
  });

  describe('getEligibleStaff', () => {
    it('returns only staff who pass constraints', async () => {
      const { employee: eligibleEmp } = await createEmployee('Eligible User');
      await createEmployee('Ineligible User');
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(eligibleEmp.id, location.id, skill.id);

      const { shift, shiftSkill } = await createShiftWithSlot(
        location.id,
        skill.id,
      );

      const result = await assignmentService.getEligibleStaff(
        shift.id,
        shiftSkill.id,
      );

      expect(result).toHaveLength(1);
      expect(result[0].staffMemberId).toBe(eligibleEmp.id);
    });
  });

  describe('requestSwap', () => {
    it('transitions assignment to SWAP_REQUESTED and emits event', async () => {
      const { employee: staffA } = await createEmployee('Staff A');
      const { employee: staffB } = await createEmployee('Staff B');
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(staffA.id, location.id, skill.id);

      const { shiftSkill } = await createShiftWithSlot(location.id, skill.id);

      const assignment = await dataSource.getRepository(Assignment).save({
        staffMemberId: staffA.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.ASSIGNED,
      });

      await assignmentService.requestSwap(assignment.id, staffB.id, staffA.id);

      const updated = await dataSource
        .getRepository(Assignment)
        .findOneBy({ id: assignment.id });
      expect(updated?.state).toBe(AssignmentState.SWAP_REQUESTED);
      expect(updated?.swapTargetId).toBe(staffB.id);

      const events = await dataSource.getRepository(DomainEvent).find({
        where: { aggregateId: assignment.id },
      });
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe(SchedulingEventPatterns.SWAP_REQUESTED);
    });

    it('rejects when assignment is not ASSIGNED', async () => {
      const { employee: staffA } = await createEmployee('Staff A');
      const { employee: staffB } = await createEmployee('Staff B');
      const location = await createLocation();
      const skill = await createSkill();

      const { shiftSkill } = await createShiftWithSlot(location.id, skill.id);

      const assignment = await dataSource.getRepository(Assignment).save({
        staffMemberId: staffA.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.SWAP_REQUESTED,
      });

      await expect(
        assignmentService.requestSwap(assignment.id, staffB.id, staffA.id),
      ).rejects.toThrow('Can only request swap on ASSIGNED assignments');
    });

    it('rejects when max pending requests reached', async () => {
      const { employee: staffA } = await createEmployee('Staff A');
      const { employee: staffB } = await createEmployee('Staff B');
      const { employee: staffC } = await createEmployee('Staff C');
      const { employee: staffD } = await createEmployee('Staff D');
      const { employee: staffE } = await createEmployee('Staff E');
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(staffA.id, location.id, skill.id);

      // Create 3 shifts to assign staffA to
      const shifts: Array<{ shift: Shift; shiftSkill: ShiftSkillEntity }> = [];
      for (let i = 0; i < 4; i++) {
        const shift = await dataSource.getRepository(Shift).save({
          locationId: location.id,
          startTime: new Date(`2026-03-${24 + i}T10:00:00Z`),
          endTime: new Date(`2026-03-${24 + i}T18:00:00Z`),
          state: ShiftState.OPEN,
        });
        const shiftSkill = await dataSource
          .getRepository(ShiftSkillEntity)
          .save({
            shiftId: shift.id,
            skillId: skill.id,
            headcount: 1,
          });
        shifts.push({ shift, shiftSkill });
      }

      // Create 3 pending swap requests (max)
      const targets = [staffB, staffC, staffD];
      for (let i = 0; i < 3; i++) {
        await dataSource.getRepository(Assignment).save({
          staffMemberId: staffA.id,
          shiftSkillId: shifts[i].shiftSkill.id,
          state: AssignmentState.SWAP_REQUESTED,
          swapTargetId: targets[i].id,
        });
      }

      // 4th should fail
      const assignment = await dataSource.getRepository(Assignment).save({
        staffMemberId: staffA.id,
        shiftSkillId: shifts[3].shiftSkill.id,
        state: AssignmentState.ASSIGNED,
      });

      await expect(
        assignmentService.requestSwap(assignment.id, staffE.id, staffA.id),
      ).rejects.toThrow('Maximum 3 pending swap/drop requests allowed');
    });

    it('rejects when staff tries to swap another staff member assignment', async () => {
      const { employee: staffA } = await createEmployee('Staff A');
      const { employee: staffB } = await createEmployee('Staff B');
      const location = await createLocation();
      const skill = await createSkill();

      const { shiftSkill } = await createShiftWithSlot(location.id, skill.id);

      const assignment = await dataSource.getRepository(Assignment).save({
        staffMemberId: staffA.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.ASSIGNED,
      });

      await expect(
        assignmentService.requestSwap(assignment.id, staffB.id, staffB.id),
      ).rejects.toThrow('You can only swap your own assignments');
    });

    it('rejects when staff tries to swap with themselves', async () => {
      const { employee: staffA } = await createEmployee('Staff A');
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(staffA.id, location.id, skill.id);

      const { shiftSkill } = await createShiftWithSlot(location.id, skill.id);

      const assignment = await dataSource.getRepository(Assignment).save({
        staffMemberId: staffA.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.ASSIGNED,
      });

      await expect(
        assignmentService.requestSwap(assignment.id, staffA.id, staffA.id),
      ).rejects.toThrow('Cannot swap with yourself');
    });
  });

  describe('acceptSwap', () => {
    it('creates partner assignment and transitions both to SWAP_PENDING_APPROVAL', async () => {
      const { employee: staffA } = await createEmployee('Staff A');
      const { employee: staffB } = await createEmployee('Staff B');
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(staffA.id, location.id, skill.id);
      await certifyEmployee(staffB.id, location.id, skill.id);

      const { shiftSkill } = await createShiftWithSlot(location.id, skill.id);

      const assignmentA = await dataSource.getRepository(Assignment).save({
        staffMemberId: staffA.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.SWAP_REQUESTED,
        swapTargetId: staffB.id,
      });

      await assignmentService.acceptSwap(assignmentA.id, staffB.id);

      const updatedA = await dataSource
        .getRepository(Assignment)
        .findOneBy({ id: assignmentA.id });
      expect(updatedA?.state).toBe(AssignmentState.SWAP_PENDING_APPROVAL);

      const assignments = await dataSource.getRepository(Assignment).find({
        where: { staffMemberId: staffB.id, shiftSkillId: shiftSkill.id },
      });
      expect(assignments).toHaveLength(1);
      expect(assignments[0].state).toBe(AssignmentState.SWAP_PENDING_APPROVAL);
      expect(assignments[0].swapTargetId).toBe(assignmentA.id);
    });

    it('rejects when not the swap target', async () => {
      const { employee: staffA } = await createEmployee('Staff A');
      const { employee: staffB } = await createEmployee('Staff B');
      const { employee: staffC } = await createEmployee('Staff C');
      const location = await createLocation();
      const skill = await createSkill();

      const { shiftSkill } = await createShiftWithSlot(location.id, skill.id);

      const assignment = await dataSource.getRepository(Assignment).save({
        staffMemberId: staffA.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.SWAP_REQUESTED,
        swapTargetId: staffB.id,
      });

      await expect(
        assignmentService.acceptSwap(assignment.id, staffC.id),
      ).rejects.toThrow('You are not the target of this swap');
    });

    it('rejects when target staff lacks certification', async () => {
      const { employee: staffA } = await createEmployee('Staff A');
      const { employee: staffB } = await createEmployee('Staff B');
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(staffA.id, location.id, skill.id);
      // staffB is NOT certified

      const { shiftSkill } = await createShiftWithSlot(location.id, skill.id);

      const assignment = await dataSource.getRepository(Assignment).save({
        staffMemberId: staffA.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.SWAP_REQUESTED,
        swapTargetId: staffB.id,
      });

      await expect(
        assignmentService.acceptSwap(assignment.id, staffB.id),
      ).rejects.toThrow('Constraint violations prevented swap acceptance');
    });
  });

  describe('requestDrop', () => {
    it('transitions assignment to DROP_REQUESTED and emits event', async () => {
      const { employee: staffA } = await createEmployee('Staff A');
      const location = await createLocation();
      const skill = await createSkill();

      const { shiftSkill } = await createShiftWithSlot(location.id, skill.id);

      const assignment = await dataSource.getRepository(Assignment).save({
        staffMemberId: staffA.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.ASSIGNED,
      });

      await assignmentService.requestDrop(assignment.id, staffA.id);

      const updated = await dataSource
        .getRepository(Assignment)
        .findOneBy({ id: assignment.id });
      expect(updated?.state).toBe(AssignmentState.DROP_REQUESTED);

      const events = await dataSource.getRepository(DomainEvent).find({
        where: { aggregateId: assignment.id },
      });
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe(SchedulingEventPatterns.DROP_REQUESTED);
    });
  });

  describe('claimDrop', () => {
    it('creates partner assignment and transitions to DROP_PENDING_APPROVAL', async () => {
      const { employee: staffA } = await createEmployee('Staff A');
      const { employee: staffB } = await createEmployee('Staff B');
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(staffB.id, location.id, skill.id);

      const { shiftSkill } = await createShiftWithSlot(location.id, skill.id);

      const assignmentA = await dataSource.getRepository(Assignment).save({
        staffMemberId: staffA.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.DROP_REQUESTED,
      });

      await assignmentService.claimDrop(assignmentA.id, staffB.id);

      const updatedA = await dataSource
        .getRepository(Assignment)
        .findOneBy({ id: assignmentA.id });
      expect(updatedA?.state).toBe(AssignmentState.DROP_REQUESTED);
      expect(updatedA?.swapTargetId).toBeDefined();

      const assignments = await dataSource.getRepository(Assignment).find({
        where: { staffMemberId: staffB.id, shiftSkillId: shiftSkill.id },
      });
      expect(assignments).toHaveLength(1);
      expect(assignments[0].state).toBe(AssignmentState.DROP_PENDING_APPROVAL);
      expect(assignments[0].swapTargetId).toBe(assignmentA.id);
    });

    it('rejects when staff tries to claim own drop', async () => {
      const { employee: staffA } = await createEmployee('Staff A');
      const location = await createLocation();
      const skill = await createSkill();

      const { shiftSkill } = await createShiftWithSlot(location.id, skill.id);

      const assignment = await dataSource.getRepository(Assignment).save({
        staffMemberId: staffA.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.DROP_REQUESTED,
      });

      await expect(
        assignmentService.claimDrop(assignment.id, staffA.id),
      ).rejects.toThrow('Cannot claim your own drop request');
    });
  });

  describe('approveSwapDrop', () => {
    it('approves drop: cancels original, assigns claimer', async () => {
      const { employee: staffA } = await createEmployee('Staff A');
      const { employee: staffB } = await createEmployee('Staff B');
      const { employee: manager } = await createEmployee('Manager');
      const location = await createLocation();
      const skill = await createSkill();

      const { shiftSkill } = await createShiftWithSlot(location.id, skill.id);

      const assignmentA = await dataSource.getRepository(Assignment).save({
        staffMemberId: staffA.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.DROP_REQUESTED,
      });
      const assignmentB = await dataSource.getRepository(Assignment).save({
        staffMemberId: staffB.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.DROP_PENDING_APPROVAL,
        swapTargetId: assignmentA.id,
      });
      await dataSource
        .getRepository(Assignment)
        .update(assignmentA.id, { swapTargetId: assignmentB.id });

      await assignmentService.approveSwapDrop(
        assignmentA.id,
        shiftSkill.id,
        manager.id,
        true,
      );

      const updatedA = await dataSource
        .getRepository(Assignment)
        .findOneBy({ id: assignmentA.id });
      expect(updatedA?.state).toBe(AssignmentState.CANCELLED);

      const updatedB = await dataSource
        .getRepository(Assignment)
        .findOneBy({ id: assignmentB.id });
      expect(updatedB?.state).toBe(AssignmentState.ASSIGNED);

      const events = await dataSource.getRepository(DomainEvent).find({
        where: { aggregateId: assignmentA.id },
      });
      expect(
        events.some(
          (e) => e.eventType === SchedulingEventPatterns.DROP_APPROVED,
        ),
      ).toBe(true);
    });

    it('rejects drop: cancels claimer, reverts original to ASSIGNED', async () => {
      const { employee: staffA } = await createEmployee('Staff A');
      const { employee: staffB } = await createEmployee('Staff B');
      const { employee: manager } = await createEmployee('Manager');
      const location = await createLocation();
      const skill = await createSkill();

      const { shiftSkill } = await createShiftWithSlot(location.id, skill.id);

      const assignmentA = await dataSource.getRepository(Assignment).save({
        staffMemberId: staffA.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.DROP_REQUESTED,
      });
      const assignmentB = await dataSource.getRepository(Assignment).save({
        staffMemberId: staffB.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.DROP_PENDING_APPROVAL,
        swapTargetId: assignmentA.id,
      });
      await dataSource
        .getRepository(Assignment)
        .update(assignmentA.id, { swapTargetId: assignmentB.id });

      await assignmentService.approveSwapDrop(
        assignmentA.id,
        shiftSkill.id,
        manager.id,
        false,
      );

      const updatedA = await dataSource
        .getRepository(Assignment)
        .findOneBy({ id: assignmentA.id });
      expect(updatedA?.state).toBe(AssignmentState.ASSIGNED);

      const updatedB = await dataSource
        .getRepository(Assignment)
        .findOneBy({ id: assignmentB.id });
      expect(updatedB?.state).toBe(AssignmentState.CANCELLED);
    });

    it('approves swap: cancels original, assigns partner', async () => {
      const { employee: staffA } = await createEmployee('Staff A');
      const { employee: staffB } = await createEmployee('Staff B');
      const { employee: manager } = await createEmployee('Manager');
      const location = await createLocation();
      const skill = await createSkill();

      const { shiftSkill } = await createShiftWithSlot(location.id, skill.id);

      const assignmentA = await dataSource.getRepository(Assignment).save({
        staffMemberId: staffA.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.SWAP_PENDING_APPROVAL,
      });
      const assignmentB = await dataSource.getRepository(Assignment).save({
        staffMemberId: staffB.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.SWAP_PENDING_APPROVAL,
        swapTargetId: assignmentA.id,
      });
      await dataSource
        .getRepository(Assignment)
        .update(assignmentA.id, { swapTargetId: assignmentB.id });

      await assignmentService.approveSwapDrop(
        assignmentA.id,
        shiftSkill.id,
        manager.id,
        true,
      );

      const updatedA = await dataSource
        .getRepository(Assignment)
        .findOneBy({ id: assignmentA.id });
      expect(updatedA?.state).toBe(AssignmentState.CANCELLED);

      const updatedB = await dataSource
        .getRepository(Assignment)
        .findOneBy({ id: assignmentB.id });
      expect(updatedB?.state).toBe(AssignmentState.ASSIGNED);
      expect(updatedB?.swapTargetId).toBeNull();
    });

    it('rejects swap: restores original to ASSIGNED, cancels partner', async () => {
      const { employee: staffA } = await createEmployee('Staff A');
      const { employee: staffB } = await createEmployee('Staff B');
      const { employee: manager } = await createEmployee('Manager');
      const location = await createLocation();
      const skill = await createSkill();

      const { shiftSkill } = await createShiftWithSlot(location.id, skill.id);

      const assignmentA = await dataSource.getRepository(Assignment).save({
        staffMemberId: staffA.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.SWAP_PENDING_APPROVAL,
      });
      const assignmentB = await dataSource.getRepository(Assignment).save({
        staffMemberId: staffB.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.SWAP_PENDING_APPROVAL,
        swapTargetId: assignmentA.id,
      });
      await dataSource
        .getRepository(Assignment)
        .update(assignmentA.id, { swapTargetId: assignmentB.id });

      await assignmentService.approveSwapDrop(
        assignmentA.id,
        shiftSkill.id,
        manager.id,
        false,
      );

      const updatedA = await dataSource
        .getRepository(Assignment)
        .findOneBy({ id: assignmentA.id });
      expect(updatedA?.state).toBe(AssignmentState.ASSIGNED);

      const updatedB = await dataSource
        .getRepository(Assignment)
        .findOneBy({ id: assignmentB.id });
      expect(updatedB?.state).toBe(AssignmentState.CANCELLED);
    });
  });

  describe('getPendingApprovalsForLocation', () => {
    it('returns pending swap/drop assignments for the given location', async () => {
      const { employee: staffA } = await createEmployee('Staff A');
      const { employee: staffB } = await createEmployee('Staff B');
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(staffA.id, location.id, skill.id);
      await certifyEmployee(staffB.id, location.id, skill.id);

      const { shiftSkill } = await createShiftWithSlot(location.id, skill.id);

      // Create assignment in SWAP_REQUESTED with target = staffB
      const assignmentA = await dataSource.getRepository(Assignment).save({
        staffMemberId: staffA.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.SWAP_REQUESTED,
        swapTargetId: staffB.id,
      });

      // Use acceptSwap to produce canonical SWAP_PENDING_APPROVAL pair
      await assignmentService.acceptSwap(assignmentA.id, staffB.id);

      // Regular assignment — should not appear
      await dataSource.getRepository(Assignment).save({
        shiftSkillId: shiftSkill.id,
        staffMemberId: staffA.id,
        state: AssignmentState.ASSIGNED,
      });

      const result = await assignmentService.getPendingApprovalsForLocation(
        location.id,
      );

      expect(result).toHaveLength(2);
      const staffAEntry = result.find((r) => r.staffName === 'Staff A');
      const staffBEntry = result.find((r) => r.staffName === 'Staff B');
      expect(staffAEntry).toBeDefined();
      expect(staffAEntry?.state).toBe('SWAP_PENDING_APPROVAL');
      expect(staffAEntry?.swapTargetName).toBe('Staff B');
      expect(staffBEntry).toBeDefined();
      expect(staffBEntry?.state).toBe('SWAP_PENDING_APPROVAL');
      expect(staffBEntry?.swapTargetName).toBe('Staff A');
    });

    it('returns empty array when no pending approvals exist', async () => {
      const location = await dataSource.getRepository(Location).save({
        name: 'Empty Location ' + Date.now(),
        timezone: 'America/New_York',
      });

      const result = await assignmentService.getPendingApprovalsForLocation(
        location.id,
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('getStaffPendingRequests', () => {
    it('returns incoming SWAP_REQUESTED targeting this staff', async () => {
      const { employee: staffA } = await createEmployee('Staff A');
      const { employee: staffB } = await createEmployee('Staff B');
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(staffA.id, location.id, skill.id);
      await certifyEmployee(staffB.id, location.id, skill.id);

      const { shiftSkill } = await createShiftWithSlot(location.id, skill.id);

      // staffA requests swap with staffB
      await dataSource.getRepository(Assignment).save({
        staffMemberId: staffA.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.SWAP_REQUESTED,
        swapTargetId: staffB.id,
      });

      // staffB should see it (they are the target)
      const resultB = await assignmentService.getStaffPendingRequests(
        staffB.id,
      );
      expect(resultB).toHaveLength(1);
      expect(resultB[0].state).toBe('SWAP_REQUESTED');
      expect(resultB[0].staffName).toBe('Staff A');
      expect(resultB[0].swapTargetName).toBe('Staff B');

      // staffA should NOT see it (it's their own request, not incoming)
      const resultA = await assignmentService.getStaffPendingRequests(
        staffA.id,
      );
      expect(resultA).toHaveLength(0);
    });

    it('returns own SWAP_PENDING_APPROVAL entries for both parties', async () => {
      const { employee: staffA } = await createEmployee('Staff A');
      const { employee: staffB } = await createEmployee('Staff B');
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(staffA.id, location.id, skill.id);
      await certifyEmployee(staffB.id, location.id, skill.id);

      const { shiftSkill } = await createShiftWithSlot(location.id, skill.id);

      const assignmentA = await dataSource.getRepository(Assignment).save({
        staffMemberId: staffA.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.SWAP_REQUESTED,
        swapTargetId: staffB.id,
      });

      // staffB accepts -> produces SWAP_PENDING_APPROVAL pair
      await assignmentService.acceptSwap(assignmentA.id, staffB.id);

      // Both should see their own SWAP_PENDING_APPROVAL entry
      const resultA = await assignmentService.getStaffPendingRequests(
        staffA.id,
      );
      expect(resultA).toHaveLength(1);
      expect(resultA[0].state).toBe('SWAP_PENDING_APPROVAL');

      const resultB = await assignmentService.getStaffPendingRequests(
        staffB.id,
      );
      expect(resultB).toHaveLength(1);
      expect(resultB[0].state).toBe('SWAP_PENDING_APPROVAL');
    });

    it('returns unclaimed DROP_REQUESTED only for staff with matching skill', async () => {
      const { employee: staffA } = await createEmployee('Staff A');
      const { employee: staffB } = await createEmployee('Staff B');
      const location = await createLocation();
      const skill = await createSkill();
      // staffA has the skill (will drop)
      await certifyEmployee(staffA.id, location.id, skill.id);

      const { shiftSkill } = await createShiftWithSlot(location.id, skill.id);

      // staffA drops their shift (unclaimed)
      await dataSource.getRepository(Assignment).save({
        staffMemberId: staffA.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.DROP_REQUESTED,
      });

      // staffB has the skill → should see it
      await dataSource.getRepository(StaffSkill).save({
        staffMemberId: staffB.id,
        skillId: skill.id,
      });
      const resultB = await assignmentService.getStaffPendingRequests(
        staffB.id,
      );
      expect(resultB).toHaveLength(1);
      expect(resultB[0].state).toBe('DROP_REQUESTED');

      // staffA should NOT see their own drop as unclaimed
      const resultA = await assignmentService.getStaffPendingRequests(
        staffA.id,
      );
      expect(resultA).toHaveLength(0);
    });

    it('excludes unclaimed DROP_REQUESTED when staff lacks skill', async () => {
      const { employee: staffA } = await createEmployee('Staff A');
      const { employee: staffB } = await createEmployee('Staff B');
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(staffA.id, location.id, skill.id);

      const { shiftSkill } = await createShiftWithSlot(location.id, skill.id);

      await dataSource.getRepository(Assignment).save({
        staffMemberId: staffA.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.DROP_REQUESTED,
      });

      // staffB has NO skills → should NOT see the drop
      const result = await assignmentService.getStaffPendingRequests(staffB.id);
      expect(result).toHaveLength(0);
    });

    it('returns DROP_PENDING_APPROVAL for staff who claimed the drop', async () => {
      const { employee: staffA } = await createEmployee('Staff A');
      const { employee: staffB } = await createEmployee('Staff B');
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(staffA.id, location.id, skill.id);
      await certifyEmployee(staffB.id, location.id, skill.id);

      const { shiftSkill } = await createShiftWithSlot(location.id, skill.id);

      // staffA drops
      const dropAssignment = await dataSource.getRepository(Assignment).save({
        staffMemberId: staffA.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.DROP_REQUESTED,
      });

      // staffB claims it
      await assignmentService.claimDrop(dropAssignment.id, staffB.id);

      // staffB should see the DROP_PENDING_APPROVAL
      const resultB = await assignmentService.getStaffPendingRequests(
        staffB.id,
      );
      expect(resultB).toHaveLength(1);
      expect(resultB[0].state).toBe('DROP_PENDING_APPROVAL');
      expect(resultB[0].staffName).toBe('Staff B');
      expect(resultB[0].swapTargetName).toBe('Staff A');
    });

    it('returns empty array when no pending requests exist', async () => {
      const { employee: staffA } = await createEmployee('Staff A');

      const result = await assignmentService.getStaffPendingRequests(staffA.id);
      expect(result).toHaveLength(0);
    });

    it('does not return ASSIGNED or CANCELLED assignments', async () => {
      const { employee: staffA } = await createEmployee('Staff A');
      const { employee: staffB } = await createEmployee('Staff B');
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(staffA.id, location.id, skill.id);
      await certifyEmployee(staffB.id, location.id, skill.id);

      const { shiftSkill } = await createShiftWithSlot(location.id, skill.id);

      // Regular assignment (ASSIGNED state)
      await dataSource.getRepository(Assignment).save({
        staffMemberId: staffA.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.ASSIGNED,
      });

      // Cancelled assignment
      await dataSource.getRepository(Assignment).save({
        staffMemberId: staffB.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.CANCELLED,
      });

      const resultA = await assignmentService.getStaffPendingRequests(
        staffA.id,
      );
      expect(resultA).toHaveLength(0);

      const resultB = await assignmentService.getStaffPendingRequests(
        staffB.id,
      );
      expect(resultB).toHaveLength(0);
    });
  });
});
