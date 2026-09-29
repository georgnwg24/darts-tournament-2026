import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLeagueTournamentDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsMongoId({ each: true })
  teamIds: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  gamesPerTeam?: number;

  @IsInt()
  @Min(1)
  legsToWin: number;

  @IsInt()
  @Min(1)
  roundLimit: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  scoreLimit?: number;
}
