export interface Team {
  _id: string;
  name: string;
  players: string[];
}

export interface CreateTeamDto {
  name: string;
  players: string[];
}

export interface UpdateTeamDto {
  name?: string;
  players?: string[];
}