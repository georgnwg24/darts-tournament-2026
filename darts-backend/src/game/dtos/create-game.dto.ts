import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsMongoId,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateGameDto {
  @IsInt()
  @Min(1)
  legsToWin: number;

  @IsInt()
  @Min(1)
  roundLimit: number;

  @IsOptional()
  @IsInt()
  scoreLimit?: number;

  @IsArray()
  @ArrayMinSize(2)
  @IsMongoId({ each: true })
  teamIds: string[];
}
