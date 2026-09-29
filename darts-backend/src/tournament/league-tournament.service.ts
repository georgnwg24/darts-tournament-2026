import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Status } from 'src/enums/status';
import { DetailedGameView, GameService } from 'src/game/game.service';
import { CreateLeagueTournamentDto } from './dtos/create-league-tournament.dto';
import {
  LeagueMatch,
  LeagueMatchday,
  Tournament,
  TournamentDocument,
  TournamentProgressStatus,
  TournamentType,
} from './schemas/tournament.schema';
import { TournamentValidationService } from './tournament-validation.service';

export type LeagueStanding = {
  teamId: string;
  points: number;
  drawOrder: number;
  avgPerTurn: number;
};

type CompletedLeagueGame = {
  home: string;
  away: string;
  winner: string;
};

type ScoreTotals = {
  score: number;
  turns: number;
};

@Injectable()
export class LeagueTournamentService {
  constructor(
    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<TournamentDocument>,
    private readonly gameService: GameService,
    private readonly validationService: TournamentValidationService,
  ) {}

  async create(dto: CreateLeagueTournamentDto): Promise<TournamentDocument> {
    const uniqueTeamIds = [...new Set(dto.teamIds)];
    await this.validationService.assertTeamsExist(dto.teamIds);

    const gamesPerTeam =
      dto.gamesPerTeam ?? Math.max(1, uniqueTeamIds.length - 1);
    this.assertFeasible(uniqueTeamIds.length, gamesPerTeam);

    const tournamentId = new Types.ObjectId();
    const rounds = this.buildRounds(uniqueTeamIds, gamesPerTeam);
    const matchdays: LeagueMatchday[] = [];

    for (const [roundIndex, round] of rounds.entries()) {
      const matches: LeagueMatch[] = [];
      for (const [matchIndex, [home, away]] of round.entries()) {
        const game = await this.gameService.createTournamentGame(
          {
            teamIds: [home, away],
            legsToWin: dto.legsToWin,
            roundLimit: dto.roundLimit,
            scoreLimit: dto.scoreLimit,
          },
          tournamentId.toString(),
        );

        matches.push({
          matchIndex,
          homeTeamId: Types.ObjectId.createFromHexString(home),
          awayTeamId: Types.ObjectId.createFromHexString(away),
          gameId: game._id,
        });
      }

      matchdays.push({
        matchdayNumber: roundIndex + 1,
        status: roundIndex === 0 ? 'active' : 'pending',
        matches,
      });
    }

    const tournament = new this.tournamentModel({
      _id: tournamentId,
      name: dto.name,
      type: TournamentType.LEAGUE,
      status: TournamentProgressStatus.ACTIVE,
      teamIds: uniqueTeamIds.map((teamId) =>
        Types.ObjectId.createFromHexString(teamId),
      ),
      gamesPerTeam,
      leagueMatchdays: matchdays,
      leagueRandomOrder: this.createRandomOrder(uniqueTeamIds),
      semifinalConfig: {
        legsToWin: dto.legsToWin,
        roundLimit: dto.roundLimit,
        scoreLimit: dto.scoreLimit,
      },
    });

    await tournament.save();
    await this.applyLocks(tournament);
    return tournament;
  }

  async advance(tournament: TournamentDocument): Promise<void> {
    const matchdays = tournament.leagueMatchdays ?? [];
    const activeIndex = matchdays.findIndex(
      (matchday) => matchday.status === 'active',
    );
    if (activeIndex < 0) {
      throw new BadRequestException('No active matchday');
    }

    const activeMatchday = matchdays[activeIndex];
    const games = await Promise.all(
      activeMatchday.matches.map((match) =>
        this.gameService.findById(match.gameId.toString()),
      ),
    );
    if (games.some((game) => game.status !== Status.COMPLETE)) {
      throw new BadRequestException('Active matchday is not ready to advance');
    }

    activeMatchday.status = 'completed';
    await this.setGamesLocked(activeMatchday.matches, true);

    const nextMatchday = matchdays[activeIndex + 1];
    if (!nextMatchday) {
      tournament.status = TournamentProgressStatus.COMPLETE;
      return;
    }

    nextMatchday.status = 'active';
    await this.setGamesLocked(nextMatchday.matches, false);
  }

  async computeStandings(
    tournament: TournamentDocument,
  ): Promise<LeagueStanding[]> {
    const standings = this.createStandingsTable(tournament);
    const scoreTotals = new Map<string, ScoreTotals>(
      [...standings.keys()].map((teamId) => [teamId, { score: 0, turns: 0 }]),
    );

    const matches = (tournament.leagueMatchdays ?? []).flatMap(
      (matchday) => matchday.matches,
    );
    const loadedMatches = await Promise.all(
      matches.map(async (match) => ({
        match,
        game: await this.gameService.findById(match.gameId.toString()),
      })),
    );

    const completedGames: CompletedLeagueGame[] = [];
    for (const { match, game } of loadedMatches) {
      this.addGameScores(scoreTotals, game);
      if (game.status !== Status.COMPLETE) continue;

      const winner = game.gameWinner?.toString();
      if (!winner || !standings.has(winner)) {
        throw new Error(
          `Completed game ${game._id.toString()} has no valid winner`,
        );
      }

      standings.get(winner)!.points += 1;
      completedGames.push({
        home: match.homeTeamId.toString(),
        away: match.awayTeamId.toString(),
        winner,
      });
    }

    for (const row of standings.values()) {
      const totals = scoreTotals.get(row.teamId)!;
      row.avgPerTurn = totals.turns
        ? Number((totals.score / totals.turns).toFixed(4))
        : 0;
    }

    return this.sortStandings([...standings.values()], completedGames);
  }

