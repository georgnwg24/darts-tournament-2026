import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Status } from 'src/enums/status';

@Schema({ timestamps: true })
export class Game {
  _id: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Team' }], required: true })
  teamIds: Types.ObjectId[];

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Leg' }],
    required: true,
    min: 1,
  })
  legIds: Types.ObjectId[];

  @Prop({ required: true, default: 1 })
  legsToWin: number;

  @Prop({ required: true, default: 8 })
  roundLimit: number; // Regulation rounds before tied leaders enter overtime

  @Prop({ required: false })
  scoreLimit?: number;

  @Prop({ enum: Status, required: true, default: Status.ACTIVE })
  status: Status;

  @Prop({ type: Types.ObjectId, ref: 'Team', required: false })
  gameWinner?: Types.ObjectId; // id of the winner team

  @Prop({ required: true, default: false })
  locked: boolean;

  @Prop({ type: Types.ObjectId, required: false })
  tournamentId?: Types.ObjectId;
}

export const GameSchema = SchemaFactory.createForClass(Game);
export type GameDocument = HydratedDocument<Game>;
