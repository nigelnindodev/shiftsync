import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from '../entities/location.entity';
import { Maybe, Result } from 'true-myth';

@Injectable()
export class LocationRepository {
  private readonly logger = new Logger(LocationRepository.name);

  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) {}

  async findById(id: number): Promise<Maybe<Location>> {
    return Maybe.of(await this.locationRepository.findOneBy({ id }));
  }

  async findByName(name: string): Promise<Maybe<Location>> {
    return Maybe.of(await this.locationRepository.findOneBy({ name }));
  }

  async findAll(): Promise<Location[]> {
    return this.locationRepository.find();
  }

  async create(
    data: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Result<Location, Error>> {
    try {
      const location = this.locationRepository.create(data);
      const saved = await this.locationRepository.save(location);
      return Result.ok(saved);
    } catch (e) {
      this.logger.error(`Failed to create location: ${data.name}`, e);
      return Result.err(
        e instanceof Error
          ? e
          : new Error(`Failed to create location: ${data.name}`),
      );
    }
  }
}
