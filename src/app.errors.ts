export class ShoutExitEarly extends Error {
  constructor() {
    super('Exiting early. Not really an error.');
  }
}
