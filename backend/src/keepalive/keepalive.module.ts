import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KeepaliveController } from './keepalive.controller';
import { KeepaliveDbTouch } from './keepalive.entity';
import { KeepaliveService } from './keepalive.service';

@Module({
  imports: [TypeOrmModule.forFeature([KeepaliveDbTouch])],
  controllers: [KeepaliveController],
  providers: [KeepaliveService],
})
export class KeepaliveModule {}

