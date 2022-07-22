import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class ShoutServerConnection {
  @IsString()
  host: string;

  @IsNumber()
  @IsOptional()
  port = 22;

  @IsString()
  username: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  privateKey?: string;

  @IsString()
  @IsOptional()
  passphrase?: string;
}

export class ShoutServer {
  @IsString()
  name: string;

  @ValidateNested()
  @Type(() => ShoutServerConnection)
  connection: ShoutServerConnection;
}

export class ShoutAction {
  @IsString()
  name: string;

  @IsString({
    each: true,
  })
  commands: string[];

  @IsString()
  @IsOptional()
  cwd?: string;
}

export enum ShoutTriggeredActionTriggerType {
  GAME_UPDATE = 'game_update',
  CRON = 'cron',
}

class ShoutTriggeredActionTrigger {
  @IsEnum(ShoutTriggeredActionTriggerType)
  type: ShoutTriggeredActionTriggerType;
}

class ShoutTriggeredActionTriggerGameUpdateParams {
  @IsString()
  game_id: string;
}

class ShoutTriggeredActionTriggerGameUpdate extends ShoutTriggeredActionTrigger {
  type: ShoutTriggeredActionTriggerType.GAME_UPDATE;

  @ValidateNested()
  @Type(() => ShoutTriggeredActionTriggerGameUpdateParams)
  params: ShoutTriggeredActionTriggerGameUpdateParams;
}

class ShoutTriggeredActionTriggerCronParams {
  @IsString()
  schedule: string;

  @IsString()
  @IsOptional()
  time_zone?: string;
}

class ShoutTriggeredActionTriggerCron extends ShoutTriggeredActionTrigger {
  type: ShoutTriggeredActionTriggerType.CRON;

  @ValidateNested()
  @Type(() => ShoutTriggeredActionTriggerCronParams)
  params: ShoutTriggeredActionTriggerCronParams;
}

type ShoutTriggeredActionTriggers =
  | ShoutTriggeredActionTriggerGameUpdate
  | ShoutTriggeredActionTriggerCron;

export class ShoutTriggeredAction extends ShoutAction {
  @ValidateNested({
    each: true,
  })
  @Type(() => ShoutServer)
  @IsOptional()
  allow_servers?: ShoutServer[];

  @ValidateNested({
    each: true,
  })
  @Type(() => ShoutServer)
  @IsOptional()
  deny_servers?: ShoutServer[];

  @ValidateNested()
  @Type(() => ShoutTriggeredActionTrigger, {
    keepDiscriminatorProperty: true,
    discriminator: {
      property: 'type',
      subTypes: [
        {
          value: ShoutTriggeredActionTriggerGameUpdate,
          name: ShoutTriggeredActionTriggerType.GAME_UPDATE,
        },
        {
          value: ShoutTriggeredActionTriggerCron,
          name: ShoutTriggeredActionTriggerType.CRON,
        },
      ],
    },
  })
  trigger: ShoutTriggeredActionTriggers;
}

export class ShoutConfig {
  @ValidateNested({
    each: true,
  })
  @Type(() => ShoutServer)
  servers: ShoutServer[];

  @ValidateNested({
    each: true,
  })
  @Type(() => ShoutAction)
  quick_actions: ShoutAction[];

  @ValidateNested({
    each: true,
  })
  @Type(() => ShoutTriggeredAction)
  triggered_actions: ShoutTriggeredAction[];
}
