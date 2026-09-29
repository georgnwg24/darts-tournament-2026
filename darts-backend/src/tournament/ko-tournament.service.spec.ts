/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Types } from 'mongoose';
import { Status } from 'src/enums/status';
import { KoTournamentService } from './ko-tournament.service';

describe('KoTournamentService advancement', () => {
  it('builds and unlocks the next stage from resolved winners', async () => {
    const tournamentId = new Types.ObjectId();
    const teamA = new Types.ObjectId();
    const teamB = new Types.ObjectId();
    const teamC = new Types.ObjectId();
    const teamD = new Types.ObjectId();
    const semifinalGameIds = [new Types.ObjectId(), new Types.ObjectId()];
    const finalGameId = new Types.ObjectId();
    const gameService = {
      createTournamentGame: jest.fn().mockResolvedValue({ _id: finalGameId }),
      setLockedState: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue({ status: Status.ACTIVE }),
    };
    const service = new KoTournamentService(
      {} as any,
      gameService as any,
      {} as any,
    );
    const tournament = {
      _id: tournamentId,
      hasThirdPlaceMatch: false,
      finalConfig: { legsToWin: 3, roundLimit: 12, scoreLimit: 301 },
      koStages: [
        {
          stage: 'semifinal',
          status: 'active',
          matches: [
            {
              matchIndex: 0,
              slotA: teamA,
              slotB: teamB,
              winnerTeamId: teamA,
              loserTeamId: teamB,
              gameId: semifinalGameIds[0],
              resolvedBy: 'played',
            },
            {
              matchIndex: 1,
              slotA: teamC,
              slotB: teamD,
              winnerTeamId: teamD,
              loserTeamId: teamC,
              gameId: semifinalGameIds[1],
              resolvedBy: 'played',
            },
          ],
        },
        { stage: 'final', status: 'pending', matches: [] },
      ],
    };

    await service.advance(tournament as any);

    expect(tournament.koStages[0].status).toBe('completed');
    expect(tournament.koStages[1]).toEqual(
      expect.objectContaining({
        status: 'active',
        matches: [
          expect.objectContaining({
            slotA: teamA,
            slotB: teamD,
            gameId: finalGameId,
          }),
        ],
      }),
    );
    expect(gameService.createTournamentGame).toHaveBeenCalledWith(
      expect.objectContaining({
        teamIds: [teamA.toString(), teamD.toString()],
      }),
      tournamentId.toString(),
    );
    expect(gameService.setLockedState).toHaveBeenCalledWith(
      finalGameId.toString(),
      false,
    );
  });
});
