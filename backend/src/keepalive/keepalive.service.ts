import http from 'http';
import https from 'https';

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { KeepaliveDbTouch } from './keepalive.entity';

let intervalId: NodeJS.Timeout | null = null;

function simpleGet(url: string, timeout = 10_000): Promise<number> {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const lib = parsed.protocol === 'https:' ? https : http;
      const req = lib.get(parsed, (res) => {
        res.on('data', () => {});
        res.on('end', () => resolve(res.statusCode ?? 0));
      });

      req.on('error', () => resolve(0));
      req.setTimeout(timeout, () => {
        req.destroy();
        resolve(0);
      });
    } catch {
      resolve(0);
    }
  });
}

@Injectable()
export class KeepaliveService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KeepaliveService.name);

  constructor(
    @InjectRepository(KeepaliveDbTouch)
    private readonly keepaliveRepo: Repository<KeepaliveDbTouch>,
  ) {}

  onModuleInit() {
    const enabled = (process.env.KEEPALIVE_ENABLED ?? 'true').toLowerCase() !== 'false';
    if (!enabled) return;

    const intervalSeconds = Number(process.env.KEEPALIVE_INTERVAL_SECONDS) || 300;
    const port = process.env.PORT || 3000;
    const defaultSelfUrl = `http://localhost:${port}/api/health`;

    // IMPORTANT: on Render this should be the public service URL (e.g. https://your-service.onrender.com/api/health)
    const selfUrl = process.env.SELF_URL || defaultSelfUrl;

    const pingOnce = async () => {
      const status = await simpleGet(selfUrl);
      this.logger.log(`[keepalive] self=${status} url=${selfUrl}`);
    };

    pingOnce();
    intervalId = setInterval(pingOnce, intervalSeconds * 1000);

    this.logger.log(
      `[keepalive] enabled intervalSeconds=${intervalSeconds} selfUrl=${selfUrl}`,
    );
  }

  onModuleDestroy() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  /**
   * Daily DB "touch" job:
   * - inserts a row
   * - deletes that same row
   *
   * This is intentionally explicit and isolated in `keepalive_db_touch`.
   */
  @Cron(process.env.DB_KEEPALIVE_CRON ?? '0 3 * * *', {
    name: 'db-keepalive-touch',
  })
  async touchDbDaily() {
    const enabled = (process.env.DB_KEEPALIVE_ENABLED ?? 'true').toLowerCase() !== 'false';
    if (!enabled) return;

    const row = this.keepaliveRepo.create({
      note: `touch ${new Date().toISOString()}`,
    });
    const saved = await this.keepaliveRepo.save(row);
    await this.keepaliveRepo.delete(saved.id);

    this.logger.log(`[db-keepalive] touched row id=${saved.id} (insert+delete)`);
  }
}

