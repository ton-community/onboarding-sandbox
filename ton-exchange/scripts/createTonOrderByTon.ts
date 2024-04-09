import { Address, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { OrderDeployer } from '../wrappers/OrderDeployer';

export async function run(provider: NetworkProvider) {
  const orderDeployerAddress = Address.parse('kQAZObWpUf9LrnciuRjpVemg64WswrUj_NL8MMZA6vG-jNq2');
  const jettonMasterAddress = Address.parse('kQBWwN8SW6Rc_wHl3hnXYLTCWKPk3-VWtuhib3KMg0Wsqdbl');

  const orderDeployer = provider.open(OrderDeployer.createFromAddress(orderDeployerAddress));

  const price = 1;
  await orderDeployer.sendCreateTonOrder(provider.sender(), {
    queryId: 9,
    value: toNano(1),
    price,
    jettonMasterAddress,
    expirationTime: 0,
    tonAmount: toNano(0.5),
  });
}
