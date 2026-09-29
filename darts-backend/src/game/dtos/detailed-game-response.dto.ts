import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { Status } from 'src/enums/status';
import { LegResponseDto } from 'src/leg/dtos/leg-response.dto';
import {
  objectIdsToStrings,
  objectIdToString,
} from 'src/utils/object-id-transformers';

@Exclude()
export class AllowedActionsDto {
  @Expose()
  recordThrow: boolean;

  @Expose()
  rollbackThrow: boolean;

  @Expose()
  advanceTurn: boolean;

  @Expose()
  rewindTurn: boolean;
}

@Exclude()
export class CurrentTurnDto {
  @Expose()
  legIndex: number;

  @Expose()
  teamIndex: number;

  @Expose()
  roundIndex: number;
}

@Exclude()
export class DetailedGameResponseDto {
  @Expose()
  @Transform(objectIdToString)
  _id: string;

  @Expose()
  @Transform(objectIdsToStrings)
  teamIds: string[];

  @Expose()
  @Type(() => LegResponseDto)
  legs: LegResponseDto[];

  @Expose()
  legsToWin: number;

  @Expose()
  roundLimit: number;

  @Expose()
  scoreLimit?: number;

  @Expose()
  status: Status;

  @Expose()
  @Transform(objectIdToString)
  gameWinner?: string;

  @Expose()
  locked: boolean;

  @Expose()
  @Transform(objectIdToString)
  tournamentId?: string;

  @Expose()
  @Type(() => CurrentTurnDto)
  currentTurn: CurrentTurnDto;

  @Expose()
  @Type(() => AllowedActionsDto)
  allowedActions: AllowedActionsDto;
}