  getGameIds(tournament: TournamentDocument): string[] {
    return (tournament.leagueMatchdays ?? [])
      .flatMap((matchday) => matchday.matches)
      .map((match) => match.gameId.toString());
  }

  private createStandingsTable(
    tournament: TournamentDocument,
  ): Map<string, LeagueStanding> {
    const drawOrder = new Map(
      (tournament.leagueRandomOrder ?? []).map((entry) => [
        entry.teamId.toString(),
        entry.drawOrder,
      ]),
    );

    return new Map(
      tournament.teamIds.map((teamId) => {
        const id = teamId.toString();
        return [
          id,
          {
            teamId: id,
            points: 0,
            drawOrder: drawOrder.get(id) ?? 99999,
            avgPerTurn: 0,
          },
        ];
      }),
    );
  }

  private addGameScores(
    totalsByTeam: Map<string, ScoreTotals>,
    game: DetailedGameView,
  ): void {
    for (const leg of game.legs) {
      for (const teamData of leg.teamData) {
        const totals = totalsByTeam.get(teamData.teamId.toString());
        if (!totals) continue;

        for (const turn of teamData.throwsByRound) {
          if (!turn.length) continue;
          totals.turns += 1;
          totals.score += turn.reduce(
            (sum, score) => sum + Math.max(0, score),
            0,
          );
        }
      }
    }
  }

  private sortStandings(
    rows: LeagueStanding[],
    completedGames: CompletedLeagueGame[],
  ): LeagueStanding[] {
    const rowsByPoints = new Map<number, LeagueStanding[]>();
    for (const row of rows) {
      const group = rowsByPoints.get(row.points) ?? [];
      group.push(row);
      rowsByPoints.set(row.points, group);
    }

    return [...rowsByPoints.keys()]
      .sort((left, right) => right - left)
      .flatMap((points) => {
        const tiedRows = rowsByPoints.get(points)!;
        if (tiedRows.length === 1) return tiedRows;

        const headToHead = this.headToHeadPoints(
          tiedRows.map((row) => row.teamId),
          completedGames,
        );
        return tiedRows.sort((left, right) => {
          const headToHeadDifference =
            (headToHead.get(right.teamId) ?? 0) -
            (headToHead.get(left.teamId) ?? 0);
          if (headToHeadDifference) return headToHeadDifference;
          if (right.avgPerTurn !== left.avgPerTurn) {
            return right.avgPerTurn - left.avgPerTurn;
          }
          return left.drawOrder - right.drawOrder;
        });
      });
  }

  private headToHeadPoints(
    teamIds: string[],
    games: CompletedLeagueGame[],
  ): Map<string, number> {
    const tiedTeamIds = new Set(teamIds);
    const points = new Map(teamIds.map((teamId) => [teamId, 0]));

    for (const game of games) {
      if (!tiedTeamIds.has(game.home) || !tiedTeamIds.has(game.away)) continue;
      points.set(game.winner, (points.get(game.winner) ?? 0) + 1);
    }

    return points;
  }

  private assertFeasible(teamCount: number, gamesPerTeam: number): void {
    if (teamCount < 2) {
      throw new BadRequestException('At least two teams are required');
    }
    if ((teamCount * gamesPerTeam) % 2 !== 0) {
      throw new BadRequestException(
        'League configuration is not feasible (teamCount * gamesPerTeam must be even)',
      );
    }
  }

  private buildRounds(teamIds: string[], gamesPerTeam: number): string[][][] {
    const shuffledTeamIds = this.shuffle(teamIds);
    const opponentsPerCycle = teamIds.length - 1;
    const fullCycles = Math.floor(gamesPerTeam / opponentsPerCycle);
    const extraRounds = gamesPerTeam % opponentsPerCycle;
    const baseRounds = this.createRoundRobinRounds(shuffledTeamIds);

    const completeCycles = Array.from(
      { length: fullCycles },
      () => baseRounds,
    ).flat();
    const additionalRounds = this.createRoundRobinRounds(shuffledTeamIds).slice(
      0,
      extraRounds,
    );
    return [...completeCycles, ...additionalRounds];
  }

  private createRoundRobinRounds(teamIds: string[]): string[][][] {
    const teams = [...teamIds];
    if (teams.length % 2 === 1) teams.push('BYE');

    const rounds: string[][][] = [];
    for (let roundIndex = 0; roundIndex < teams.length - 1; roundIndex++) {
      const matches: string[][] = [];
      for (let index = 0; index < teams.length / 2; index++) {
        const teamA = teams[index];
        const teamB = teams[teams.length - 1 - index];
        if (teamA !== 'BYE' && teamB !== 'BYE') {
          matches.push(Math.random() < 0.5 ? [teamA, teamB] : [teamB, teamA]);
        }
      }
      rounds.push(matches);

      const lastRotatingTeam = teams.pop()!;
      teams.splice(1, 0, lastRotatingTeam);
    }
    return rounds;
  }

  private createRandomOrder(teamIds: string[]) {
    return this.shuffle(teamIds).map((teamId, index) => ({
      teamId: Types.ObjectId.createFromHexString(teamId),
      drawOrder: index + 1,
    }));
  }

  private shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    }
    return copy;
  }

  private async applyLocks(tournament: TournamentDocument): Promise<void> {
    await Promise.all(
      (tournament.leagueMatchdays ?? []).flatMap((matchday) =>
        matchday.matches.map((match) =>
          this.gameService.setLockedState(
            match.gameId.toString(),
            matchday.status !== 'active',
          ),
        ),
      ),
    );
  }

  private async setGamesLocked(
    matches: LeagueMatch[],
    locked: boolean,
  ): Promise<void> {
    await Promise.all(
      matches.map((match) =>
        this.gameService.setLockedState(match.gameId.toString(), locked),
      ),
    );
  }
}
