import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  ArrayMinSize,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class CreateTeamDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  @ApiProperty({ type: String, example: 'Test Team Title' })
  readonly name: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one player is required' })
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  @ApiProperty({ type: [String], example: ['player1', 'player2'] })
  readonly players: string[];
}
