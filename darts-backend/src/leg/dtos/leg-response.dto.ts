import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { Status } from 'src/enums/status';
import { objectIdToString } from 'src/utils/object-id-transformers';

@Exclude()
export class TeamDataResponseDto {
  @Expose()
  @Transform(objectIdToString)
  teamId: string;

  @Expose()
  throwsByRound: number[][];

  @Expose()
  turnOutcomesByRound: ('open' | 'completed' | 'bust')[];
}

@Exclude()
export class LegResponseDto {
  @Expose()
  @Transform(objectIdToString)
  _id: string;

  @Expose()
  @Type(() => TeamDataResponseDto)
  teamData: TeamDataResponseDto[];

  @Expose()
  currentTeamIndex: number;

  @Expose()
  currentRound: number;

  @Expose()
  roundLimit: number;

  @Expose()
  scoreLimit?: number;

  @Expose()
  status: Status;

  @Expose()
  @Transform(objectIdToString)
  legWinner?: string;
}
