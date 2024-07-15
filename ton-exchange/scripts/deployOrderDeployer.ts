import {Address, toNano} from '@ton/core';
import {OrderDeployer} from '../wrappers/OrderDeployer';
import {compile, NetworkProvider} from '@ton/blueprint';
import {JettonMaster} from '@ton/ton';

export async function run(provider: NetworkProvider) {
  const jettonMasterWallet = provider.open(
    JettonMaster.create(
      Address.parse('kQBWwN8SW6Rc_wHl3hnXYLTCWKPk3-VWtuhib3KMg0Wsqdbl')
    )
  );

  const {walletCode} = await jettonMasterWallet.getJettonData();

  const orderDeployer = provider.open(
    OrderDeployer.createFromConfig(
      {
        admin: Address.parse(
          '0QD-SuoCHsCL2pIZfE8IAKsjc0aDpDUQAoo-ALHl2mje04A-'
        ),
        orderId: 0,
        orderCode: await compile('Order'),
        jettonWalletCode: walletCode,
        tonOrderCode: await compile('TonOrder'),
      },
      await compile('OrderDeployer')
    )
  );

  await orderDeployer.sendDeploy(provider.sender(), toNano('0.05'));
  await provider.waitForDeploy(orderDeployer.address);
}
