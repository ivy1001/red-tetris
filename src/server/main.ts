import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

// Client build (index.html + bundle.js + index.css) from `npm run client-dist`, in <repo>/build.
const CLIENT = join(__dirname, '..', 'build');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(CLIENT, { index: false });
  // SPA: every other GET (e.g. /<room>/<player_name>) gets index.html; the client router takes it from there.
  app.use((req: { method: string }, res: { sendFile(p: string): void }, next: () => void) =>
    req.method === 'GET' ? res.sendFile(join(CLIENT, 'index.html')) : next(),
  );
  await app.listen(Number(process.env.PORT) || 3004, '0.0.0.0');
}
bootstrap();
