/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Types } from 'mongoose';
import { Status } from 'src/enums/status';
import { LegService } from './leg.service';

describe('LegService regulation and overtime', () => {
  const teamA = new Types.ObjectId();
  const teamB = new Types.ObjectId();
  const teamC = new Types.ObjectId();

  let service: LegService;

  beforeEach(() => {
    service = new LegService({} as any, {} as any);
  });

  function teamData(
    teamId: Types.ObjectId,
    throwsByRound: number[][],
    turnOutcomesByRound: Array<'open' | 'completed' | 'bust'>,
  ) {
    return {
      teamId,
      nOfPlayers: 1,
      throwsByRound,
      turnOutcomesByRound,
    };
  }

  function leg(
    teams: ReturnType<typeof teamData>[],
    currentTeamIndex: number,
    currentRound = 1,
    roundLimit = 1,
    scoreLimit?: number,
  ) {
    return {
      _id: new Types.ObjectId(),
      teamData: teams,
      currentTeamIndex,
      currentRound,
      roundLimit,
      scoreLimit,
      status: Status.ACTIVE,
      legWinner: undefined,
      save: jest.fn().mockResolvedValue(undefined),
    };
  }

  function useLeg(legDoc: ReturnType<typeof leg>) {
    jest.spyOn(service, 'findById').mockResolvedValue(legDoc as any);
  }

  it('completes regulation with the unique highest-scoring team', async () => {
    const legDoc = leg(
      [
        teamData(teamA, [[10, 10, 10]], ['completed']),
        teamData(teamB, [[5, 5]], ['open']),
      ],
      1,
    );
    useLeg(legDoc);

    await service.recordThrow(legDoc._id.toString(), {
      teamId: teamB.toString(),
      score: 5,
    });

    expect(legDoc.status).toBe(Status.COMPLETE);
    expect(String(legDoc.legWinner)).toBe(teamA.toString());
  });

  it('starts overtime after all teams finish regulation tied', async () => {
    const legDoc = leg(
      [
        teamData(teamA, [[10, 10, 10]], ['completed']),
        teamData(teamB, [[10, 10]], ['open']),
      ],
      1,
    );
    useLeg(legDoc);

    await service.recordThrow(legDoc._id.toString(), {
      teamId: teamB.toString(),
      score: 10,
    });

    expect(legDoc.status).toBe(Status.ACTIVE);
    expect(legDoc.legWinner).toBeUndefined();

    await service.advanceTurn(legDoc._id.toString());

    expect(legDoc.currentRound).toBe(2);
    expect(legDoc.currentTeamIndex).toBe(0);
    expect(legDoc.teamData[0].throwsByRound[1]).toEqual([]);
    expect(legDoc.teamData[0].turnOutcomesByRound[1]).toBe('open');
  });

  it('continues through repeated tied overtime rounds', async () => {
    const legDoc = leg(
      [
        teamData(
          teamA,
          [
            [10, 10, 10],
            [5, 5, 5],
          ],
          ['completed', 'completed'],
        ),
        teamData(
          teamB,
          [
            [10, 10, 10],
            [5, 5],
          ],
          ['completed', 'open'],
        ),
      ],
      1,
      2,
    );
    useLeg(legDoc);

    await service.recordThrow(legDoc._id.toString(), {
      teamId: teamB.toString(),
      score: 5,
    });
    await service.advanceTurn(legDoc._id.toString());

    expect(legDoc.status).toBe(Status.ACTIVE);
    expect(legDoc.currentRound).toBe(3);
    expect(legDoc.currentTeamIndex).toBe(0);
  });

  it('decides overtime only after every team completes the round', async () => {
    const legDoc = leg(
      [
        teamData(
          teamA,
          [
            [10, 10, 10],
            [10, 0, 0],
          ],
          ['completed', 'completed'],
        ),
        teamData(
          teamB,
          [
            [10, 10, 10],
            [3, 3],
          ],
          ['completed', 'open'],
        ),
      ],
      1,
      2,
    );
    useLeg(legDoc);

    expect(legDoc.status).toBe(Status.ACTIVE);

    await service.recordThrow(legDoc._id.toString(), {
      teamId: teamB.toString(),
      score: 3,
    });

    expect(legDoc.status).toBe(Status.COMPLETE);
    expect(String(legDoc.legWinner)).toBe(teamA.toString());
  });

  it('starts overtime when multiple teams share the lead', async () => {
    const legDoc = leg(
      [
        teamData(teamA, [[10, 10, 10]], ['completed']),
        teamData(teamB, [[10, 10, 10]], ['completed']),
        teamData(teamC, [[5, 5]], ['open']),
      ],
      2,
    );
    useLeg(legDoc);

    await service.recordThrow(legDoc._id.toString(), {
      teamId: teamC.toString(),
      score: 5,
    });
    await service.advanceTurn(legDoc._id.toString());

    expect(legDoc.status).toBe(Status.ACTIVE);
    expect(legDoc.currentRound).toBe(2);
    expect(legDoc.currentTeamIndex).toBe(0);
  });

  it('still completes immediately when a team reaches the exact target score', async () => {
    const legDoc = leg(
      [
        teamData(teamA, [[20], [20]], ['completed', 'open']),
        teamData(teamB, [[20]], ['completed']),
      ],
      0,
      2,
      1,
      50,
    );
    useLeg(legDoc);

    await service.recordThrow(legDoc._id.toString(), {
      teamId: teamA.toString(),
      score: 10,
    });

    expect(legDoc.status).toBe(Status.COMPLETE);
    expect(String(legDoc.legWinner)).toBe(teamA.toString());
    expect(legDoc.currentTeamIndex).toBe(0);
  });
});
