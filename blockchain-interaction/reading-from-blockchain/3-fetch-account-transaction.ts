import { Address, TonClient } from "@ton/ton";

async function main() {
  // Initializaing TON HTTP API Client
  const tonClient = new TonClient({
    endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
  });

  // Calling method on http api
  const transactions = await tonClient.getTransactions(
    Address.parse('0QD-SuoCHsCL2pIZfE8IAKsjc0aDpDUQAoo-ALHl2mje04A-'), // Address to fetch transactions
    {
      limit: 10,
      archival: true,
    },
  );

  const firstTx = transactions[0];
  const { inMessage } = firstTx;

  console.log('Timestamp:', firstTx.now);
  if (inMessage?.info?.type === 'internal') {
    console.log('Value:', inMessage.info.value.coins);
    console.log('Sender:', inMessage.info.src);
  }
}

main();
