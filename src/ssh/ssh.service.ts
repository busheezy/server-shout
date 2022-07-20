import { Injectable } from '@nestjs/common';
import Bluebird from 'bluebird';
import fsExtraMod from 'fs-extra';
import { NodeSSH, SSHExecCommandOptions } from 'node-ssh';
import { join } from 'node:path';
import { ShoutAction, ShoutServer } from '../cfg/cfg.types.js';

const { ensureDir, appendFile } = fsExtraMod;

@Injectable()
export class SshService {
  private async connect(server: ShoutServer) {
    try {
      const ssh = new NodeSSH();
      const connection = await ssh.connect(server.connection);
      return connection;
    } catch {
      throw new Error(`Error while connecting to ${server.name}.`);
    }
  }

  async shoutCommand(
    action: ShoutAction,
    servers: ShoutServer[],
    quiet = false,
  ) {
    await Bluebird.mapSeries(servers, async (server) => {
      const connection = await this.connect(server);

      const logPath = join(process.cwd(), '.shout', 'logs');
      const serverLogOutPath = join(logPath, `${server.name}-out.log`);
      const serverLogErrPath = join(logPath, `${server.name}-err.log`);

      await ensureDir(logPath);

      await Bluebird.mapSeries(action.commands, async (command) => {
        await appendFile(serverLogOutPath, `$ ${command}\n`);

        const options: SSHExecCommandOptions = {
          execOptions: {
            pty: true,
          },
        };

        if (action.cwd) {
          options.cwd = action.cwd;
        }

        options.onStdout = async (chunk) => {
          await appendFile(serverLogOutPath, chunk);

          if (!quiet) {
            const chunkSz = chunk.toString();
            process.stdout.write(chunkSz);
          }
        };

        options.onStderr = async (chunk) => {
          await appendFile(serverLogErrPath, chunk);

          if (!quiet) {
            const chunkSz = chunk.toString();
            process.stderr.write(chunkSz);
          }
        };

        await connection.execCommand(command, options);
        await Bluebird.delay(50);
      });
    });
  }
}
