import {Address, toNano} from '@ton/core';
import {NetworkProvider} from '@ton/blueprint';
import {TonOrder} from '../wrappers/TonOrder';

export async function run(provider: NetworkProvider) {
  const orderAddress = Address.parse(
    'kQDs5_rY6v7IvQk8zRYg4_a62zLz9Fww35pxZq5cyal6GXw-'
  );

  const order = provider.open(TonOrder.createFromAddress(orderAddress));
  await order.sendClose(provider.sender(), {value: toNano(10.3), queryId: 9});
}
