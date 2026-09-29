import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @ApiPropertyOptional({ type: String, example: 'Updated Test Title' })
  readonly name?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one player is required' })
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  @ApiPropertyOptional({ type: [String], example: ['player1', 'player2'] })
  readonly players?: string[];
}
