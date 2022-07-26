import { Injectable } from '@nestjs/common';
import Bluebird from 'bluebird';
import {
  ShoutTriggeredAction,
  ShoutTriggeredActionTriggerType,
} from '../cfg/cfg.types.js';
import { SteamCmdService } from './steamcmd.service.js';
import IoRedisNestJsMod from '@nestjs-modules/ioredis';

const { InjectRedis } = IoRedisNestJsMod;
import { Redis } from 'ioredis';
import { CfgService } from '../cfg/cfg.service.js';
import { SshService } from '../ssh/ssh.service.js';
import { filterServersByActionParams } from '../app.lib.js';
import retry from 'retry-as-promised';

type RegisteredTriggers = Record<string, ShoutTriggeredAction[]>;

@Injectable()
export class SteamcmdUpdateService {
  private registeredTriggers: RegisteredTriggers = {};

  constructor(
    private readonly steamCmdService: SteamCmdService,
    private readonly cfgService: CfgService,
    private readonly sshService: SshService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  registerUpdateTriggerAction(triggeredAction: ShoutTriggeredAction) {
    if (
      triggeredAction.trigger.type !==
      ShoutTriggeredActionTriggerType.GAME_UPDATE
    ) {
      return;
    }

    const gameId = triggeredAction.trigger.params.game_id;

    if (!this.registeredTriggers[gameId]) {
      this.registeredTriggers[gameId] = [];
    }

    this.registeredTriggers[gameId].push(triggeredAction);
  }

  async startCheckInterval() {
    setInterval(async () => {
      await this.checkForUpdates();
    }, 30 * 1000);
  }

  async checkForUpdates() {
    const gameIds = Object.keys(this.registeredTriggers);

    await Bluebird.mapSeries(gameIds, async (gameId) => {
      const info = await retry(
        () => {
          return this.steamCmdService.getUpdateInfo(gameId);
        },
        {
          max: 3,
        },
      );

      const redisKey = `APP_UPDATE_${gameId}_BUILD_ID`;

      const redisValue = await this.redis.get(redisKey);

      if (!redisValue) {
        await this.redis.set(redisKey, info.buildid);
        return;
      }

      if (redisValue !== info.buildid) {
        await this.redis.set(redisKey, info.buildid);
        const triggers = this.registeredTriggers[gameId];
        await this.updateServers(triggers);
      }
    });
  }

  async updateServers(triggers: ShoutTriggeredAction[]) {
    const { servers } = this.cfgService;

    await Bluebird.mapSeries(triggers, async (trigger) => {
      const filteredServers = filterServersByActionParams(trigger, servers);
      await this.sshService.shoutCommand(trigger, filteredServers, true);
    });
  }
}
