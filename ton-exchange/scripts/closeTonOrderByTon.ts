import {Address, toNano} from '@ton/core';
import {NetworkProvider} from '@ton/blueprint';
import {TonOrder} from '../wrappers/TonOrder';

export async function run(provider: NetworkProvider) {
  const orderAddress = Address.parse(
    'kQA7ZK0MccXneSxpXkA_h0jN3Em68Ky5DR51I8udMmBz29Ml'
  );

  const order = provider.open(TonOrder.createFromAddress(orderAddress));
  await order.sendClose(provider.sender(), {value: toNano(1.3), queryId: 9});
}
