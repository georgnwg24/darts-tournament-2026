import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team, TeamDocument } from './schemas/team.schema';
import { CreateTeamDto } from './dtos/create-team.dto';
import { UpdateTeamDto } from './dtos/update-team.dto';

@Injectable()
export class TeamService {
  constructor(@InjectModel(Team.name) private teamModel: Model<TeamDocument>) {}

  async create(createTeamDto: CreateTeamDto): Promise<TeamDocument> {
    await this.validateTeamName(createTeamDto.name);

    return new this.teamModel(createTeamDto).save();
  }

  async findAll(): Promise<TeamDocument[]> {
    return this.teamModel.find().exec();
  }

  async findManyByIds(ids: string[]): Promise<TeamDocument[]> {
    if (ids.length === 0) return [];
    return this.teamModel.find({ _id: { $in: ids } }).exec();
  }

  async findById(id: string): Promise<TeamDocument> {
    const team = await this.teamModel.findById(id).exec();
    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }
    return team;
  }

  async update(
    id: string,
    updateTeamDto: UpdateTeamDto,
  ): Promise<TeamDocument> {
    const updatedTeam = await this.teamModel
      .findByIdAndUpdate(id, updateTeamDto, { new: true, runValidators: true })
      .exec();
    if (!updatedTeam) {
      throw new NotFoundException(`Team with ID ${id} not found for update`);
    }
    return updatedTeam;
  }

  async deleteById(id: string): Promise<TeamDocument> {
    const removedTeam = await this.teamModel.findByIdAndDelete(id).exec();
    if (!removedTeam) {
      throw new NotFoundException(`Team with ID ${id} not found for deletion`);
    }
    return removedTeam;
  }

  private async validateTeamName(name: string): Promise<void> {
    const existingTeam = await this.teamModel.findOne({ name });
    if (existingTeam) {
      throw new BadRequestException(
        `A team name with name '${name}' already exists`,
      );
    }
  }
}
