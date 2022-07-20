import { Module } from '@nestjs/common';
import { CfgService } from './cfg.service.js';

@Module({
  providers: [CfgService],
  exports: [CfgService],
})
export class CfgModule {}
