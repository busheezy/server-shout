import { Module } from '@nestjs/common';
import { AppPromptService } from './app.prompts.js';
import { AppService } from './app.service.js';
import { SshModule } from './ssh/ssh.module.js';
import { CfgModule } from './cfg/cfg.module.js';

@Module({
  imports: [SshModule, CfgModule],
  controllers: [],
  providers: [AppService, AppPromptService],
  exports: [AppPromptService],
})
export class AppModule {}
