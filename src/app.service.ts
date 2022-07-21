import IoRedisNestJsMod from '@nestjs-modules/ioredis';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ensureDir } from 'fs-extra';
import { join } from 'node:path';
import { ShoutExitEarly } from './app.errors.js';
import { AppPromptService } from './app.prompts.js';
import { ActionType } from './app.types.js';
import { ShoutAction } from './cfg/cfg.types.js';
import { SshService } from './ssh/ssh.service.js';
import { SteamcmdService } from './steamcmd/steamcmd.service.js';
import * as Redis from 'ioredis';
import { CfgService } from './cfg/cfg.service.js';

const { InjectRedis } = IoRedisNestJsMod;

const workDirPath = join(process.cwd(), '.shout');
const CSGO_LAST_UPDATE_KEY = 'CSGO_LAST_UPDATE_KEY';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly appPromptService: AppPromptService,
    private readonly sshService: SshService,
    private readonly steamCmdService: SteamcmdService,
    private readonly cfgService: CfgService,
    @InjectRedis() private readonly redis: Redis,
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
    setInterval(() => {
      this.startUpdateCheck();
    }, 60 * 1000);

    await this.startPrompts();
  }

  async startUpdateCheck() {
    const { buildid } = await this.steamCmdService.getUpdateInfo();
    const previousBuildId = await this.redis.get(CSGO_LAST_UPDATE_KEY);

    if (buildid !== previousBuildId) {
      await this.updateAllServers();
      await this.redis.set(CSGO_LAST_UPDATE_KEY, buildid);
    }
  }

  async updateAllServers() {
    const action: ShoutAction = {
      commands: [
        '/home/$USER/gs/csgoserver send "say An update was released. The server is about to restart."',
        '/home/$USER/gs/csgoserver send "say An update was released. The server is about to restart."',
        '/home/$USER/gs/csgoserver send "say An update was released. The server is about to restart."',
        'sleep 15',
        '/home/$USER/gs/csgoserver update',
      ],
      name: 'Update',
    };

    await this.sshService.shoutCommand(action, this.cfgService.servers, true);
  }

  ensureWorkDirExists() {
    return ensureDir(workDirPath);
  }
}
