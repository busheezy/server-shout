import { Injectable } from '@nestjs/common';
import Bluebird from 'bluebird';
import { NodeSSH, SSHExecCommandOptions } from 'node-ssh';
import { ShoutAction, ShoutServer } from '../cfg/cfg.types.js';

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

  async shoutCommand(action: ShoutAction, servers: ShoutServer[]) {
    await Bluebird.mapSeries(servers, async (server) => {
      const connection = await this.connect(server);

      const options: SSHExecCommandOptions = {
        execOptions: {
          pty: true,
        },
      };

      if (action.cwd) {
        options.cwd = action.cwd;
      }

      options.onStdout = (chunk) => {
        const chunkSz = chunk.toString();
        process.stdout.write(chunkSz);
      };

      options.onStderr = (chunk) => {
        const chunkSz = chunk.toString();
        process.stderr.write(chunkSz);
      };

      await Bluebird.mapSeries(action.commands, (command) => {
        return connection.execCommand(command, options);
      });
    });
  }
}
