import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GameService } from 'src/game/game.service';
import { CreateKoTournamentDto } from './dtos/create-ko-tournament.dto';
import { CreateLeagueTournamentDto } from './dtos/create-league-tournament.dto';
import { KoTournamentService } from './ko-tournament.service';
import {
  LeagueStanding,
  LeagueTournamentService,
} from './league-tournament.service';
import {
  Tournament,
  TournamentDocument,
  TournamentType,
} from './schemas/tournament.schema';

export type TournamentDetails = ReturnType<TournamentDocument['toObject']> & {
  standings?: LeagueStanding[];
};

@Injectable()
export class TournamentService {
  constructor(
    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<TournamentDocument>,
    private readonly koTournamentService: KoTournamentService,
    private readonly leagueTournamentService: LeagueTournamentService,
    private readonly gameService: GameService,
  ) {}

  createKoTournament(dto: CreateKoTournamentDto): Promise<TournamentDocument> {
    return this.koTournamentService.create(dto);
  }

  createLeagueTournament(
    dto: CreateLeagueTournamentDto,
  ): Promise<TournamentDocument> {
    return this.leagueTournamentService.create(dto);
  }

  findAll(): Promise<TournamentDocument[]> {
    return this.tournamentModel.find().sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<TournamentDetails> {
    const tournament = await this.getTournament(id);
    const details: TournamentDetails = tournament.toObject();

    if (tournament.type === TournamentType.LEAGUE) {
      details.standings =
        await this.leagueTournamentService.computeStandings(tournament);
    }

    return details;
  }

  async getLeagueStandings(id: string): Promise<LeagueStanding[]> {
    const tournament = await this.getTournament(id);
    if (tournament.type !== TournamentType.LEAGUE) {
      throw new BadRequestException(
        'Standings are available only for league tournaments',
      );
    }
    return this.leagueTournamentService.computeStandings(tournament);
  }

  async delete(id: string): Promise<void> {
    const tournament = await this.getTournament(id);
    const gameIds =
      tournament.type === TournamentType.KO
        ? this.koTournamentService.getGameIds(tournament)
        : this.leagueTournamentService.getGameIds(tournament);

    for (const gameId of gameIds) {
      await this.gameService.delete(gameId);
    }

    const result = await this.tournamentModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(
        `Tournament with id ${id} not found for deletion`,
      );
    }
  }

  async advance(id: string): Promise<TournamentDetails> {
    const tournament = await this.getTournament(id);

    if (tournament.type === TournamentType.KO) {
      await this.koTournamentService.advance(tournament);
    } else {
      await this.leagueTournamentService.advance(tournament);
    }

    await tournament.save();
    return this.findById(id);
  }

  private async getTournament(id: string): Promise<TournamentDocument> {
    const tournament = await this.tournamentModel.findById(id).exec();
    if (!tournament) {
      throw new NotFoundException(`Tournament ${id} not found`);
    }
    return tournament;
  }
}
