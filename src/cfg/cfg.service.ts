import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import fsExtra from 'fs-extra';
import { join } from 'node:path';
import yaml from 'yaml';
import format from 'string-template';
import { parse } from 'dotenv';

import { ShoutConfig } from './cfg.types.js';

const { readFileSync } = fsExtra;

const configFilePath = join(process.cwd(), 'config.yaml');
const configFile = readFileSync(configFilePath, 'utf-8');
const secretsPath = join(process.cwd(), '.secrets');

function templateConfigFile() {
  const secretsFile = readFileSync(secretsPath, 'utf-8');
  const secrets = parse(secretsFile);
  return format(configFile, secrets);
}

function validateConfig(shoutConfig: ShoutConfig) {
  const errors = validateSync(shoutConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
}

function getConfig(): ShoutConfig {
  const templatedConfigFile = templateConfigFile();
  const configFileObj = yaml.parse(templatedConfigFile);

  const shoutConfig = plainToInstance(ShoutConfig, configFileObj, {
    enableImplicitConversion: true,
  });

  validateConfig(shoutConfig);

  return shoutConfig;
}

@Injectable()
export class CfgService {
  private config: ShoutConfig;

  constructor() {
    this.config = getConfig();
  }

  get servers() {
    return this.config.servers;
  }

  get quickActions() {
    return this.config.quick_actions;
  }

  get triggeredActions() {
    return this.config.triggered_actions;
  }
}
