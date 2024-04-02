import { Address, toNano } from '@ton/core';
import { OrderDeployer } from '../wrappers/OrderDeployer';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
  const orderDeployer = provider.open(OrderDeployer.createFromConfig({
    admin: Address.parse('0QA__NJI1SLHyIaG7lQ6OFpAe9kp85fwPr66YwZwFc0p5wIu'),
    orderId: 0,
    orderCode: await compile('Order'),
    jettonWalletCode: await compile('JettonWallet'),
  }, await compile('OrderDeployer')));

  //const res = await orderDeployer.getOrderAddress(0);
  //console.log(res);
  await orderDeployer.sendDeploy(provider.sender(), toNano('0.05'));

  await provider.waitForDeploy(orderDeployer.address);

  // run methods on `orderDeployer`
}
