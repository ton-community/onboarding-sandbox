import {Address, beginCell, toNano} from '@ton/core';
import {NetworkProvider} from '@ton/blueprint';
import {JettonWallet} from '../wrappers/JettonWallet';

export async function run(provider: NetworkProvider) {
  const orderDeployerAddress = Address.parse(
    'kQDRbwMSDqwRKudj86hyK3KY0vYdFQmbdR2zg2JlC4tJs6TB'
  );

  const baseMasterAddress = Address.parse(
    'kQBWwN8SW6Rc_wHl3hnXYLTCWKPk3-VWtuhib3KMg0Wsqdbl'
  );
  const quoteMasterAddress = Address.parse(
    'kQCXIMgabnmqaEUspkO0XlSPS4t394YFBlIg0Upygyw3fuSL'
  );

  // kQBdLnykFt2Vbi7v5Gz7smM_quidjaqLzyD19b1QwUw54JPT -- GLEB'S Buy
  // kQDkPYFZC9w6h-_wZCZ959XBCv6IdLEFWMMqHTLcHFRc4_YH -- GLEB'S Sell
  const jettonWalletAddress = Address.parse(
    'kQDkPYFZC9w6h-_wZCZ959XBCv6IdLEFWMMqHTLcHFRc4_YH'
  );
  const jettonWallet = provider.open(
    JettonWallet.createFromAddress(jettonWalletAddress)
  );

  const price = 1;
  const side = 0;
  const queryId = 7;

  await jettonWallet.sendTransfer(provider.sender(), {
    value: toNano(1),
    fwdAmount: toNano(0.7),
    queryId,
    jettonAmount: toNano(1),
    toAddress: orderDeployerAddress,
    forwardPayload: beginCell()
      .storeUint(0x26de15e1, 32)
      .storeAddress(baseMasterAddress)
      .storeAddress(quoteMasterAddress)
      .storeUint(side, 1)
      .storeUint(price, 32)
      .storeUint(Math.ceil(Date.now() / 1000) + 1000, 64)
      .endCell(),
  });
}
