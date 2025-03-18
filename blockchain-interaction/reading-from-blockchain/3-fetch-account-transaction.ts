import { Address, TonClient } from "@ton/ton";

async function main() {
  const tonClient = new TonClient({
    endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
  });

  const transactions = await tonClient.getTransactions(
    Address.parse('0QD-SuoCHsCL2pIZfE8IAKsjc0aDpDUQAoo-ALHl2mje04A-'), // Address to fetch transactions
    {
      limit: 10,
      archival: true,
    },
  );

  console.log(transactions[0]);
}

main();
