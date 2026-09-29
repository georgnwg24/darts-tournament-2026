import { Schema, SchemaFactory, Prop } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema()
export class Team {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, maxlength: 50 })
  name: string;

  @Prop({ required: true, type: [String] })
  players: string[];
}

export const TeamSchema = SchemaFactory.createForClass(Team);
export type TeamDocument = HydratedDocument<Team>;
