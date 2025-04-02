import { Address, TonClient } from "@ton/ton";

async function main() {
  // Initializaing TON HTTP API Client
  const tonClient = new TonClient({
    endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
  });

  const accountAddress = Address.parse('0QD-SuoCHsCL2pIZfE8IAKsjc0aDpDUQAoo-ALHl2mje04A-'); // Replace with any address

  // Calling method on http api
  const state = await tonClient.getContractState(accountAddress);


  console.log('State: ', state.state);
  console.log('Balance: ', state.balance);
  console.log('Data: ', state.data?.toString('hex'));
  console.log('Code: ', state.code?.toString('hex'));
}

main();
