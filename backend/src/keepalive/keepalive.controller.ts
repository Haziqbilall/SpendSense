import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class KeepaliveController {
  @Get()
  health() {
    return {
      ok: true,
      ts: new Date().toISOString(),
    };
  }
}

