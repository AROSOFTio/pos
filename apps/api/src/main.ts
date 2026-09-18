import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { Request, Response } from 'express';
import http from 'node:http';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  const expressApp = app.getHttpAdapter().getInstance();
  const legacyBase = process.env.LEGACY_URL || 'http://legacy:3002';

  expressApp.use('/api', (req: Request, res: Response) => {
    const target = new URL(req.originalUrl, legacyBase);
    const headers: Record<string, any> = { ...req.headers, host: target.host };
    delete headers['content-length'];

    let body: string | undefined;
    if (!['GET', 'HEAD'].includes(req.method) && req.body && Object.keys(req.body).length) {
      body = JSON.stringify(req.body);
      headers['content-type'] = 'application/json';
      headers['content-length'] = Buffer.byteLength(body);
    }

    const proxy = http.request(target, { method: req.method, headers }, upstream => {
      res.status(upstream.statusCode || 502);
      Object.entries(upstream.headers).forEach(([key, value]) => {
        if (value !== undefined && key.toLowerCase() !== 'transfer-encoding') res.setHeader(key, value as any);
      });
      upstream.pipe(res);
    });

    proxy.on('error', error => {
      if (!res.headersSent) res.status(502).json({ error: 'Legacy service unavailable', detail: error.message });
      else res.end();
    });

    if (body) proxy.end(body);
    else proxy.end();
  });

  await app.listen(Number(process.env.PORT || 3001), '0.0.0.0');
}
bootstrap();
