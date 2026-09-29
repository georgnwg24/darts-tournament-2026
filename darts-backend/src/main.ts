import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips unknown properties
      forbidNonWhitelisted: true, // throw if unknown props are sent
      transform: true, // applies class-transformer (@Type, transforms primitives)
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
