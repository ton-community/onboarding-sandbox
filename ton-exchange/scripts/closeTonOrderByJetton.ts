import {Address, toNano} from '@ton/core';
import {NetworkProvider} from '@ton/blueprint';
import {JettonWallet} from '../wrappers/JettonWallet';

export async function run(provider: NetworkProvider) {
  const orderAddress = Address.parse(
    'kQAcQnHPrttTdBd4ixK0eKADEAu7RaoUIU_CdMmxamfN1FVL'
  );
  const jettonWalletAddress = Address.parse(
    'kQD8tWAMJm8SxhFROlgTErqGlNJf1a9TOIwBjUCe_00qUYqj'
  );

  const jettonWallet = provider.open(
    JettonWallet.createFromAddress(jettonWalletAddress)
  );

  await jettonWallet.sendTransfer(provider.sender(), {
    value: toNano(1),
    fwdAmount: toNano(0.9),
    queryId: 9,
    jettonAmount: toNano(0.5),
    toAddress: orderAddress,
  });
}
