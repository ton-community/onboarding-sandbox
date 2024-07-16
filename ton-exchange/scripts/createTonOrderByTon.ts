import {Address, toNano} from '@ton/core';
import {NetworkProvider} from '@ton/blueprint';
import {OrderDeployer} from '../wrappers/OrderDeployer';
import {ORDER_DEPLOYER_ADDRESS} from './index';

export async function run(provider: NetworkProvider) {
  const jettonMasterAddress = Address.parse(
    'kQBWwN8SW6Rc_wHl3hnXYLTCWKPk3-VWtuhib3KMg0Wsqdbl'
  );

  const orderDeployer = provider.open(
    OrderDeployer.createFromAddress(ORDER_DEPLOYER_ADDRESS)
  );

  const price = 1e9;
  await orderDeployer.sendCreateTonOrder(provider.sender(), {
    queryId: 9,
    value: toNano(1),
    price,
    jettonMasterAddress,
    expirationTime: 0,
    tonAmount: toNano(0.5),
  });
}
