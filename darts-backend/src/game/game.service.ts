import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Status } from 'src/enums/status';
import { LegService } from 'src/leg/leg.service';
import { Leg, LegDocument } from 'src/leg/schemas/leg.schema';
import { CreateGameDto } from './dtos/create-game.dto';
import { RecordThrowDto } from './dtos/record-throw.dto';
import { Game, GameDocument } from './schemas/game.schema';

export type DetailedGameView = Game & {
  legs: Leg[];
  currentTurn: {
    legIndex: number;
    teamIndex: number;
    roundIndex: number;
  };
  allowedActions: {
    recordThrow: boolean;
    rollbackThrow: boolean;
    advanceTurn: boolean;
    rewindTurn: boolean;
  };
};

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    @InjectModel(Game.name) private readonly gameModel: Model<GameDocument>,
    private readonly legService: LegService,
  ) {}

  createGame(createGameDto: CreateGameDto): Promise<GameDocument> {
    return this.createGameInternal(createGameDto);
  }

  createTournamentGame(
    createGameDto: CreateGameDto,
    tournamentId: string,
  ): Promise<GameDocument> {
    return this.createGameInternal(createGameDto, tournamentId);
  }

  async findById(id: string): Promise<DetailedGameView> {
    return this.buildDetailedGame(await this.getGameDoc(id));
  }

  findAllStandaloneGames(): Promise<GameDocument[]> {
    const standaloneFilter: FilterQuery<GameDocument> = {
      $or: [{ tournamentId: { $exists: false } }, { tournamentId: null }],
    };
    return this.gameModel.find(standaloneFilter).sort({ createdAt: -1 }).exec();
  }

  async recordThrow(
    gameId: string,
    dto: RecordThrowDto,
  ): Promise<DetailedGameView> {
    const game = await this.getGameDoc(gameId);
    this.ensureWritableGame(game);

    if (!game.teamIds.some((teamId) => teamId.equals(dto.teamId))) {
      throw new BadRequestException(
        `Team ${dto.teamId} is not part of game ${gameId}`,
      );
    }

    await this.legService.recordThrow(this.currentLegId(game), dto);
    await this.refreshGameProgress(game, false);
    return this.findById(gameId);
  }

  async rollbackThrow(gameId: string): Promise<DetailedGameView> {
    const game = await this.getGameDoc(gameId);
    this.ensureNotLocked(game);

    await this.legService.rollbackThrow(this.currentLegId(game));
    if (game.status === Status.COMPLETE) {
      this.reopenGame(game);
      await game.save();
    }

    return this.findById(gameId);
  }

  async advanceTurn(gameId: string): Promise<DetailedGameView> {
    const game = await this.getGameDoc(gameId);
    this.ensureWritableGame(game);

    const currentLeg = await this.getCurrentLeg(game);
    if (currentLeg.status === Status.COMPLETE) {
      await this.refreshGameProgress(game, true);
    } else {
      await this.legService.advanceTurn(currentLeg._id.toString());
      await this.refreshGameProgress(game, false);
    }

    return this.findById(gameId);
  }

  async rewindTurn(gameId: string): Promise<DetailedGameView> {
    const game = await this.getGameDoc(gameId);
    this.ensureNotLocked(game);

    const currentLeg = await this.getCurrentLeg(game);
    const canRewindWithinLeg = this.legService.canRewindTurn(currentLeg);
    const canRewindToPreviousLeg = this.canRewindToPreviousLeg(
      game,
      currentLeg,
    );
    if (!canRewindWithinLeg && !canRewindToPreviousLeg) {
      throw new BadRequestException('Current turn must be empty to rewind');
    }

    if (canRewindToPreviousLeg) {
      await this.legService.delete(currentLeg._id.toString());
      game.legIds.pop();
    } else {
      await this.legService.rewindTurn(currentLeg._id.toString());
    }

    this.reopenGame(game);
    await game.save();
    return this.findById(gameId);
  }

  async setLockedState(gameId: string, locked: boolean): Promise<GameDocument> {
    const game = await this.getGameDoc(gameId);
    game.locked = locked;
    return game.save();
  }

  async delete(id: string): Promise<void> {
    const game = await this.getGameDoc(id);
    await Promise.all(
      game.legIds.map((legId) => this.legService.delete(legId.toString())),
    );

    const result = await this.gameModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Game with id ${id} not found for deletion`);
    }
  }

  private async createGameInternal(
    createGameDto: CreateGameDto,
    tournamentId?: string,
  ): Promise<GameDocument> {
    const initialLeg = await this.legService.createLeg(
      createGameDto.roundLimit,
      createGameDto.teamIds,
      createGameDto.scoreLimit,
    );

    return new this.gameModel({
      teamIds: createGameDto.teamIds,
      legIds: [initialLeg._id],
      legsToWin: createGameDto.legsToWin,
      roundLimit: createGameDto.roundLimit,
      scoreLimit: createGameDto.scoreLimit,
      status: Status.ACTIVE,
      tournamentId: tournamentId
        ? Types.ObjectId.createFromHexString(tournamentId)
        : undefined,
    }).save();
  }

  private async getGameDoc(id: string): Promise<GameDocument> {
    this.logger.debug(`Finding game by ID: ${id}`);
    const game = await this.gameModel.findById(id).exec();
    if (!game) {
      throw new NotFoundException(`Game with ID ${id} not found`);
    }
    return game;
  }

  private async refreshGameProgress(
    game: GameDocument,
    createNextLeg: boolean,
  ): Promise<void> {
    await this.checkForGameWinner(game);

    if (createNextLeg && game.status === Status.ACTIVE) {
      const currentLeg = await this.getCurrentLeg(game);
      if (currentLeg.status === Status.COMPLETE) {
        const nextTeamOrder = this.rotateTeamsRightOnce(
          currentLeg.teamData.map((team) => team.teamId),
        );
        const nextLeg = await this.legService.createLeg(
          game.roundLimit,
          nextTeamOrder.map(String),
          game.scoreLimit,
        );
        game.legIds.push(nextLeg._id);
      }
    }

    await game.save();
  }

  private async checkForGameWinner(game: GameDocument): Promise<void> {
    const legs = await this.legService.findByIdsOrdered(
      game.legIds.map((legId) => legId.toString()),
    );
    const winsByTeam = new Map<string, number>();

    for (const leg of legs) {
      if (!leg.legWinner) continue;

      const teamId = leg.legWinner.toString();
      const wins = (winsByTeam.get(teamId) ?? 0) + 1;
      winsByTeam.set(teamId, wins);
      if (wins >= game.legsToWin) {
        game.gameWinner = Types.ObjectId.createFromHexString(teamId);
        game.status = Status.COMPLETE;
        return;
      }
    }
  }

  private async buildDetailedGame(
    game: GameDocument,
  ): Promise<DetailedGameView> {
    const legs = await this.legService.findByIdsOrdered(
      game.legIds.map((legId) => legId.toString()),
    );
    const activeLegIndex = legs.findIndex(
      (leg) => leg.status === Status.ACTIVE,
    );
    const legIndex =
      activeLegIndex >= 0 ? activeLegIndex : Math.max(0, legs.length - 1);
    const currentLeg = legs[legIndex];
    const canAdvanceTurn = this.legService.canAdvanceTurn(currentLeg);

    return {
      ...game.toObject(),
      legs: legs.map((leg) => leg.toObject()),
      currentTurn: {
        legIndex,
        teamIndex: currentLeg.currentTeamIndex,
        roundIndex: Math.max(0, currentLeg.currentRound - 1),
      },
      allowedActions: {
        recordThrow:
          !game.locked &&
          game.status === Status.ACTIVE &&
          currentLeg.status === Status.ACTIVE &&
          !canAdvanceTurn,
        rollbackThrow:
          !game.locked && this.legService.canRollbackThrow(currentLeg),
        advanceTurn:
          !game.locked && game.status === Status.ACTIVE && canAdvanceTurn,
        rewindTurn:
          !game.locked &&
          (this.legService.canRewindTurn(currentLeg) ||
            this.canRewindToPreviousLeg(game, currentLeg)),
      },
    } as DetailedGameView;
  }

  private getCurrentLeg(game: GameDocument): Promise<LegDocument> {
    return this.legService.findById(this.currentLegId(game));
  }

  private currentLegId(game: GameDocument): string {
    return game.legIds.at(-1)!.toString();
  }

  private canRewindToPreviousLeg(
    game: GameDocument,
    currentLeg: LegDocument,
  ): boolean {
    return (
      game.legIds.length > 1 &&
      currentLeg.currentRound === 1 &&
      currentLeg.currentTeamIndex === 0 &&
      this.legService.isLegEmpty(currentLeg)
    );
  }

  private reopenGame(game: GameDocument): void {
    game.status = Status.ACTIVE;
    game.gameWinner = undefined;
  }

  private ensureWritableGame(game: GameDocument): void {
    this.ensureNotLocked(game);
    if (game.status === Status.COMPLETE) {
      throw new BadRequestException(`Game ${game._id.toString()} is complete`);
    }
  }

  private ensureNotLocked(game: GameDocument): void {
    if (game.locked) {
      throw new BadRequestException(`Game ${game._id.toString()} is locked`);
    }
  }

  private rotateTeamsRightOnce(teamIds: Types.ObjectId[]): Types.ObjectId[] {
    if (teamIds.length <= 1) return teamIds;
    return [teamIds.at(-1)!, ...teamIds.slice(0, -1)];
  }
}
