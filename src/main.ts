import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';

const METODOS_MUTABLES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Cabeceras de seguridad (CSP, X-Frame-Options, X-Content-Type-Options,
  // Referrer-Policy, etc.). crossOriginResourcePolicy se relaja a
  // "cross-origin" a propósito: el front está en otro dominio y hace fetch
  // con credentials a los PDF/XLSX/QR de este API, no <img src> directo.
  //app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // Mitigación de CSRF: la sesión va en cookie con SameSite=None en
  // producción (necesario porque front y API son dominios distintos), así
  // que un <form> HTML de otro sitio igual la adjuntaría. Lo que un <form>
  // no puede hacer es poner Content-Type: application/json — solo
  // x-www-form-urlencoded, multipart/form-data o text/plain. Exigir JSON en
  // toda mutación bloquea ese vector sin tocar la sesión ni requerir un
  // token CSRF aparte. Las peticiones sin body (DELETE, PATCH sin datos) no
  // mandan Content-Type y siguen pasando.
  // app.use((req, res, next) => {
  //   if (!METODOS_MUTABLES.has(req.method)) return next();
  //   const contentType = req.headers['content-type'];
  //   if (contentType && !contentType.includes('application/json')) {
  //     return res.status(415).json({
  //       message: 'Content-Type debe ser application/json',
  //     });
  //   }
  //   next();
  // });

  app.use(cookieParser())
  app.enableCors({
    origin: [
      'https://redmusicasmedellin.co',
      'https://www.redmusicasmedellin.co',
      'https://eventos-redmus.web.app',
    'https://scanner-redmus.web.app',
    ],
    credentials: true,
});
  app.setGlobalPrefix('api/v1/eventpass');
  // whitelist: los campos no declarados en el DTO se descartan en vez de
  // llegar al controller (varios services hacen Object.assign(entity, dto)
  // sin filtrar, así que esto es lo que realmente evita mass assignment).
  // transform: construye una instancia real de la clase del DTO en vez de
  // pasar el objeto plano — lo que whitelist necesita para saber qué
  // propiedades pertenecen a la clase.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
