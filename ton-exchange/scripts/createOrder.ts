import { Address, beginCell, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { JettonWallet } from '../wrappers/JettonWallet';
import { JettonMaster } from "@ton/ton";

export async function run(provider: NetworkProvider) {
  const orderDeployerAddress = Address.parse('EQATby-1OvzljIFtUY0sToBL9NJf5vOf9eAAY0PiL6E-CDiI');

  const baseMasterAddress = Address.parse('kQBWwN8SW6Rc_wHl3hnXYLTCWKPk3-VWtuhib3KMg0Wsqdbl');
  const quoteMasterAddress = Address.parse('kQCXIMgabnmqaEUspkO0XlSPS4t394YFBlIg0Upygyw3fuSL');

  // kQCvzhBVhVCbZVjXffimgqOGdNTMgTx4I9oCdTfAa76fb3hc -- GLEB'S LUPA
  // kQA8Q7m_pSNPr6FcqRYxllpAZv-0ieXy_KYER2iP195hBXiU -- GLEB'S VUP
  const jettonWalletAddress = Address.parse('kQA8Q7m_pSNPr6FcqRYxllpAZv-0ieXy_KYER2iP195hBXiU');
  const jettonWallet = provider.open(JettonWallet.createFromAddress(jettonWalletAddress));

  const price = 5;
  const side = 0;
  const queryId = 10;

  await jettonWallet.sendTransfer(provider.sender(), {
    value: toNano(1),
    fwdAmount: toNano(0.7),
    queryId,
    jettonAmount: toNano(1),
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
