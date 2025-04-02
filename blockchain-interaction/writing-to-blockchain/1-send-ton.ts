import { mnemonicToWalletKey } from "@ton/crypto";
import { comment, internal, toNano, TonClient, WalletContractV4, WalletContractV5R1 } from "@ton/ton";
import { SendMode } from "@ton/core";

async function main() {
  // Initializing tonClient for sending messages to blockchain
  const tonClient = new TonClient({
    endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
    apiKey: 'YOUR_API_KEY',
  });

  // Using mnemonic to derive public and private keys
  const mnemonic = "lonely kitchen armed visual midnight anchor pottery include force banana mosquito inflict fabric bike leaf differ text coil volcano seed dash amateur black welcome".split(' ');
  const { publicKey, secretKey } = await mnemonicToWalletKey(mnemonic);

  // Creating wallet depending on version (v5r1 or v4), uncomment which version do you have
  const walletContract = WalletContractV4.create({ workchain: 0, publicKey });
  // const walletContract = WalletContractV5R1.create({ walletId: { networkGlobalId: -3 }, publicKey }); // networkGlobalId: -3 for testnet, -239 for mainnet

  // Opening wallet with tonClient, which allows to send messages to blockchain
  const wallet = tonClient.open(walletContract);

  // Retrieving seqno used for replay protection
  const seqno = await wallet.getSeqno();

  // Sending transfer
  await wallet.sendTransfer({
    seqno,
    secretKey,
    messages: [internal({
      to: wallet.address, // Transfer will be made to the same wallet address
      body: comment('Hello from wallet!'), // Transfer will contain comment
      value: toNano(0.05), // Amount of TON, attached to transfer
    })],
    sendMode: SendMode.PAY_GAS_SEPARATELY | SendMode.IGNORE_ERRORS,
  });
}

main();
