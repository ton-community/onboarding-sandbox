import { Address, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { TonOrder } from '../wrappers/TonOrder';

export async function run(provider: NetworkProvider) {
  const orderAddress = Address.parse('kQAYobe076nFzlTC8b5AsnDwd2rAfCzElZrJotEb3hdGaP2g');

  const order = provider.open(TonOrder.createFromAddress(orderAddress));
  await order.sendClose(provider.sender(), { value: toNano(1), queryId: 9 });
}
