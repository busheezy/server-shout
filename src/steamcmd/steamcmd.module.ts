import { Module } from '@nestjs/common';
import { CfgModule } from '../cfg/cfg.module.js';
import { SshModule } from '../ssh/ssh.module.js';
import { SteamcmdUpdateService } from './steamcmd.update.service.js';
import { SteamCmdService } from './steamcmd.service.js';

@Module({
  imports: [CfgModule, SshModule],
  providers: [SteamCmdService, SteamcmdUpdateService],
  exports: [SteamCmdService, SteamcmdUpdateService],
})
export class SteamcmdModule {}
