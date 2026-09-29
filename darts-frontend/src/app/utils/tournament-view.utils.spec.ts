import { DetailedGame, Status } from '../models/game.models';
import {
  TournamentProgressStatus,
  TournamentType,
} from '../models/tournament.models';
import {
  buildLeagueTableRows,
  collectTournamentGameIds,
  completedGameScore,
} from './tournament-view.utils';

describe('tournament view utilities', () => {
  it('collects unique game ids from either tournament type', () => {
    expect(
      collectTournamentGameIds({
        _id: 'tournament',
        name: 'Cup',
        type: TournamentType.KO,
        status: TournamentProgressStatus.ACTIVE,
        teamIds: [],
        koStages: [
          {
            stage: 'final',
            status: 'active',
            matches: [
              { matchIndex: 0, gameId: 'game' },
              { matchIndex: 1, gameId: 'game' },
            ],
          },
        ],
      }),
    ).toEqual(['game']);
  });

  it('formats completed leg wins and ignores active games', () => {
    const game = {
      status: Status.COMPLETE,
      teamIds: ['a', 'b'],
      legs: [
        { status: Status.COMPLETE, legWinner: 'a' },
        { status: Status.COMPLETE, legWinner: 'b' },
        { status: Status.COMPLETE, legWinner: 'a' },
      ],
    } as DetailedGame;

    expect(completedGameScore(game)).toBe('2:1');
    expect(completedGameScore({ ...game, status: Status.ACTIVE })).toBeNull();
  });

  it('builds league rows in server standing order and counts completed games', () => {
    const game = {
      _id: 'game',
      status: Status.COMPLETE,
    } as DetailedGame;
    const rows = buildLeagueTableRows(
      {
        _id: 'league',
        name: 'League',
        type: TournamentType.LEAGUE,
        status: TournamentProgressStatus.ACTIVE,
        teamIds: ['a', 'b'],
        standings: [
          { teamId: 'b', points: 1, avgPerTurn: 30, drawOrder: 2 },
          { teamId: 'a', points: 0, avgPerTurn: 20, drawOrder: 1 },
        ],
        leagueMatchdays: [
          {
            matchdayNumber: 1,
            status: 'completed',
            matches: [
              {
                matchIndex: 0,
                homeTeamId: 'a',
                awayTeamId: 'b',
                gameId: 'game',
              },
            ],
          },
        ],
      },
      new Map([['game', game]]),
    );

    expect(rows.map((row) => row.teamId)).toEqual(['b', 'a']);
    expect(rows.every((row) => row.gamesPlayed === 1)).toBeTrue();
  });
});
