import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class StageConfigDto {
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

export class CreateKoTournamentDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsIn(['quarterfinal', 'semifinal'])
  startRound: 'quarterfinal' | 'semifinal';

  @IsBoolean()
  hasThirdPlaceMatch: boolean;

  @ValidateNested()
  @Type(() => StageConfigDto)
  semifinalConfig: StageConfigDto;

  @ValidateNested()
  @Type(() => StageConfigDto)
  finalConfig: StageConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StageConfigDto)
  quarterfinalConfig?: StageConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StageConfigDto)
  thirdPlaceConfig?: StageConfigDto;

  @IsArray()
  @IsOptional()
  initialSlots?: Array<string | null>;
}
