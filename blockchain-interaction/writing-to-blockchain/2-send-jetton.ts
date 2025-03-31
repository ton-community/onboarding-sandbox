import { mnemonicToWalletKey } from "@ton/crypto";
import { Address, beginCell, comment, internal, JettonMaster, toNano, TonClient, WalletContractV5R1 } from "@ton/ton";
import { SendMode } from "@ton/core";


async function main() {
  const tonClient = new TonClient({
    endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
    apiKey: 'YOUR_API_KEY',
  });

  // Using mnemonic to derive public and private keys
  const mnemonic = "word1 word2 ...".split(' ');
  const { publicKey, secretKey } = await mnemonicToWalletKey(mnemonic);

  const walletContract = WalletContractV5R1.create({ walletId: { networkGlobalId: -3 }, publicKey }); // networkGlobalId: -3 for testnet, -239 for mainnet

  // Opening wallet with tonClient, which allows to send messages to blockchain
  const wallet = tonClient.open(walletContract);

  // Retrieving seqno used for replay protection
  const seqno = await wallet.getSeqno();

  const jettonTransferBody = beginCell()
    .storeUint(0x0f8a7ea5, 32) // opcode for jetton transfer
    .storeUint(0, 64) // query id
    .storeCoins(1000000) // jetton amount in minimal values. Note, that USDt has 6 decimals, so 1000000 is 1 USDt on UI
    .storeAddress(wallet.address) // destination address to transfer
    .storeAddress(wallet.address) // response destination
    .storeBit(0) // no custom payload
    .storeCoins(1) // forward amount - if >0, will send notification message
    .storeMaybeRef(comment('Hello from jetton!'))
    .endCell();

  const jettonMasterAddress = Address.parse('kQD0GKBM8ZbryVk2aESmzfU6b9b_8era_IkvBSELujFZPsyy'); // If testnet USDt is used this is master address

  const jettonMaster = tonClient.open(JettonMaster.create(jettonMasterAddress));
  const myJettonWalletAddress = await jettonMaster.getWalletAddress(wallet.address);

  // Sending transfer to jetton wallet
  await wallet.sendTransfer({
    seqno,
    secretKey,
    messages: [internal({
      to: myJettonWalletAddress,
      body: jettonTransferBody,
      value: toNano(0.05),
    })],
    sendMode: SendMode.PAY_GAS_SEPARATELY | SendMode.IGNORE_ERRORS,
  });
}

main();
