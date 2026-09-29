export enum TournamentType {
  KO = 'ko',
  LEAGUE = 'league',
}

export enum TournamentProgressStatus {
  ACTIVE = 'active',
  COMPLETE = 'complete',
}

export interface StageGameConfig {
  legsToWin: number;
  roundLimit: number;
  scoreLimit?: number;
}

export interface KoMatch {
  matchIndex: number;
  slotA?: string;
  slotB?: string;
  gameId?: string;
  winnerTeamId?: string;
  loserTeamId?: string;
  resolvedBy?: 'played' | 'walkover' | 'empty';
}

export interface KoStage {
  stage: string;
  status: 'pending' | 'active' | 'completed';
  matches: KoMatch[];
}

export interface LeagueMatch {
  matchIndex: number;
  homeTeamId: string;
  awayTeamId: string;
  gameId: string;
}

export interface LeagueMatchday {
  matchdayNumber: number;
  status: 'pending' | 'active' | 'completed';
  matches: LeagueMatch[];
}

export interface LeagueStanding {
  teamId: string;
  points: number;
  drawOrder: number;
  avgPerTurn: number;
}

export interface Tournament {
  _id: string;
  name: string;
  type: TournamentType;
  status: TournamentProgressStatus;
  teamIds: string[];
  startRound?: 'quarterfinal' | 'semifinal';
  hasThirdPlaceMatch?: boolean;
  quarterfinalConfig?: StageGameConfig;
  semifinalConfig?: StageGameConfig;
  finalConfig?: StageGameConfig;
  thirdPlaceConfig?: StageGameConfig;
  initialSlots?: Array<string | null>;
  koStages?: KoStage[];
  gamesPerTeam?: number;
  leagueMatchdays?: LeagueMatchday[];
  standings?: LeagueStanding[];
}

export interface CreateKoTournamentDto {
  name: string;
  startRound: 'quarterfinal' | 'semifinal';
  hasThirdPlaceMatch: boolean;
  semifinalConfig: StageGameConfig;
  finalConfig: StageGameConfig;
  quarterfinalConfig?: StageGameConfig;
  thirdPlaceConfig?: StageGameConfig;
  initialSlots?: Array<string | null>;
}

export interface CreateLeagueTournamentDto {
  name: string;
  teamIds: string[];
  gamesPerTeam?: number;
  legsToWin: number;
  roundLimit: number;
  scoreLimit?: number;
}
