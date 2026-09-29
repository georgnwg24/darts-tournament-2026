import { Exclude, Expose, Transform, Type } from 'class-transformer';
import {
  nullableObjectIdsToStrings,
  objectIdsToStrings,
  objectIdToString,
} from 'src/utils/object-id-transformers';
import {
  TournamentProgressStatus,
  TournamentType,
} from '../schemas/tournament.schema';

@Exclude()
export class StageGameConfigResponseDto {
  @Expose()
  legsToWin: number;

  @Expose()
  roundLimit: number;

  @Expose()
  scoreLimit?: number;
}

@Exclude()
export class KoMatchResponseDto {
  @Expose()
  matchIndex: number;

  @Expose()
  @Transform(objectIdToString)
  slotA?: string;

  @Expose()
  @Transform(objectIdToString)
  slotB?: string;

  @Expose()
  @Transform(objectIdToString)
  gameId?: string;

  @Expose()
  @Transform(objectIdToString)
  winnerTeamId?: string;

  @Expose()
  @Transform(objectIdToString)
  loserTeamId?: string;

  @Expose()
  resolvedBy?: 'played' | 'walkover' | 'empty';
}

@Exclude()
export class KoStageResponseDto {
  @Expose()
  stage: string;

  @Expose()
  status: 'pending' | 'active' | 'completed';

  @Expose()
  @Type(() => KoMatchResponseDto)
  matches: KoMatchResponseDto[];
}

@Exclude()
export class LeagueMatchResponseDto {
  @Expose()
  matchIndex: number;

  @Expose()
  @Transform(objectIdToString)
  homeTeamId: string;

  @Expose()
  @Transform(objectIdToString)
  awayTeamId: string;

  @Expose()
  @Transform(objectIdToString)
  gameId: string;
}

@Exclude()
export class LeagueMatchdayResponseDto {
  @Expose()
  matchdayNumber: number;

  @Expose()
  status: 'pending' | 'active' | 'completed';

  @Expose()
  @Type(() => LeagueMatchResponseDto)
  matches: LeagueMatchResponseDto[];
}

@Exclude()
export class LeagueStandingResponseDto {
  @Expose()
  @Transform(objectIdToString)
  teamId: string;

  @Expose()
  points: number;

  @Expose()
  drawOrder: number;

  @Expose()
  avgPerTurn: number;
}

@Exclude()
export class TournamentResponseDto {
  @Expose()
  @Transform(objectIdToString)
  _id: string;

  @Expose()
  name: string;

  @Expose()
  type: TournamentType;

  @Expose()
  status: TournamentProgressStatus;

  @Expose()
  @Transform(objectIdsToStrings)
  teamIds: string[];

  @Expose()
  startRound?: 'quarterfinal' | 'semifinal';

  @Expose()
  hasThirdPlaceMatch?: boolean;

  @Expose()
  @Type(() => StageGameConfigResponseDto)
  quarterfinalConfig?: StageGameConfigResponseDto;

  @Expose()
  @Type(() => StageGameConfigResponseDto)
  semifinalConfig?: StageGameConfigResponseDto;

  @Expose()
  @Type(() => StageGameConfigResponseDto)
  finalConfig?: StageGameConfigResponseDto;

  @Expose()
  @Type(() => StageGameConfigResponseDto)
  thirdPlaceConfig?: StageGameConfigResponseDto;

  @Expose()
  @Transform(nullableObjectIdsToStrings)
  initialSlots?: Array<string | null>;

  @Expose()
  @Type(() => KoStageResponseDto)
  koStages?: KoStageResponseDto[];

  @Expose()
  gamesPerTeam?: number;

  @Expose()
  @Type(() => LeagueMatchdayResponseDto)
  leagueMatchdays?: LeagueMatchdayResponseDto[];

  @Expose()
  @Type(() => LeagueStandingResponseDto)
  standings?: LeagueStandingResponseDto[];
}
