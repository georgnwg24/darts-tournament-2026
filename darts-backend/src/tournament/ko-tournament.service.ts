import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Status } from 'src/enums/status';
import { GameService } from 'src/game/game.service';
import { CreateKoTournamentDto } from './dtos/create-ko-tournament.dto';
import {
  KoMatch,
  KoStage,
  StageGameConfig,
  Tournament,
  TournamentDocument,
  TournamentProgressStatus,
  TournamentType,
} from './schemas/tournament.schema';
import { TournamentValidationService } from './tournament-validation.service';

type KoStageName = 'quarterfinal' | 'semifinal' | 'thirdPlace' | 'final';

@Injectable()
export class KoTournamentService {
  constructor(
    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<TournamentDocument>,
    private readonly gameService: GameService,
    private readonly validationService: TournamentValidationService,
  ) {}

  async create(dto: CreateKoTournamentDto): Promise<TournamentDocument> {
    this.validateRequiredConfigs(dto);

    const bracketSize = dto.startRound === 'quarterfinal' ? 8 : 4;
    const initialSlots = this.normalizeInitialSlots(
      dto.initialSlots,
      bracketSize,
    );
    const assignedTeamIds = initialSlots.filter(
      (teamId): teamId is string => teamId !== undefined,
    );
    await this.validationService.assertTeamsExist(assignedTeamIds);

    const stages = this.createStages(dto.startRound, dto.hasThirdPlaceMatch);
    stages[0].matches = this.createMatchesFromSlots(initialSlots);

    const tournament = new this.tournamentModel({
      name: dto.name,
      type: TournamentType.KO,
      status: TournamentProgressStatus.ACTIVE,
      teamIds: assignedTeamIds,
      startRound: dto.startRound,
      hasThirdPlaceMatch: dto.hasThirdPlaceMatch,
      quarterfinalConfig: dto.quarterfinalConfig,
      semifinalConfig: dto.semifinalConfig,
      finalConfig: dto.finalConfig,
      thirdPlaceConfig: dto.thirdPlaceConfig,
      initialSlots: initialSlots.map((teamId) =>
        teamId ? Types.ObjectId.createFromHexString(teamId) : undefined,
      ),
      koStages: stages,
    });

    await this.syncStageGames(tournament, stages[0].stage);
    await this.resolveStage(tournament, stages[0].stage);
    return tournament.save();
  }

  async advance(tournament: TournamentDocument): Promise<void> {
    const stages = tournament.koStages ?? [];
    const activeIndex = stages.findIndex((stage) => stage.status === 'active');
    if (activeIndex < 0) {
      throw new BadRequestException('No active stage');
    }

    const activeStage = stages[activeIndex];
    await this.resolveStage(tournament, activeStage.stage);

    if (!this.areAllMatchesResolved(activeStage.matches)) {
      throw new BadRequestException('Active stage is not ready to advance');
    }

    activeStage.status = 'completed';
    await this.setStageGamesLocked(tournament, activeStage.stage, true);

    const nextStage = stages[activeIndex + 1];
    if (!nextStage) {
      tournament.status = TournamentProgressStatus.COMPLETE;
      return;
    }

    nextStage.matches = this.populateNextStageMatches(
      activeStage,
      nextStage.stage,
      stages,
      tournament.hasThirdPlaceMatch ?? false,
    );
    nextStage.status = 'active';

    await this.syncStageGames(tournament, nextStage.stage);
    await this.resolveStage(tournament, nextStage.stage);
  }

  getGameIds(tournament: TournamentDocument): string[] {
    return (tournament.koStages ?? [])
      .flatMap((stage) => stage.matches)
      .map((match) => match.gameId?.toString())
      .filter((gameId): gameId is string => gameId !== undefined);
  }

  private validateRequiredConfigs(dto: CreateKoTournamentDto): void {
    if (dto.startRound === 'quarterfinal' && !dto.quarterfinalConfig) {
      throw new BadRequestException(
        'quarterfinalConfig is required for quarterfinal tournaments',
      );
    }

    if (dto.hasThirdPlaceMatch && !dto.thirdPlaceConfig) {
      throw new BadRequestException(
        'thirdPlaceConfig is required when third-place match is enabled',
      );
    }
  }

  private async syncStageGames(
    tournament: TournamentDocument,
    stageName: string,
  ): Promise<void> {
    const stage = this.findStage(tournament, stageName);
    if (!stage) return;

    const config = this.getStageConfig(tournament, stageName);
    for (const match of stage.matches) {
      if (match.gameId || match.winnerTeamId || !match.slotA || !match.slotB) {
        continue;
      }

      const game = await this.gameService.createTournamentGame(
        {
          teamIds: [match.slotA.toString(), match.slotB.toString()],
          legsToWin: config.legsToWin,
          roundLimit: config.roundLimit,
          scoreLimit: config.scoreLimit,
        },
        tournament._id.toString(),
      );

      match.gameId = game._id;
      await this.gameService.setLockedState(
        game._id.toString(),
        stage.status !== 'active',
      );
    }
  }

