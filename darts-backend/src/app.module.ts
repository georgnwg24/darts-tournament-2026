import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GameModule } from './game/game.module';
import { LegModule } from './leg/leg.module';
import { TeamModule } from './team/team.module';
import { TournamentModule } from './tournament/tournament.module';

const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/database';

@Module({
  imports: [
    MongooseModule.forRoot(uri),
    GameModule,
    LegModule,
    TeamModule,
    TournamentModule,
  ],
})
export class AppModule {}
