import { Injectable } from '@nestjs/common';
import Bluebird from 'bluebird';
import fsExtraMod from 'fs-extra';
import { NodeSSH, SSHExecCommandOptions } from 'node-ssh';
import { join } from 'node:path';
import { ShoutAction, ShoutServer } from '../cfg/cfg.types.js';

import retry from 'retry-as-promised';

const { ensureDir, appendFile } = fsExtraMod;

@Injectable()
export class SshService {
  private connect(server: ShoutServer) {
    try {
      return retry(
        () => {
          return new NodeSSH().connect(server.connection);
        },
        {
          max: 3,
        },
      );
    } catch {
      throw new Error(`Error while connecting to ${server.name}.`);
    }
  }

  getServerLogPaths(server: ShoutServer) {
    const logPath = join(process.cwd(), '.shout', 'logs', server.name);
    const serverLogOutPath = join(logPath, 'out.log');
    const serverLogErrPath = join(logPath, 'err.log');
    const serverLogBgOutPath = join(logPath, 'bg-out.log');
    const serverLogBgErrPath = join(logPath, 'bg-err.log');

    return {
      logPath,
      serverLogOutPath,
      serverLogErrPath,
      serverLogBgOutPath,
      serverLogBgErrPath,
    };
  }

  async shoutCommand(
    action: ShoutAction,
    servers: ShoutServer[],
    quiet = false,
  ) {
    await Bluebird.mapSeries(servers, async (server) => {
      const connection = await this.connect(server);

      const { logPath, serverLogOutPath, serverLogBgOutPath } =
        this.getServerLogPaths(server);

      await ensureDir(logPath);
      const options = this.getOptions(action, server, quiet);

      await Bluebird.mapSeries(action.commands, async (command) => {
        if (quiet) {
          await appendFile(serverLogBgOutPath, `$ ${command}\n`);
        } else {
          await appendFile(serverLogOutPath, `$ ${command}\n`);
          console.log(`$ ${command}`);
        }

        await retry(
          () => {
            return connection.execCommand(command, options);
          },
          {
            max: 3,
          },
        );

        await Bluebird.delay(50);
      });
    });
  }

  getOptions(
    action: ShoutAction,
    server: ShoutServer,
    quiet: boolean,
  ): SSHExecCommandOptions {
    const {
      serverLogOutPath,
      serverLogErrPath,
      serverLogBgOutPath,
      serverLogBgErrPath,
    } = this.getServerLogPaths(server);

    const options: SSHExecCommandOptions = {
      execOptions: {
        pty: true,
      },
    };

    if (action.cwd) {
      options.cwd = action.cwd;
    }

    options.onStdout = async (chunk) => {
      if (quiet) {
        await appendFile(serverLogBgOutPath, chunk);
      } else {
        await appendFile(serverLogOutPath, chunk);

        const chunkSz = chunk.toString();
        process.stdout.write(chunkSz);
      }
    };

    options.onStderr = async (chunk) => {
      if (quiet) {
        await appendFile(serverLogBgErrPath, chunk);
      } else {
        await appendFile(serverLogErrPath, chunk);

        const chunkSz = chunk.toString();
        process.stderr.write(chunkSz);
      }
    };

    return options;
  }
}
