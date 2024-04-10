import { Address, beginCell, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { JettonWallet } from '../wrappers/JettonWallet';

export async function run(provider: NetworkProvider) {
  const orderAddress = Address.parse('kQB4bC19cqS8pnamBeJ2AAEBavH4-viTbMf7GNiT1rd0QJ0p');

  // kQBdLnykFt2Vbi7v5Gz7smM_quidjaqLzyD19b1QwUw54JPT -- GLEB'S LUPA
  // kQDkPYFZC9w6h-_wZCZ959XBCv6IdLEFWMMqHTLcHFRc4_YH -- GLEB'S VUP
  const jettonWalletAddress = Address.parse('kQBdLnykFt2Vbi7v5Gz7smM_quidjaqLzyD19b1QwUw54JPT');
  const jettonWallet = provider.open(JettonWallet.createFromAddress(jettonWalletAddress));


  const price = 5;
  const side = 1;
  const query_id = 9;

  await jettonWallet.sendTransfer(provider.sender(), {
    value: toNano(1),
    fwdAmount: toNano(0.7),
    queryId: query_id,
    jettonAmount: toNano(300n),
    toAddress: orderAddress,
    forwardPayload: beginCell()
          .storeUint(side, 1)
          .storeUint(price, 32)
      .endCell()
      .asSlice(),
  });
}
