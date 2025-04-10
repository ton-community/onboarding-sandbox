import { mnemonicToWalletKey } from "@ton/crypto";
import { Address, beginCell, comment, internal, JettonMaster, toNano, TonClient, WalletContractV5R1 } from "@ton/ton";
import { SendMode } from "@ton/core";


async function main() {
  const tonClient = new TonClient({
    endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
    apiKey: 'YOUR_API_KEY',
  });
  const mnemonic = "word1 word2 ...".split(' '); // Insert your mnemonic
  const { publicKey, secretKey } = await mnemonicToWalletKey(mnemonic);
  const walletContract = WalletContractV5R1.create({ walletId: { networkGlobalId: -3 }, publicKey });
  const wallet = tonClient.open(walletContract);
  const seqno = await wallet.getSeqno();

  const nftTransferBody = beginCell()
    .storeUint(0x5fcc3d14, 32) // opcode for nft transfer
    .storeUint(0, 64) // query id
    .storeAddress(wallet.address) // address to transfer ownership to
    .storeAddress(wallet.address) // response destination
    .storeBit(0) // no custom payload
    .storeCoins(1) // forward amount - if >0, will send notification message
    .storeMaybeRef(comment('Hello from NFT!'))
    .endCell();

  const nftAddress = Address.parse('kQDhZVC5LyJNzS_YPwGMq0zaP7oyqbwuA6oyotd73HbfJSy9'); // NFT Address may be obtained after deploying NFT Item

  // Sending NFT transfer
  await wallet.sendTransfer({
    seqno,
    secretKey,
    messages: [internal({
      to: nftAddress,
      body: nftTransferBody,
      value: toNano(0.05),
    })],
    sendMode: SendMode.PAY_GAS_SEPARATELY | SendMode.IGNORE_ERRORS,
  });
}

main();
