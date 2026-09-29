import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Leg, LegDocument, TeamData } from './schemas/leg.schema';
import { Model, Types } from 'mongoose';
import { TeamService } from 'src/team/team.service';
import { RecordThrowDto } from 'src/game/dtos/record-throw.dto';
import { Status } from 'src/enums/status';

export type TurnOutcome = 'open' | 'completed' | 'bust';

type CurrentTurnState = {
  team: TeamData;
  roundIndex: number;
  throws: number[];
  outcome: TurnOutcome;
};

@Injectable()
export class LegService {
  private readonly logger = new Logger(LegService.name);

  constructor(
    @InjectModel(Leg.name) private readonly legModel: Model<LegDocument>,
    private readonly teamService: TeamService,
  ) {}

  async createLeg(
    roundLimit: number,
    teamIds: string[],
    scoreLimit?: number,
  ): Promise<LegDocument> {
    this.logger.log(
      `Creating leg: roundLimit: ${roundLimit}, scoreLimit: ${scoreLimit}, teamIds: ${teamIds.toString()}`,
    );
    const teams = await Promise.all(
      teamIds.map((teamId) => this.teamService.findById(teamId)),
    );
    const teamData: TeamData[] = teams.map((team) => ({
      teamId: team._id,
      nOfPlayers: team.players.length,
      throwsByRound: [],
      turnOutcomesByRound: [],
    }));

    teamData[0].throwsByRound.push([]);
    teamData[0].turnOutcomesByRound.push('open');

    const leg = new this.legModel({
      currentRound: 1,
      roundLimit,
      scoreLimit,
      teamData,
      currentTeamIndex: 0,
      status: Status.ACTIVE,
    });

    this.logger.log(`Leg created with ID: ${leg._id.toString()}`);
    return leg.save();
  }

  async findById(id: string): Promise<LegDocument> {
    const leg = await this.legModel.findById(id).exec();
    if (!leg) throw new NotFoundException(`Leg with ID ${id} not found`);
    return leg;
  }

  async findByIdsOrdered(ids: string[]): Promise<LegDocument[]> {
    const legs = await this.legModel.find({ _id: { $in: ids } }).exec();
    const map = new Map<string, LegDocument>(
      legs.map((leg) => [leg._id.toString(), leg]),
    );

    return ids
      .map((id) => map.get(id))
      .filter((leg): leg is LegDocument => leg !== undefined);
  }

  async recordThrow(id: string, recordThrowDto: RecordThrowDto): Promise<void> {
    const leg = await this.findById(id);
    if (leg.status === Status.COMPLETE) {
      throw new BadRequestException(
        `Throw can not be recorded. Leg ${id} is complete`,
      );
    }

    const turn = this.getCurrentTurn(leg);
    if (recordThrowDto.teamId !== turn.team.teamId.toString()) {
      throw new BadRequestException(
        `It's not team ${recordThrowDto.teamId}'s turn`,
      );
    }

    if (turn.outcome !== 'open') {
      throw new BadRequestException(
        'Current turn is already completed. Advance to the next turn first.',
      );
    }

    if (turn.throws.length >= 3) {
      throw new BadRequestException(
        'The team has already thrown 3 times in this round.',
      );
    }

    const newScore =
      this.getTotalScore(turn.team.throwsByRound) + recordThrowDto.score;
    const scoreLimit = leg.scoreLimit;

    if (scoreLimit != null && newScore > scoreLimit) {
      const currentRoundSum = turn.throws.reduce(
        (sum, score) => sum + score,
        0,
      );
      turn.throws.push(-currentRoundSum);
      turn.team.turnOutcomesByRound[turn.roundIndex] = 'bust';
      this.completeLegAfterRegulationIfPossible(leg);
      await leg.save();
      return;
    }

    turn.throws.push(recordThrowDto.score);

    if (scoreLimit != null && newScore === scoreLimit) {
      turn.team.turnOutcomesByRound[turn.roundIndex] = 'completed';
      leg.legWinner = turn.team.teamId;
      leg.status = Status.COMPLETE;
      await leg.save();
      return;
    }

    if (turn.throws.length === 3) {
      turn.team.turnOutcomesByRound[turn.roundIndex] = 'completed';
      this.completeLegAfterRegulationIfPossible(leg);
    }

    await leg.save();
  }

  async rollbackThrow(id: string): Promise<void> {
    const leg = await this.findById(id);
    const turn = this.getCurrentTurn(leg);

    if (turn.throws.length === 0) {
      throw new BadRequestException('No throws to rollback in current turn');
    }

    turn.throws.pop();
    turn.team.turnOutcomesByRound[turn.roundIndex] = 'open';

    leg.legWinner = undefined;
    leg.status = Status.ACTIVE;

    await leg.save();
  }

  async advanceTurn(id: string): Promise<void> {
    const leg = await this.findById(id);
    this.ensureTurnInitialized(leg);

    if (!this.canAdvanceTurn(leg)) {
      throw new BadRequestException(
        'Current turn is not complete and cannot be advanced',
      );
    }

    if (leg.status === Status.COMPLETE) {
      await leg.save();
      return;
    }

    const nOfTeams = leg.teamData.length;
    let legCompletedAfterRound = false;
    if (leg.currentTeamIndex === nOfTeams - 1) {
      leg.currentRound++;
      if (leg.roundLimit < leg.currentRound) {
        legCompletedAfterRound = this.completeLegWithUniqueLeader(leg);
      }
    }

    if (!legCompletedAfterRound) {
      leg.currentTeamIndex = (leg.currentTeamIndex + 1) % nOfTeams;
      this.ensureTurnInitialized(leg);
    }

    await leg.save();
  }

