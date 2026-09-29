import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ParseObjectIdPipe } from 'src/pipes/parse-objectid.pipe';
import { CreateKoTournamentDto } from './dtos/create-ko-tournament.dto';
import { CreateLeagueTournamentDto } from './dtos/create-league-tournament.dto';
import {
  LeagueStandingResponseDto,
  TournamentResponseDto,
} from './dtos/tournament-response.dto';
import { TournamentService } from './tournament.service';

@Controller('tournaments')
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  @Post('ko')
  async createKo(
    @Body() dto: CreateKoTournamentDto,
  ): Promise<TournamentResponseDto> {
    const tournament = await this.tournamentService.createKoTournament(dto);
    return plainToInstance(TournamentResponseDto, tournament.toObject());
  }

  @Post('league')
  async createLeague(
    @Body() dto: CreateLeagueTournamentDto,
  ): Promise<TournamentResponseDto> {
    const tournament = await this.tournamentService.createLeagueTournament(dto);
    return plainToInstance(TournamentResponseDto, tournament.toObject());
  }

  @Get()
  async findAll(): Promise<TournamentResponseDto[]> {
    const tournaments = await this.tournamentService.findAll();
    return tournaments.map((t) =>
      plainToInstance(TournamentResponseDto, t.toObject()),
    );
  }

  @Get(':id')
  async findById(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<TournamentResponseDto> {
    const tournament = await this.tournamentService.findById(id);
    return plainToInstance(TournamentResponseDto, tournament);
  }

  @Get(':id/standings')
  async standings(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<LeagueStandingResponseDto[]> {
    const standings = await this.tournamentService.getLeagueStandings(id);
    return standings.map((row) =>
      plainToInstance(LeagueStandingResponseDto, row),
    );
  }

  @Post(':id/advance')
  async advance(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<TournamentResponseDto> {
    const tournament = await this.tournamentService.advance(id);
    return plainToInstance(TournamentResponseDto, tournament);
  }

  @Delete(':id')
  async delete(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    await this.tournamentService.delete(id);
  }
}
