import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LegService } from './leg.service';
import { Leg, LegSchema } from './schemas/leg.schema';
import { TeamModule } from 'src/team/team.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Leg.name, schema: LegSchema }]),
    TeamModule,
  ],
  providers: [LegService],
  exports: [LegService],
})
export class LegModule {}