  private async resolveStage(
    tournament: TournamentDocument,
    stageName: string,
  ): Promise<void> {
    const stage = this.findStage(tournament, stageName);
    if (!stage) return;

    for (const match of stage.matches) {
      if (match.winnerTeamId || match.resolvedBy) continue;

      if (!match.slotA && !match.slotB) {
        match.resolvedBy = 'empty';
        continue;
      }

      if (Boolean(match.slotA) !== Boolean(match.slotB)) {
        match.winnerTeamId = match.slotA ?? match.slotB;
        match.resolvedBy = 'walkover';
        continue;
      }

      if (!match.gameId) continue;

      const game = await this.gameService.findById(match.gameId.toString());
      const winnerId = game.gameWinner?.toString();
      if (
        game.status !== Status.COMPLETE ||
        !winnerId ||
        !Types.ObjectId.isValid(winnerId)
      ) {
        continue;
      }

      match.winnerTeamId = Types.ObjectId.createFromHexString(winnerId);
      const teamA = match.slotA?.toString();
      const teamB = match.slotB?.toString();
      const loserId = winnerId === teamA ? teamB : teamA;
      if (loserId) {
        match.loserTeamId = Types.ObjectId.createFromHexString(loserId);
      }
      match.resolvedBy = 'played';
    }
  }

  private populateNextStageMatches(
    activeStage: KoStage,
    nextStageName: string,
    allStages: KoStage[],
    hasThirdPlaceMatch: boolean,
  ): KoMatch[] {
    if (nextStageName === 'thirdPlace') {
      const semifinal = allStages.find((stage) => stage.stage === 'semifinal');
      const losers = (semifinal?.matches ?? [])
        .map((match) => match.loserTeamId)
        .filter((teamId): teamId is Types.ObjectId => teamId !== undefined);
      return [this.createMatch(0, losers[0], losers[1])];
    }

    const winnerSource =
      nextStageName === 'final' && hasThirdPlaceMatch
        ? (allStages.find((stage) => stage.stage === 'semifinal') ??
          activeStage)
        : activeStage;

    return this.createMatchesFromSlots(
      winnerSource.matches.map((match) => match.winnerTeamId),
    );
  }

  private async setStageGamesLocked(
    tournament: TournamentDocument,
    stageName: string,
    locked: boolean,
  ): Promise<void> {
    const gameIds =
      this.findStage(tournament, stageName)
        ?.matches.map((match) => match.gameId?.toString())
        .filter((gameId): gameId is string => gameId !== undefined) ?? [];

    await Promise.all(
      gameIds.map((gameId) => this.gameService.setLockedState(gameId, locked)),
    );
  }

  private createStages(
    startRound: 'quarterfinal' | 'semifinal',
    hasThirdPlaceMatch: boolean,
  ): KoStage[] {
    const stageNames: KoStageName[] =
      startRound === 'quarterfinal'
        ? ['quarterfinal', 'semifinal']
        : ['semifinal'];
    if (hasThirdPlaceMatch) stageNames.push('thirdPlace');
    stageNames.push('final');

    return stageNames.map((stage, index) => ({
      stage,
      status: index === 0 ? 'active' : 'pending',
      matches: [],
    }));
  }

  private createMatchesFromSlots<T extends string | Types.ObjectId | undefined>(
    slots: T[],
  ): KoMatch[] {
    const matches: KoMatch[] = [];
    for (let index = 0; index < slots.length; index += 2) {
      matches.push(
        this.createMatch(
          index / 2,
          this.toObjectId(slots[index]),
          this.toObjectId(slots[index + 1]),
        ),
      );
    }
    return matches;
  }

  private createMatch(
    matchIndex: number,
    slotA?: Types.ObjectId,
    slotB?: Types.ObjectId,
  ): KoMatch {
    return { matchIndex, slotA, slotB };
  }

  private toObjectId(
    value: string | Types.ObjectId | undefined,
  ): Types.ObjectId | undefined {
    if (!value) return undefined;
    return typeof value === 'string'
      ? Types.ObjectId.createFromHexString(value)
      : value;
  }

  private getStageConfig(
    tournament: TournamentDocument,
    stageName: string,
  ): StageGameConfig {
    const configs: Record<KoStageName, StageGameConfig | undefined> = {
      quarterfinal: tournament.quarterfinalConfig,
      semifinal: tournament.semifinalConfig,
      thirdPlace: tournament.thirdPlaceConfig,
      final: tournament.finalConfig,
    };
    const config = configs[stageName as KoStageName];
    if (!config) {
      throw new BadRequestException(
        `Unknown or unconfigured KO stage: ${stageName}`,
      );
    }
    return config;
  }

  private normalizeInitialSlots(
    initialSlots: Array<string | null> | undefined,
    bracketSize: number,
  ): Array<string | undefined> {
    if (!initialSlots?.length) {
      return Array.from({ length: bracketSize }, () => undefined);
    }
    if (initialSlots.length !== bracketSize) {
      throw new BadRequestException(
        `initialSlots must have exactly ${bracketSize} entries`,
      );
    }

    return initialSlots.map((slot, index) => {
      if (!slot) return undefined;
      if (!Types.ObjectId.isValid(slot)) {
        throw new BadRequestException(
          `initialSlots[${index}] is not a valid team id`,
        );
      }
      return slot;
    });
  }

  private findStage(
    tournament: TournamentDocument,
    stageName: string,
  ): KoStage | undefined {
    return (tournament.koStages ?? []).find(
      (stage) => stage.stage === stageName,
    );
  }

  private areAllMatchesResolved(matches: KoMatch[]): boolean {
    return matches.every(
      (match) => Boolean(match.winnerTeamId) || match.resolvedBy === 'empty',
    );
  }
}
