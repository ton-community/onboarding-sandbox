import { Address, toNano } from '@ton/core';
import { compile, NetworkProvider } from '@ton/blueprint';
import { TickTock } from '../wrappers/TickTock';

export async function run(provider: NetworkProvider) {
  const endTime = new Date();
  endTime.setMinutes(endTime.getMinutes() + 2); // will be destroyed after 2 minutes

  const tickTock = provider.open(TickTock.createFromConfig({
    endTimeTs: endTime.getTime(),
    creatorAddress: Address.parse('0QD-SuoCHsCL2pIZfE8IAKsjc0aDpDUQAoo-ALHl2mje04A-'),
  }, await compile('TickTock'),  -1 /* masterchain */));

  await tickTock.sendDeploy(provider.sender(), toNano('0.05'),);
  await provider.waitForDeploy(tickTock.address);
}
