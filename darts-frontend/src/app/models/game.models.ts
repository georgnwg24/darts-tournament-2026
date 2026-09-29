import { Leg } from "./leg.models";

export enum Status {
  ACTIVE = 'active',
  COMPLETE = 'complete'
}

export interface MinimalGame {
  _id: string;
  teamIds: string[];
  scoreLimit?: number;
  status: Status;
  gameWinner?: string;
  locked: boolean;
  tournamentId?: string;
}

export interface CurrentTurn {
  legIndex: number;
  teamIndex: number;
  roundIndex: number;
}

export interface AllowedActions {
  recordThrow: boolean;
  rollbackThrow: boolean;
  advanceTurn: boolean;
  rewindTurn: boolean;
}

export interface DetailedGame {
  _id: string;
  teamIds: string[];
  legs: Leg[];
  legsToWin: number;
  roundLimit: number;
  scoreLimit?: number;
  status: Status;
  gameWinner?: string;
  locked: boolean;
  tournamentId?: string;
  currentTurn: CurrentTurn;
  allowedActions: AllowedActions;
}

export interface CreateGameDto {
  legsToWin: number;
  roundLimit: number;
  scoreLimit?: number;
  teamIds: string[];
}

export interface RecordThrowDto {
  teamId: string;
  score: number;
}
