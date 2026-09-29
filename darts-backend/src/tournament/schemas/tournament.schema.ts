import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TournamentDocument = HydratedDocument<Tournament>;

export enum TournamentType {
  KO = 'ko',
  LEAGUE = 'league',
}

export enum TournamentProgressStatus {
  ACTIVE = 'active',
  COMPLETE = 'complete',
}

@Schema({ _id: false })
export class StageGameConfig {
  @Prop({ required: true, min: 1 })
  legsToWin: number;

  @Prop({ required: true, min: 1 })
  roundLimit: number;

  @Prop({ required: false, min: 1 })
  scoreLimit?: number;
}

@Schema({ _id: false })
export class KoMatch {
  @Prop({ required: true, min: 0 })
  matchIndex: number;

  @Prop({ type: Types.ObjectId, required: false })
  slotA?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false })
  slotB?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false })
  gameId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false })
  winnerTeamId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false })
  loserTeamId?: Types.ObjectId;

  @Prop({ enum: ['played', 'walkover', 'empty'], required: false })
  resolvedBy?: 'played' | 'walkover' | 'empty';
}

@Schema({ _id: false })
export class KoStage {
  @Prop({ required: true })
  stage: string;

  @Prop({ enum: ['pending', 'active', 'completed'], required: true })
  status: 'pending' | 'active' | 'completed';

  @Prop({ type: [KoMatch], required: true })
  matches: KoMatch[];
}

@Schema({ _id: false })
export class LeagueMatch {
  @Prop({ required: true, min: 0 })
  matchIndex: number;

  @Prop({ type: Types.ObjectId, required: true })
  homeTeamId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  awayTeamId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  gameId: Types.ObjectId;
}

@Schema({ _id: false })
export class LeagueMatchday {
  @Prop({ required: true, min: 1 })
  matchdayNumber: number;

  @Prop({ enum: ['pending', 'active', 'completed'], required: true })
  status: 'pending' | 'active' | 'completed';

  @Prop({ type: [LeagueMatch], required: true })
  matches: LeagueMatch[];
}

@Schema({ _id: false })
export class LeagueRandomOrder {
  @Prop({ type: Types.ObjectId, required: true })
  teamId: Types.ObjectId;

  @Prop({ required: true })
  drawOrder: number;
}

@Schema({ timestamps: true })
export class Tournament {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ enum: TournamentType, required: true })
  type: TournamentType;

  @Prop({
    enum: TournamentProgressStatus,
    required: true,
    default: TournamentProgressStatus.ACTIVE,
  })
  status: TournamentProgressStatus;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Team' }], required: true })
  teamIds: Types.ObjectId[];

  @Prop({ required: false })
  startRound?: 'quarterfinal' | 'semifinal';

  @Prop({ required: false, default: false })
  hasThirdPlaceMatch?: boolean;

  @Prop({ type: StageGameConfig, required: false })
  quarterfinalConfig?: StageGameConfig;

  @Prop({ type: StageGameConfig, required: false })
  semifinalConfig?: StageGameConfig;

  @Prop({ type: StageGameConfig, required: false })
  finalConfig?: StageGameConfig;

  @Prop({ type: StageGameConfig, required: false })
  thirdPlaceConfig?: StageGameConfig;

  @Prop({ type: [Types.ObjectId], required: false })
  initialSlots?: Types.ObjectId[];

  @Prop({ type: [KoStage], required: false })
  koStages?: KoStage[];

  @Prop({ required: false, min: 1 })
  gamesPerTeam?: number;

  @Prop({ type: [LeagueMatchday], required: false })
  leagueMatchdays?: LeagueMatchday[];

  @Prop({ type: [LeagueRandomOrder], required: false })
  leagueRandomOrder?: LeagueRandomOrder[];
}

export const TournamentSchema = SchemaFactory.createForClass(Tournament);
