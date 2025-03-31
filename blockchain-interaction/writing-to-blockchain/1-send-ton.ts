import { mnemonicToWalletKey } from "@ton/crypto";
import {
  beginCell, Cell,
  comment,
  external,
  internal, loadTransaction,
  storeMessage,
  toNano,
  TonClient, Transaction,
  WalletContractV4,
  WalletContractV5R1,
} from "@ton/ton";
import { SendMode } from "@ton/core";

async function waitForTransaction(messageHash: Buffer, maxRetries = 12) {
  let retries = 0;
  while (retries < maxRetries) {
    console.log(`Waiting for transaction, retry ${retries}...`);
    retries += 1;
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response = await fetch(`https://testnet.tonapi.io/v2/blockchain/transactions/${messageHash.toString('hex')}`);
    if (!response.ok) {
      continue;
    }

    const result = await response.json();
    if (!result.raw) {
      continue;
    }

    return loadTransaction(Cell.fromHex(result.raw).beginParse());
  }

  throw new Error('Retries exceeded, transaction not found')
}

async function main() {
  const tonClient = new TonClient({
    endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
    apiKey: 'YOUR_API_KEY',
  });

  // Using mnemonic to derive public and private keys
  const mnemonic = "word1 word2".split(' ');
  const { publicKey, secretKey } = await mnemonicToWalletKey(mnemonic);

  // Creating wallet depending on version (v5r1 or v4), uncomment which version do you have
  const walletContract = WalletContractV4.create({ workchain: 0, publicKey });
  // const walletContract = WalletContractV5R1.create({ walletId: { networkGlobalId: -3 }, publicKey }); // networkGlobalId: -3 for testnet, -239 for mainnet

  // Opening wallet with tonClient, which allows to send messages to blockchain
  const wallet = tonClient.open(walletContract);

  // Retrieving seqno used for replay protection
  const seqno = await wallet.getSeqno();

  // Building transfer to wallet
  const transfer = wallet.createTransfer({
    seqno,
    secretKey,
    messages: [internal({
      to: wallet.address,
      body: comment('Hello from wallet!'),
      value: toNano(0.05),
    })],
    sendMode: SendMode.PAY_GAS_SEPARATELY | SendMode.IGNORE_ERRORS,
  });

  // Building external message to be sent to blockchain
  const externalMessage = external({
    to: wallet.address,
    body: transfer,
  });


  // Obtaining message hash
  const messageHash = beginCell()
    .store(storeMessage(externalMessage))
    .endCell()
    .hash();

  console.log(messageHash.toString('hex'));
  console.log(`https://testnet.tonviewer.com/transaction/${messageHash.toString('hex')}`);

  // Sending message to blockchain
  await tonClient.sendMessage(externalMessage);

  const transaction = await waitForTransaction(messageHash);
  console.log(transaction);
}

main();
