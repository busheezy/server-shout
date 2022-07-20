import { Injectable, OnModuleInit } from '@nestjs/common';
import { ensureDir } from 'fs-extra';
import { join } from 'node:path';
import { ShoutExitEarly } from './app.errors.js';
import { AppPromptService } from './app.prompts.js';
import { ActionType } from './app.types.js';
import { ShoutAction } from './cfg/cfg.types.js';
import { SshService } from './ssh/ssh.service.js';

const workDirPath = join(process.cwd(), '.shout');

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly appPromptService: AppPromptService,
    private readonly sshService: SshService,
  ) {}

  async startPrompts() {
    try {
      const actionType = await this.appPromptService.selectActionType();

      if (actionType === ActionType.QUICK_ACTION) {
        const quickAction = await this.appPromptService.selectQuickAction();
        const servers = await this.appPromptService.selectServers(quickAction);
        await this.sshService.shoutCommand(quickAction, servers);
      }

      if (actionType === ActionType.RAW_ACTION) {
        const rawActionCommand = await this.appPromptService.inputRawAction();

        const action: ShoutAction = {
          commands: [rawActionCommand],
          name: 'RAW',
        };

        const servers = await this.appPromptService.selectServers(action);
        await this.sshService.shoutCommand(action, servers);
      }

      await this.startPrompts();
    } catch (err) {
      if (err instanceof ShoutExitEarly) {
        this.startPrompts();
      } else {
        console.error(err);
      }
    }
  }

  async onModuleInit() {
    await this.startPrompts();
  }

  ensureWorkDirExists() {
    return ensureDir(workDirPath);
  }
}
