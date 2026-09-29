import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Status } from 'src/enums/status';

@Schema({ _id: false })
export class TeamData {
  @Prop({ type: Types.ObjectId, ref: 'Team', required: true })
  teamId: Types.ObjectId;

  @Prop({ required: true })
  nOfPlayers: number;

  @Prop({ type: [[Number]] })
  throwsByRound: number[][];

  @Prop({ type: [String], enum: ['open', 'completed', 'bust'], default: [] })
  turnOutcomesByRound: ('open' | 'completed' | 'bust')[];
}

@Schema()
export class Leg {
  _id: Types.ObjectId;

  @Prop({ type: [TeamData], required: true })
  teamData: TeamData[];

  @Prop({ required: true, default: 0 })
  currentTeamIndex: number;

  @Prop({ required: true, default: 1 })
  currentRound: number;

  @Prop({ required: true, default: 10 })
  roundLimit: number; // Regulation rounds before tied leaders enter overtime

  @Prop({ required: false })
  scoreLimit?: number;

  @Prop({ enum: Status, required: true, default: Status.ACTIVE })
  status: Status;

  @Prop({ type: Types.ObjectId, ref: 'Team', required: false })
  legWinner?: Types.ObjectId; // id of the team that won the leg
}

export const LegSchema = SchemaFactory.createForClass(Leg);
export type LegDocument = HydratedDocument<Leg>;
