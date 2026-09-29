import { DetailedGame, Status } from '../models/game.models';
import {
  LeagueStanding,
  Tournament,
  TournamentType,
} from '../models/tournament.models';

export type LeagueTableRow = LeagueStanding & {
  gamesPlayed: number;
};

export function collectTournamentGameIds(tournament: Tournament): string[] {
  const gameIds =
    tournament.type === TournamentType.KO
      ? (tournament.koStages ?? []).flatMap((stage) =>
          stage.matches.map((match) => match.gameId),
        )
      : (tournament.leagueMatchdays ?? []).flatMap((matchday) =>
          matchday.matches.map((match) => match.gameId),
        );

  return [
    ...new Set(
      gameIds.filter((gameId): gameId is string => gameId !== undefined),
    ),
  ];
}

export function legWinsForTeam(game: DetailedGame, teamId: string): number {
  return game.legs.filter(
    (leg) => leg.status === Status.COMPLETE && leg.legWinner === teamId,
  ).length;
}

export function completedGameScore(game: DetailedGame): string | null {
  if (game.status !== Status.COMPLETE) return null;
  const [teamA, teamB] = game.teamIds;
  return `${legWinsForTeam(game, teamA)}:${legWinsForTeam(game, teamB)}`;
}

export function buildLeagueTableRows(
  tournament: Tournament,
  gamesById: ReadonlyMap<string, DetailedGame>,
): LeagueTableRow[] {
  const standingsById = new Map(
    (tournament.standings ?? []).map((standing) => [standing.teamId, standing]),
  );
  const rows = new Map<string, LeagueTableRow>(
    tournament.teamIds.map((teamId) => {
      const standing = standingsById.get(teamId);
      return [
        teamId,
        {
          teamId,
          points: standing?.points ?? 0,
          avgPerTurn: standing?.avgPerTurn ?? 0,
          drawOrder: standing?.drawOrder ?? 99999,
          gamesPlayed: 0,
        },
      ];
    }),
  );

  for (const match of (tournament.leagueMatchdays ?? []).flatMap(
    (matchday) => matchday.matches,
  )) {
    if (gamesById.get(match.gameId)?.status !== Status.COMPLETE) continue;
    const home = rows.get(match.homeTeamId);
    const away = rows.get(match.awayTeamId);
    if (!home || !away) continue;
    home.gamesPlayed++;
    away.gamesPlayed++;
  }

  const standingOrder = new Map(
    (tournament.standings ?? []).map((standing, index) => [
      standing.teamId,
      index,
    ]),
  );
  return [...rows.values()].sort((left, right) => {
    const orderDifference =
      (standingOrder.get(left.teamId) ?? Number.MAX_SAFE_INTEGER) -
      (standingOrder.get(right.teamId) ?? Number.MAX_SAFE_INTEGER);
    if (orderDifference) return orderDifference;
    if (right.points !== left.points) return right.points - left.points;
    if (right.avgPerTurn !== left.avgPerTurn) {
      return right.avgPerTurn - left.avgPerTurn;
    }
    return left.drawOrder - right.drawOrder;
  });
}
