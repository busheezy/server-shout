import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ShoutServerConnection {
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

export class ShoutConfig {
  @ValidateNested()
  @Type(() => ShoutServer)
  servers: ShoutServer[];

  @ValidateNested()
  @Type(() => ShoutAction)
  quick_actions: ShoutAction[];
}
