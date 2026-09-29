import { Exclude, Expose, Transform } from 'class-transformer';
import { Status } from 'src/enums/status';
import {
  objectIdsToStrings,
  objectIdToString,
} from 'src/utils/object-id-transformers';

@Exclude()
export class MinimalGameResponseDto {
  @Expose()
  @Transform(objectIdToString)
  _id: string;

  @Expose()
  @Transform(objectIdsToStrings)
  teamIds: string[];

  @Expose()
  scoreLimit?: number;

  @Expose()
  status: Status;

  @Expose()
  @Transform(objectIdToString)
  gameWinner?: string;

  @Expose()
  locked: boolean;

  @Expose()
  @Transform(objectIdToString)
  tournamentId?: string;
}
