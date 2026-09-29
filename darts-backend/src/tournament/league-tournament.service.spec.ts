/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Types } from 'mongoose';
import { Status } from 'src/enums/status';
import { LeagueTournamentService } from './league-tournament.service';

describe('LeagueTournamentService standings', () => {
  it('awards one point to the winner and loads each game once', async () => {
    const home = new Types.ObjectId();
    const away = new Types.ObjectId();
    const gameId = new Types.ObjectId();
    const gameService = {
      findById: jest.fn().mockResolvedValue({
        _id: gameId,
        status: Status.COMPLETE,
        gameWinner: home,
        legs: [],
      }),
    };
    const service = new LeagueTournamentService(
      {} as any,
      gameService as any,
      {} as any,
    );
    const tournament = {
      teamIds: [home, away],
      leagueRandomOrder: [
        { teamId: home, drawOrder: 1 },
        { teamId: away, drawOrder: 2 },
      ],
      leagueMatchdays: [
        {
          matches: [{ gameId, homeTeamId: home, awayTeamId: away }],
        },
      ],
    };

    const standings = await service.computeStandings(tournament as any);

    expect(standings).toEqual([
      expect.objectContaining({ teamId: home.toString(), points: 1 }),
      expect.objectContaining({ teamId: away.toString(), points: 0 }),
    ]);
    expect(gameService.findById).toHaveBeenCalledTimes(1);
  });

  it('computes averages from positive turn scores without reloading games', async () => {
    const home = new Types.ObjectId();
    const away = new Types.ObjectId();
    const gameId = new Types.ObjectId();
    const gameService = {
      findById: jest.fn().mockResolvedValue({
        _id: gameId,
        status: Status.ACTIVE,
        legs: [
          {
            teamData: [
              {
                teamId: home,
                throwsByRound: [
                  [20, 20],
                  [10, -10],
                ],
              },
              { teamId: away, throwsByRound: [[15, 15]] },
            ],
          },
        ],
      }),
    };
    const service = new LeagueTournamentService(
      {} as any,
      gameService as any,
      {} as any,
    );
    const tournament = {
      teamIds: [home, away],
      leagueRandomOrder: [],
      leagueMatchdays: [
        {
          matches: [{ gameId, homeTeamId: home, awayTeamId: away }],
        },
      ],
    };

    const standings = await service.computeStandings(tournament as any);

    expect(
      standings.find((row) => row.teamId === home.toString())?.avgPerTurn,
    ).toBe(25);
    expect(
      standings.find((row) => row.teamId === away.toString())?.avgPerTurn,
    ).toBe(30);
    expect(gameService.findById).toHaveBeenCalledTimes(1);
  });
});
