import { Injectable } from '@nestjs/common';
import prompts from 'prompts';
import { ShoutExitEarly } from './app.errors.js';
import { ActionType } from './app.types.js';
import { CfgService } from './cfg/cfg.service.js';
import { ShoutAction, ShoutServer } from './cfg/cfg.types.js';

@Injectable()
export class AppPromptService {
  constructor(private readonly cfgService: CfgService) {}

  async selectServers(shoutAction: ShoutAction): Promise<ShoutServer[]> {
    const { value: servers } = await prompts(
      {
        type: 'multiselect',
        name: 'value',
        message: 'Pick Servers',
        choices: this.cfgService.servers.map((server) => ({
          title: server.name,
          value: server,
          selected: true,
        })),
        instructions: false,
        hint: `Select servers to run ${shoutAction.name} on`,
      },
      {
        onCancel() {
          throw new ShoutExitEarly();
        },
      },
    );

    return servers as ShoutServer[];
  }

  async inputRawAction() {
    const { action } = await prompts(
      {
        type: 'text',
        name: 'action',
        message: 'Enter the raw sh line',
      },
      {
        onCancel() {
          throw new ShoutExitEarly();
        },
      },
    );

    return action;
  }

  async selectActionType(): Promise<ActionType> {
    const { action } = await prompts(
      {
        type: 'select',
        name: 'action',
        message: 'Pick action type',
        choices: Object.values(ActionType).map((actionName) => ({
          title: actionName,
          value: actionName,
        })),
      },
      {
        onCancel() {
          process.exit();
        },
      },
    );

    return action;
  }

  async selectQuickAction(): Promise<ShoutAction> {
    const { action } = await prompts(
      {
        type: 'select',
        name: 'action',
        message: 'Pick Quick Action',
        choices: this.cfgService.quickActions.map((action) => ({
          title: action.name,
          value: action,
        })),
      },
      {
        onCancel() {
          throw new ShoutExitEarly();
        },
      },
    );

    return action as ShoutAction;
  }
}
