import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
 
  app.use(cookieParser())
  app.enableCors({
    origin: [
      'https://eventos-redmus.web.app',
    'https://scanner-redmus.web.app',
      'http://localhost:4200'
    ], 
    credentials: true,
});
  app.setGlobalPrefix('api/v1/eventpass');
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
