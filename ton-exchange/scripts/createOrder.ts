import { Address, beginCell, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { JettonWallet } from '../wrappers/JettonWallet';

export async function run(provider: NetworkProvider) {
  const orderDeployerAddress = Address.parse('kQBeZHv7yg2PlBU-r00hn7fvGyevlr24id9lirSlfTXf5Ojb');
  
  const baseMasterAddress = Address.parse('kQBWwN8SW6Rc_wHl3hnXYLTCWKPk3-VWtuhib3KMg0Wsqdbl');
  const quoteMasterAddress = Address.parse('kQCXIMgabnmqaEUspkO0XlSPS4t394YFBlIg0Upygyw3fuSL');

  // kQBdLnykFt2Vbi7v5Gz7smM_quidjaqLzyD19b1QwUw54JPT -- GLEB'S LUPA
  // kQDkPYFZC9w6h-_wZCZ959XBCv6IdLEFWMMqHTLcHFRc4_YH -- GLEB'S VUP
  const jettonWalletAddress = Address.parse('kQDkPYFZC9w6h-_wZCZ959XBCv6IdLEFWMMqHTLcHFRc4_YH');
  const jettonWallet = provider.open(JettonWallet.createFromAddress(jettonWalletAddress));

  const price = 5;
  const side = 0;
  const queryId = 10;

  await jettonWallet.sendTransfer(provider.sender(), {
    value: toNano(1),
    fwdAmount: toNano(0.7),
    queryId,
    jettonAmount: toNano(100n),
    toAddress: orderDeployerAddress,
    forwardPayload: beginCell()
      .storeUint(0x26DE15E1, 32)
      .storeRef(beginCell()
          .storeAddress(baseMasterAddress)
          .storeAddress(quoteMasterAddress)
          .storeUint(side, 1)
          .storeUint(price, 32)
          .storeUint(Math.ceil(Date.now() / 1000) + 1000, 64)
          .endCell(),
        )
      .endCell()
      .asSlice(),
  });
}
