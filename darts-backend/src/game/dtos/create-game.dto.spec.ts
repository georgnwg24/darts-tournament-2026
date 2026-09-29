import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Types } from 'mongoose';
import { CreateGameDto } from './create-game.dto';

describe('CreateGameDto', () => {
  const base = {
    roundLimit: 12,
    scoreLimit: 301,
    teamIds: [new Types.ObjectId().toString(), new Types.ObjectId().toString()],
  };

  async function errorsFor(input: Record<string, unknown>) {
    return validate(plainToInstance(CreateGameDto, input), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
  }

  it('accepts a positive integer win target, including an even value', async () => {
    await expect(errorsFor({ ...base, legsToWin: 2 })).resolves.toHaveLength(0);
  });

  it.each([0, -1, 1.5])('rejects invalid win target %s', async (legsToWin) => {
    await expect(errorsFor({ ...base, legsToWin })).resolves.not.toHaveLength(
      0,
    );
  });

  it('rejects the removed legLimit field', async () => {
    const errors = await errorsFor({ ...base, legsToWin: 2, legLimit: 3 });

    expect(errors.some((error) => error.property === 'legLimit')).toBe(true);
  });
});
