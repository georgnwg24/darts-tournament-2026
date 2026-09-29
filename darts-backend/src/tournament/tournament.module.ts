import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GameModule } from 'src/game/game.module';
import { TeamModule } from 'src/team/team.module';
import { KoTournamentService } from './ko-tournament.service';
import { LeagueTournamentService } from './league-tournament.service';
import { TournamentValidationService } from './tournament-validation.service';
import { TournamentController } from './tournament.controller';
import { Tournament, TournamentSchema } from './schemas/tournament.schema';
import { TournamentService } from './tournament.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tournament.name, schema: TournamentSchema },
    ]),
    GameModule,
    TeamModule,
  ],
  controllers: [TournamentController],
  providers: [
    TournamentService,
    KoTournamentService,
    LeagueTournamentService,
    TournamentValidationService,
  ],
})
export class TournamentModule {}
