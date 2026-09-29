/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { Types } from 'mongoose';
import { Status } from 'src/enums/status';
import { GameService } from './game.service';

describe('GameService first-to-win progression', () => {
  const teamA = new Types.ObjectId();
  const teamB = new Types.ObjectId();

  let gameModel: {
    findById: jest.Mock;
  };
  let legService: {
    findById: jest.Mock;
    findByIdsOrdered: jest.Mock;
    createLeg: jest.Mock;
    rollbackThrow: jest.Mock;
    canAdvanceTurn: jest.Mock;
    canRollbackThrow: jest.Mock;
    canRewindTurn: jest.Mock;
    isLegEmpty: jest.Mock;
  };
  let service: GameService;

  beforeEach(() => {
    gameModel = {
      findById: jest.fn(),
    };
    legService = {
      findById: jest.fn(),
      findByIdsOrdered: jest.fn(),
      createLeg: jest.fn(),
      rollbackThrow: jest.fn(),
      canAdvanceTurn: jest.fn().mockReturnValue(false),
      canRollbackThrow: jest.fn().mockReturnValue(false),
      canRewindTurn: jest.fn().mockReturnValue(false),
      isLegEmpty: jest.fn().mockReturnValue(false),
    };
    service = new GameService(gameModel as any, legService as any);
  });

  function completedLeg(legWinner: Types.ObjectId): {
    status: Status;
    legWinner?: Types.ObjectId;
    teamData: Array<{ teamId: Types.ObjectId }>;
  } {
    return {
      status: Status.COMPLETE,
      legWinner,
      teamData: [{ teamId: teamA }, { teamId: teamB }],
    };
  }

  function game(legIds: Types.ObjectId[], legsToWin: number) {
    return {
      legIds,
      legsToWin,
      roundLimit: 12,
      scoreLimit: 301,
      status: Status.ACTIVE,
      gameWinner: undefined,
      save: jest.fn().mockResolvedValue(undefined),
    };
  }

  it('keeps a game active while every team is below the win target', async () => {
    const legId = new Types.ObjectId();
    const gameDoc = game([legId], 2);
    legService.findByIdsOrdered.mockResolvedValue([completedLeg(teamA)]);

    await (service as any).checkForGameWinner(gameDoc);

    expect(gameDoc.status).toBe(Status.ACTIVE);
    expect(gameDoc.gameWinner).toBeUndefined();
  });

  it('completes the game as soon as a team reaches the win target', async () => {
    const legIds = [new Types.ObjectId(), new Types.ObjectId()];
    const gameDoc = game(legIds, 2);
    legService.findByIdsOrdered.mockResolvedValue([
      completedLeg(teamA),
      completedLeg(teamA),
    ]);

    await (service as any).checkForGameWinner(gameDoc);

    expect(gameDoc.status).toBe(Status.COMPLETE);
    expect(String(gameDoc.gameWinner)).toBe(teamA.toString());
  });

  it('creates another leg until a team reaches the win target', async () => {
    const firstLegId = new Types.ObjectId();
    const nextLegId = new Types.ObjectId();
    const firstLeg = completedLeg(teamA);
    const gameDoc = game([firstLegId], 2);
    legService.findByIdsOrdered.mockResolvedValue([firstLeg]);
    legService.findById.mockResolvedValue(firstLeg);
    legService.createLeg.mockResolvedValue({ _id: nextLegId });

    await (service as any).refreshGameProgress(gameDoc, true);

    expect(gameDoc.status).toBe(Status.ACTIVE);
    expect(gameDoc.gameWinner).toBeUndefined();
    expect(legService.createLeg).toHaveBeenCalledWith(
      12,
      [teamB.toString(), teamA.toString()],
      301,
    );
    expect(gameDoc.legIds).toEqual([firstLegId, nextLegId]);
  });

  it('does not create another leg after the winning target is reached', async () => {
    const winningLegId = new Types.ObjectId();
    const gameDoc = game([winningLegId], 1);
    legService.findByIdsOrdered.mockResolvedValue([completedLeg(teamA)]);

    await (service as any).refreshGameProgress(gameDoc, true);

    expect(gameDoc.status).toBe(Status.COMPLETE);
    expect(String(gameDoc.gameWinner)).toBe(teamA.toString());
    expect(legService.createLeg).not.toHaveBeenCalled();
    expect(gameDoc.save).toHaveBeenCalled();
  });

  it('reopens a completed game when its winning throw is rolled back', async () => {
    const gameId = new Types.ObjectId();
    const winningLegId = new Types.ObjectId();
    const winningLeg = {
      ...completedLeg(teamA),
      _id: winningLegId,
      currentRound: 1,
      currentTeamIndex: 0,
      toObject: jest.fn().mockReturnValue({}),
    };
    const gameDoc = {
      ...game([winningLegId], 1),
      _id: gameId,
      status: Status.COMPLETE,
      gameWinner: teamA,
      locked: false,
      toObject: jest.fn().mockReturnValue({}),
    };
    gameModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(gameDoc),
    });
    legService.rollbackThrow.mockImplementation(() => {
      winningLeg.status = Status.ACTIVE;
      winningLeg.legWinner = undefined;
      return Promise.resolve();
    });
    legService.findByIdsOrdered.mockResolvedValue([winningLeg]);

    await service.rollbackThrow(gameId.toString());

    expect(gameDoc.status).toBe(Status.ACTIVE);
    expect(gameDoc.gameWinner).toBeUndefined();
    expect(gameDoc.save).toHaveBeenCalled();
  });
});
