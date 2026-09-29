import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { TeamService } from './team.service';
import { CreateTeamDto } from './dtos/create-team.dto';
import { UpdateTeamDto } from './dtos/update-team.dto';
import { TeamResponseDto } from './dtos/team-response.dto';
import { plainToInstance } from 'class-transformer';
import { ParseObjectIdPipe } from 'src/pipes/parse-objectid.pipe';

@Controller('teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  async create(@Body() createTeamDto: CreateTeamDto): Promise<TeamResponseDto> {
    const createdTeam = await this.teamService.create(createTeamDto);
    return plainToInstance(TeamResponseDto, createdTeam.toObject(), {
      // excludeExtraneousValues: true,
    });
  }

  @Get()
  async findAll(): Promise<TeamResponseDto[]> {
    const teams = await this.teamService.findAll();
    return teams.map((t) =>
      plainToInstance(TeamResponseDto, t.toObject(), {
        // excludeExtraneousValues: true,
      }),
    );
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<TeamResponseDto> {
    const team = await this.teamService.findById(id);
    return plainToInstance(TeamResponseDto, team.toObject(), {
      // excludeExtraneousValues: true,
    });
  }

  @Put(':id')
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateTeamDto: UpdateTeamDto,
  ): Promise<TeamResponseDto> {
    const updatedTeam = await this.teamService.update(id, updateTeamDto);
    return plainToInstance(TeamResponseDto, updatedTeam.toObject(), {
      // excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  async deleteById(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<TeamResponseDto> {
    const removedTeam = await this.teamService.deleteById(id);
    return plainToInstance(TeamResponseDto, removedTeam.toObject(), {
      // excludeExtraneousValues: true,
    });
  }
}
