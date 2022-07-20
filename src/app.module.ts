import { Module } from '@nestjs/common';
import { AppPromptService } from './app.prompts.js';
import { AppService } from './app.service.js';
import { SshModule } from './ssh/ssh.module.js';
import { CfgModule } from './cfg/cfg.module.js';
import { SteamcmdModule } from './steamcmd/steamcmd.module.js';
import RedisModuleMod from '@nestjs-modules/ioredis';

const { RedisModule } = RedisModuleMod;

@Module({
  imports: [
    SteamcmdModule,
    SshModule,
    CfgModule,
    RedisModule.forRoot({
      config: {
        url: 'redis://localhost:6379',
      },
    }),
  ],
  providers: [AppService, AppPromptService],
  exports: [AppPromptService],
})
export class AppModule {}
