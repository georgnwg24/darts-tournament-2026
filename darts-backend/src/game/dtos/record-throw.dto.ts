import { Min, Max, IsInt, IsMongoId } from 'class-validator';

export class RecordThrowDto {
  @IsMongoId()
  teamId: string;

  @IsInt()
  @Min(0)
  @Max(60) // Valid dart score has to be between 0 and 60
  score: number;
}
