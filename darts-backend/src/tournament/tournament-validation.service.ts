import { BadRequestException, Injectable } from '@nestjs/common';
import { TeamService } from 'src/team/team.service';

@Injectable()
export class TournamentValidationService {
  constructor(private readonly teamService: TeamService) {}

  async assertTeamsExist(teamIds: string[]): Promise<void> {
    const uniqueTeamIds = [...new Set(teamIds)];
    if (uniqueTeamIds.length !== teamIds.length) {
      throw new BadRequestException('Duplicate teams are not allowed');
    }

    if (uniqueTeamIds.length === 0) return;

    const teams = await this.teamService.findManyByIds(uniqueTeamIds);
    if (teams.length !== uniqueTeamIds.length) {
      throw new BadRequestException('One or more teams do not exist');
    }
  }
}
