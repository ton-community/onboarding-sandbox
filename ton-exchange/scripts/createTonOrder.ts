import { Address, beginCell, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { JettonWallet } from '../wrappers/JettonWallet';

export async function run(provider: NetworkProvider) {
  const orderDeployerAddress = Address.parse('EQAVX6VNjJtqACarbHBdRYdKAK9XGH27jTnYuPchqY_Yebyp');
  const jettonWalletAddress = Address.parse('kQA8Q7m_pSNPr6FcqRYxllpAZv-0ieXy_KYER2iP195hBXiU');
  const jettonWalletMasterAddress = Address.parse('kQBWwN8SW6Rc_wHl3hnXYLTCWKPk3-VWtuhib3KMg0Wsqdbl');

  const jettonWallet = provider.open(JettonWallet.createFromAddress(jettonWalletAddress));

  await jettonWallet.sendTransfer(provider.sender(), {
    value: toNano(1),
    fwdAmount: toNano(0.2),
    queryId: 9,
    jettonAmount: 1n,
    toAddress: orderDeployerAddress,
    forwardPayload: beginCell()
      .storeAddress(jettonWalletMasterAddress)
      .storeUint(10, 32)
      .storeUint(Math.ceil(Date.now()/ 1000) + 1000, 64)
      .endCell()
      .asSlice(),
  });
}
