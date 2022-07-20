import { Module } from '@nestjs/common';
import { SshService } from './ssh.service.js';

@Module({
  imports: [],
  providers: [SshService],
  exports: [SshService],
})
export class SshModule {}
