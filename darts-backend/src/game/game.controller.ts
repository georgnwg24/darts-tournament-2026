import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ParseObjectIdPipe } from 'src/pipes/parse-objectid.pipe';
import { CreateGameDto } from './dtos/create-game.dto';
import { DetailedGameResponseDto } from './dtos/detailed-game-response.dto';
import { MinimalGameResponseDto } from './dtos/minimal-game-response.dto';
import { RecordThrowDto } from './dtos/record-throw.dto';
import { GameService } from './game.service';

@Controller('games')
export class GameController {
  constructor(private gameService: GameService) {}

  /**
   * Creates a new game
   *
   * @api {POST} /games
   * @param createGameDto Game configuration data
   * @returns Newly created game with generated IDs
   *
   * @throws BadRequestException If validation fails
   * @throws NotFoundException If referenced teams don't exist
   */
  @Post()
  async create(
    @Body() createGameDto: CreateGameDto,
  ): Promise<MinimalGameResponseDto> {
    const createdGame = await this.gameService.createGame(createGameDto);
    return plainToInstance(MinimalGameResponseDto, createdGame.toObject(), {
      // excludeExtraneousValues: true,
    });
  }

  /**
   * Retrieves a game by ID
   *
   * @api {GET} /games/:id
   * @param id Game ID (MongoDB ObjectId)
   * @returns Game details
   *
   * @throws NotFoundException If game doesn't exist
   * @throws BadRequestException If invalid ID format
   */
  @Get(':id')
  async findById(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<DetailedGameResponseDto> {
    const game = await this.gameService.findById(id);
    return plainToInstance(DetailedGameResponseDto, game, {
      // excludeExtraneousValues: true,
    });
  }

  /**
   * Retrieves all standalone games (without tournament assignment) sorted by creation date (newest first)
   *
   * @api {GET} /games
   * @returns Array of all games
   */
  @Get()
  async findAllStandaloneGames(): Promise<MinimalGameResponseDto[]> {
    const allGames = await this.gameService.findAllStandaloneGames();
    return allGames.map((game) =>
      plainToInstance(MinimalGameResponseDto, game.toObject(), {
        // excludeExtraneousValues: true,
      }),
    );
  }

  @Post(':id/throws')
  async recordThrow(
    @Param('id', ParseObjectIdPipe) gameId: string,
    @Body() dto: RecordThrowDto,
  ): Promise<DetailedGameResponseDto> {
    const updatedGame = await this.gameService.recordThrow(gameId, dto);
    return plainToInstance(DetailedGameResponseDto, updatedGame, {
      // excludeExtraneousValues: true,
    });
  }

  @Post(':id/rollback')
  async rollbackThrow(
    @Param('id', ParseObjectIdPipe) gameId: string,
  ): Promise<DetailedGameResponseDto> {
    const rolledbackGame = await this.gameService.rollbackThrow(gameId);
    return plainToInstance(DetailedGameResponseDto, rolledbackGame, {
      // excludeExtraneousValues: true,
    });
  }

  @Post(':id/turns/advance')
  async advanceTurn(
    @Param('id', ParseObjectIdPipe) gameId: string,
  ): Promise<DetailedGameResponseDto> {
    const updatedGame = await this.gameService.advanceTurn(gameId);
    return plainToInstance(DetailedGameResponseDto, updatedGame, {
      // excludeExtraneousValues: true,
    });
  }

  @Post(':id/turns/rewind')
  async rewindTurn(
    @Param('id', ParseObjectIdPipe) gameId: string,
  ): Promise<DetailedGameResponseDto> {
    const updatedGame = await this.gameService.rewindTurn(gameId);
    return plainToInstance(DetailedGameResponseDto, updatedGame, {
      // excludeExtraneousValues: true,
    });
  }

  /**
   * Deletes a game and all associated legs
   *
   * @api {DELETE} /games/:id
   * @param id Game ID (MongoDB ObjectId)
   *
   * @throws NotFoundException If game doesn't exist
   * @throws BadRequestException If invalid ID format
   */
  @Delete(':id')
  async remove(@Param('id', ParseObjectIdPipe) id: string): Promise<void> {
    await this.gameService.delete(id);
  }
}
