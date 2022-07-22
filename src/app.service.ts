import { Injectable, OnModuleInit } from '@nestjs/common';
import { ensureDir } from 'fs-extra';
import { join } from 'node:path';
import { ShoutExitEarly } from './app.errors.js';
import { AppPromptService } from './app.prompts.js';
import { ActionType } from './app.types.js';
import { CfgService } from './cfg/cfg.service.js';
import {
  ShoutAction,
  ShoutTriggeredActionTriggerType,
} from './cfg/cfg.types.js';
import { SshService } from './ssh/ssh.service.js';
import { SteamcmdUpdateService } from './steamcmd/steamcmd.update.service.js';
import * as cron from 'node-cron';
import { filterServersByActionParams } from './app.lib.js';

const workDirPath = join(process.cwd(), '.shout');

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly appPromptService: AppPromptService,
    private readonly sshService: SshService,
    private readonly cfgService: CfgService,
    private readonly steamCmdHandlerService: SteamcmdUpdateService,
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
    await this.ensureWorkDirExists();
    await this.steamCmdHandlerService.startCheckInterval();
    this.registerTriggerActions();
    await this.startPrompts();
  }

  registerTriggerActions() {
    this.cfgService.triggeredActions.forEach((triggerAction) => {
      if (
        triggerAction.trigger.type !==
        ShoutTriggeredActionTriggerType.GAME_UPDATE
      ) {
        return;
      }

      this.steamCmdHandlerService.registerUpdateTriggerAction(triggerAction);
    });

    this.cfgService.triggeredActions.forEach((triggerAction) => {
      if (triggerAction.trigger.type !== ShoutTriggeredActionTriggerType.CRON) {
        return;
      }

      const filteredServers = filterServersByActionParams(
        triggerAction,
        this.cfgService.servers,
      );

      cron.schedule(triggerAction.trigger.params.schedule, async () => {
        await this.sshService.shoutCommand(
          triggerAction,
          filteredServers,
          true,
        );
      });
    });
  }

  ensureWorkDirExists() {
    return ensureDir(workDirPath);
  }
}
