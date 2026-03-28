import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Observable, map } from 'rxjs';
import { JwtAuthGuard } from '../../security/guards/jwt-auth-guard';
import { RolesGuard } from '../../security/guards/roles.guard';
import { Roles } from '../../security/decorators/roles.decorator';
import { EmployeeRole } from '../../users/user.types';
import { Employee } from '../../users/entity/employee.entity';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationGateway } from '../services/notification-gateway.service';
import { Notification } from '../entities/notification.entity';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationController {
  private static readonly MAX_LIMIT = 100;

  constructor(
    private readonly notificationRepo: NotificationRepository,
    private readonly gateway: NotificationGateway,
  ) {}

  @Get()
  @Roles(EmployeeRole.STAFF, EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'List notifications for the authenticated user' })
  @ApiResponse({ status: 200, type: [Notification] })
  async list(
    @Req() req: Request,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ): Promise<Notification[]> {
    const employee = req['employee'] as Employee;

    let parsedLimit = 20;
    if (limit !== undefined) {
      parsedLimit = parseInt(limit, 10);
      if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
        throw new BadRequestException('limit must be a positive integer');
      }
      parsedLimit = Math.min(parsedLimit, NotificationController.MAX_LIMIT);
    }

    let parsedOffset = 0;
    if (offset !== undefined) {
      parsedOffset = parseInt(offset, 10);
      if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
        throw new BadRequestException('offset must be a non-negative integer');
      }
    }

    return this.notificationRepo.findByRecipient(employee.id, {
      limit: parsedLimit,
      offset: parsedOffset,
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Get('unread-count')
  @Roles(EmployeeRole.STAFF, EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Get unread notification count' })
  async unreadCount(@Req() req: Request): Promise<{ count: number }> {
    const employee = req['employee'] as Employee;
    const count = await this.notificationRepo.getUnreadCount(employee.id);
    return { count };
  }

  @Patch(':id/read')
  @Roles(EmployeeRole.STAFF, EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    const employee = req['employee'] as Employee;
    const success = await this.notificationRepo.markAsRead(id, employee.id);
    return { success };
  }

  @Post('read-all')
  @Roles(EmployeeRole.STAFF, EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Req() req: Request): Promise<{ updated: number }> {
    const employee = req['employee'] as Employee;
    const updated = await this.notificationRepo.markAllAsRead(employee.id);
    return { updated };
  }

  @Sse('stream')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(EmployeeRole.STAFF, EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  stream(@Req() req: Request): Observable<MessageEvent> {
    const employee = req['employee'] as Employee;
    return this.gateway
      .getStream(employee.id)
      .pipe(
        map(
          (notification) =>
            ({ data: JSON.stringify(notification) }) as MessageEvent,
        ),
      );
  }
}
