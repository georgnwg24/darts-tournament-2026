import { Status } from "./game.models";

export type TurnOutcome = 'open' | 'completed' | 'bust';

export interface Leg {
  _id: string;
  teamData: TeamData[];
  currentTeamIndex: number;
  currentRound: number;
  roundLimit: number;
  scoreLimit?: number;
  status: Status;
  legWinner?: string;
}

export interface TeamData {
  teamId: string;
  throwsByRound: number[][];
  turnOutcomesByRound: TurnOutcome[];
}