  async rewindTurn(id: string): Promise<void> {
    const leg = await this.findById(id);
    this.ensureTurnInitialized(leg);

    if (!this.canRewindTurn(leg)) {
      throw new BadRequestException(
        'Can only rewind when current turn is empty',
      );
    }

    const currentTeamIndex = leg.currentTeamIndex;
    const currentTeam = leg.teamData[currentTeamIndex];
    currentTeam.throwsByRound.pop();
    currentTeam.turnOutcomesByRound.pop();

    const previousTeamIndex =
      (currentTeamIndex - 1 + leg.teamData.length) % leg.teamData.length;
    if (currentTeamIndex === 0 && leg.currentRound > 1) {
      leg.currentRound--;
    }

    leg.currentTeamIndex = previousTeamIndex;
    leg.status = Status.ACTIVE;
    leg.legWinner = undefined;

    this.ensureTurnInitialized(leg);
    await leg.save();
  }

  canAdvanceTurn(leg: LegDocument): boolean {
    if (leg.status === Status.COMPLETE) return true;
    const { outcome } = this.getCurrentTurn(leg);
    return outcome !== 'open';
  }

  canRewindTurn(leg: LegDocument): boolean {
    const { throws } = this.getCurrentTurn(leg);
    return (
      throws.length === 0 && (leg.currentRound > 1 || leg.currentTeamIndex > 0)
    );
  }

  canRollbackThrow(leg: LegDocument): boolean {
    return this.getCurrentTurn(leg).throws.length > 0;
  }

  isLegEmpty(leg: LegDocument): boolean {
    return leg.teamData.every((team) =>
      (team.throwsByRound ?? []).every((round) => !round?.length),
    );
  }

  async delete(id: string): Promise<void> {
    const result = await this.legModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Leg with id ${id} not found for deletion`);
    }
  }

  private getCurrentRoundIndex(leg: LegDocument): number {
    return Math.max(0, (leg.currentRound ?? 1) - 1);
  }

  private ensureTurnInitialized(leg: LegDocument): void {
    const team = leg.teamData[leg.currentTeamIndex];
    const roundIndex = this.getCurrentRoundIndex(leg);
    team.throwsByRound ??= [];
    team.turnOutcomesByRound ??= [];

    while (team.throwsByRound.length <= roundIndex) {
      team.throwsByRound.push([]);
    }

    while (team.turnOutcomesByRound.length <= roundIndex) {
      team.turnOutcomesByRound.push('open');
    }
  }

  private getCurrentTurn(leg: LegDocument): CurrentTurnState {
    this.ensureTurnInitialized(leg);
    const team = leg.teamData[leg.currentTeamIndex];
    const roundIndex = this.getCurrentRoundIndex(leg);
    return {
      team,
      roundIndex,
      throws: team.throwsByRound[roundIndex],
      outcome: team.turnOutcomesByRound[roundIndex],
    };
  }

  private completeLegAfterRegulationIfPossible(leg: LegDocument): void {
    if (leg.status === Status.COMPLETE) return;

    const isFinalTeamOfRound = leg.currentTeamIndex === leg.teamData.length - 1;
    const isFinalRound = leg.currentRound >= leg.roundLimit;
    if (!isFinalTeamOfRound || !isFinalRound) return;

    const roundIndex = this.getCurrentRoundIndex(leg);
    const currentTeamData = leg.teamData[leg.currentTeamIndex];
    const outcome = currentTeamData.turnOutcomesByRound[roundIndex] ?? 'open';
    if (outcome === 'open') return;

    this.completeLegWithUniqueLeader(leg);
  }

  private completeLegWithUniqueLeader(leg: LegDocument): boolean {
    let maxScore = -1;
    let winningTeam: Types.ObjectId | undefined;
    let leadersAtMaxScore = 0;

    for (const teamData of leg.teamData) {
      const totalScore = this.getTotalScore(teamData.throwsByRound);
      const scoreLimit = leg.scoreLimit;

      if (scoreLimit != null && totalScore > scoreLimit) {
        throw new Error(
          `Invariant violated: team ${teamData.teamId.toString()} total ${totalScore} > scoreLimit ${scoreLimit}`,
        );
      }

      if (totalScore > maxScore) {
        maxScore = totalScore;
        winningTeam = teamData.teamId;
        leadersAtMaxScore = 1;
      } else if (totalScore === maxScore) {
        leadersAtMaxScore++;
      }
    }

    if (leadersAtMaxScore !== 1 || !winningTeam) {
      leg.legWinner = undefined;
      leg.status = Status.ACTIVE;
      return false;
    }

    leg.legWinner = winningTeam;
    leg.status = Status.COMPLETE;
    return true;
  }

  private getTotalScore(throwsByRound: number[][]): number {
    return throwsByRound.flat().reduce((total, score) => total + score, 0);
  }
}
