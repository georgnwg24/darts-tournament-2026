import { Exclude, Expose, Transform } from 'class-transformer';
import { objectIdToString } from 'src/utils/object-id-transformers';

@Exclude()
export class TeamResponseDto {
  @Expose()
  @Transform(objectIdToString)
  _id: string;

  @Expose()
  name: string;

  @Expose()
  players: string[];
}
