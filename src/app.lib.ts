import { ShoutServer, ShoutTriggeredAction } from './cfg/cfg.types.js';

function serverExistsWithName(servers: ShoutServer[], name: string): boolean {
  return servers.some((server) => {
    server.name === name;
  });
}

export function filterServersByActionParams(
  trigger: ShoutTriggeredAction,
  servers: ShoutServer[],
): ShoutServer[] {
  if (trigger.allow_servers) {
    return trigger.allow_servers;
  } else if (trigger.deny_servers) {
    return servers.filter((server) =>
      serverExistsWithName(trigger.deny_servers, server.name),
    );
  }

  return servers;
}
