import {Address, beginCell, toNano} from '@ton/core';
import {NetworkProvider} from '@ton/blueprint';
import {JettonWallet} from '../wrappers/JettonWallet';

export async function run(provider: NetworkProvider) {
  const orderAddress = Address.parse(
    'kQCzU_5TtdZPMZ5tbzBbxLVbk6tL77RgIdbryEa6FVX-8Tn5'
  );

  // kQBdLnykFt2Vbi7v5Gz7smM_quidjaqLzyD19b1QwUw54JPT -- Buy
  // kQDkPYFZC9w6h-_wZCZ959XBCv6IdLEFWMMqHTLcHFRc4_YH -- Sell
  const jettonWalletAddress = Address.parse(
    'kQBdLnykFt2Vbi7v5Gz7smM_quidjaqLzyD19b1QwUw54JPT'
  );
  const jettonWallet = provider.open(
    JettonWallet.createFromAddress(jettonWalletAddress)
  );

  const price = 1;
  const side = 1;
  const queryId = 9;

  await jettonWallet.sendTransfer(provider.sender(), {
    value: toNano(1),
    fwdAmount: toNano(0.7),
    queryId,
    jettonAmount: toNano(1n),
    toAddress: orderAddress,
    forwardPayload: beginCell()
      .storeUint(side, 1)
      .storeUint(price, 32)
      .endCell(),
  });
}
