import { Injectable } from '@nestjs/common';
import { STEAMCMD_LINUX_URL } from './steamcmd.consts.js';
import axiosMod from 'axios';
import fsExtraMod from 'fs-extra';
import { basename, join } from 'node:path';
import { extract } from 'tar';
import * as pty from 'node-pty';
import { deserialize } from 'valve-kv';

const workDirPath = join(process.cwd(), '.shout');

const binaryTarName = basename(STEAMCMD_LINUX_URL);
const binaryTarPath = join(workDirPath, binaryTarName);

const binaryFolderPath = join(workDirPath, 'steamcmd');
const binaryPath = join(binaryFolderPath, 'steamcmd.sh');

const { Axios } = axiosMod;
const { access, chmod, constants, createWriteStream, ensureDir } = fsExtraMod;

const axios = new Axios({});

interface Update {
  buildid: string;
  timeupdated: string;
}

@Injectable()
export class SteamCmdService {
  async ensureSteamCmdInstalled() {
    const executable = await this.isBinaryExecutable();

    if (!executable) {
      console.log('Binary not found. Starting download.');
      await this.downloadBinaryTar();

      console.log('extracting');
      await ensureDir(binaryFolderPath);
      await this.extractTar();

      console.log('chmoding');
      await this.chmodBinary();

      const executableYet = await this.isBinaryExecutable();
      if (executableYet) {
        console.log('download successful');
      } else {
        throw new Error("Still can't execute after downloading.");
      }
    }
  }

  getUpdateInfo(gameId: string): Promise<Update> {
    return new Promise(async (resolve) => {
      await this.ensureSteamCmdInstalled();

      const steamCmdPty = pty.spawn(
        binaryPath,
        [
          '+login anonymous',
          '+app_info_update 1',
          `+app_info_print ${gameId}`,
          '+quit',
        ],
        {
          cwd: binaryFolderPath,
        },
      );

      let data = '';

      steamCmdPty.onData((chunk: string) => {
        data = `${data}${chunk}`;
      });

      steamCmdPty.onExit(() => {
        const info = this.parseInfoData(gameId, data);
        resolve(info);
      });
    });
  }

  private async isBinaryExecutable(): Promise<boolean> {
    try {
      await access(binaryPath, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  private downloadBinaryTar(): Promise<void> {
    const writeStream = createWriteStream(binaryTarPath);

    return new Promise(async (resolve, reject) => {
      const response = await axios.get(STEAMCMD_LINUX_URL, {
        responseType: 'stream',
      });

      response.data.pipe(writeStream);

      let didError = false;

      writeStream.on('error', (err) => {
        didError = true;

        writeStream.close();

        reject(err);
      });

      writeStream.on('close', () => {
        if (!didError) {
          console.log('Binary downloaded.');
          resolve();
        }
      });
    });
  }

  private async chmodBinary() {
    try {
      await chmod(binaryPath, 0o755);
    } catch (error) {
      throw new Error('Could not chmod.');
    }
  }

  private extractTar() {
    return extract({
      file: binaryTarPath,
      cwd: binaryFolderPath,
      strict: true,
    });
  }

  private stripExtraTextFromInfo(gameId: string, data: string): string {
    const lines = data.split(/\r?\n/);

    let info = '';
    let reachedStart = false;

    lines.forEach((line) => {
      if (line === `"${gameId}"`) {
        reachedStart = true;
      }

      if (reachedStart) {
        info = `${info}\n${line}`;
      }
    });

    return info;
  }

  private parseInfoData(gameId: string, data: string) {
    const infoSz = this.stripExtraTextFromInfo(gameId, data);
    const fullInfo = deserialize(infoSz);
    const info = fullInfo[gameId]['depots']['branches']['public'] as Update;
    return info;
  }
}
