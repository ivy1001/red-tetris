import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));
  app.enableCors({ origin: '*' });

  // Subject: "It must also serve index.html, bundle.js, and any static assets via HTTP."
  // Serve the built frontend SPA when frontend/dist exists. Falls back to
  // index.html for any non-API, non-socket.io GET so client-side routes
  // like /:room/:playerName work.
  const frontendDist = resolve(process.cwd(), '..', 'frontend', 'dist');
  if (existsSync(frontendDist)) {
    app.useStaticAssets(frontendDist);
    const indexHtml = join(frontendDist, 'index.html');
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET') return next();
      if (req.path.startsWith('/api')) return next();
      if (req.path.startsWith('/socket.io')) return next();
      if (req.path.includes('.')) return next();
      res.sendFile(indexHtml);
    });
    // eslint-disable-next-line no-console
    console.log(`[red-tetris] serving SPA from ${frontendDist}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(
      '[red-tetris] frontend/dist not found — run `cd frontend && npm run build` to enable SPA serving',
    );
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Red Tetris API')
    .setDescription(
      'Debug HTTP surface for the Red Tetris backend. ' +
        'The real game flow runs over socket.io and is NOT documented here.',
    )
    .setVersion('0.1.0')
    .addTag('debug', 'In-memory room inspection and admin actions')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[red-tetris] backend listening on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`[red-tetris] swagger UI:        http://localhost:${port}/api/docs`);
}
bootstrap();
