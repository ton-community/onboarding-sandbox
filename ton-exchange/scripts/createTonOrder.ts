import { Address, beginCell, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { JettonWallet } from '../wrappers/JettonWallet';

export async function run(provider: NetworkProvider) {
  const orderDeployerAddress = Address.parse('EQB6seUmFVUoe8N-09RXr_Oz7AJ4rs_U9c1hcFf5Iw8M6EG1');
  const jettonWalletAddress = Address.parse('kQA8Q7m_pSNPr6FcqRYxllpAZv-0ieXy_KYER2iP195hBXiU');
  const jettonWalletMasterAddress = Address.parse('kQBWwN8SW6Rc_wHl3hnXYLTCWKPk3-VWtuhib3KMg0Wsqdbl');

  const jettonWallet = provider.open(JettonWallet.createFromAddress(jettonWalletAddress));

  const price = 10;
  await jettonWallet.sendTransfer(provider.sender(), {
    value: toNano(2),
    fwdAmount: toNano(0.5),
    queryId: 9,
    jettonAmount: 1n,
    toAddress: orderDeployerAddress,
    forwardPayload: beginCell()
      .storeUint(0x26DE15E2, 32)
      .storeRef(beginCell()
        .storeAddress(jettonWalletMasterAddress)
        .storeUint(price, 32)
        .storeUint(Math.ceil(Date.now() / 1000) + 1000, 64)
        .endCell(),
      )
      .endCell()
      .asSlice(),
  });
}
