import {Address, toNano} from '@ton/core';
import {NetworkProvider} from '@ton/blueprint';
import {TonOrder} from '../wrappers/TonOrder';

export async function run(provider: NetworkProvider) {
  const orderAddress = Address.parse(
    'kQD56u5-_i2ORW6QD3AIKyraZhqPL0KNaAaZ31ba2mDe9H6w'
  );

  const order = provider.open(TonOrder.createFromAddress(orderAddress));
  await order.sendClose(provider.sender(), {value: toNano(1.3), queryId: 9});
}
