import { Module } from '@nestjs/common';
import { SteamcmdService } from './steamcmd.service.js';

@Module({
  providers: [SteamcmdService],
  exports: [SteamcmdService],
})
export class SteamcmdModule {}
