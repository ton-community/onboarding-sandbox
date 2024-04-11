import {Address, beginCell, toNano} from '@ton/core';
import {NetworkProvider} from '@ton/blueprint';
import {JettonWallet} from '../wrappers/JettonWallet';

export async function run(provider: NetworkProvider) {
  const orderDeployerAddress = Address.parse(
    'EQBuObr2M7glm08w6cBGjIuuCbmvBFGwuVs6qb3AQpac9Xpf'
  );
  const jettonWalletAddress = Address.parse(
    'kQA8Q7m_pSNPr6FcqRYxllpAZv-0ieXy_KYER2iP195hBXiU'
  );
  const jettonWalletMasterAddress = Address.parse(
    'kQBWwN8SW6Rc_wHl3hnXYLTCWKPk3-VWtuhib3KMg0Wsqdbl'
  );

  const jettonWallet = provider.open(
    JettonWallet.createFromAddress(jettonWalletAddress)
  );

  const price = 1;
  await jettonWallet.sendTransfer(provider.sender(), {
    value: toNano(1),
    fwdAmount: toNano(0.7),
    queryId: 9,
    jettonAmount: toNano(1n),
    toAddress: orderDeployerAddress,
    forwardPayload: beginCell()
      .storeUint(0x26de15e2, 32)
      .storeRef(
        beginCell()
          .storeAddress(jettonWalletMasterAddress)
          .storeUint(price, 32)
          .storeUint(Math.ceil(Date.now() / 1000) + 1000, 64)
          .endCell()
      )
      .endCell()
      .asSlice(),
  });
}
