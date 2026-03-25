import { ApiProperty } from '@nestjs/swagger';

export class SkillResponseDto {
  @ApiProperty({ description: 'Skill ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Skill name', example: 'bartender' })
  name: string;
}
