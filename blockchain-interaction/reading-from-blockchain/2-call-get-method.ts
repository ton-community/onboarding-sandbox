import { Address, TonClient, TupleBuilder } from "@ton/ton";

async function main() {
  // Initializaing TON HTTP API Client
  const tonClient = new TonClient({
    endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
  });

  // Building optional get method parameters list
  const builder = new TupleBuilder();
  builder.writeAddress(Address.parse('0QD-SuoCHsCL2pIZfE8IAKsjc0aDpDUQAoo-ALHl2mje04A-'));

  const accountAddress = Address.parse('kQD0GKBM8ZbryVk2aESmzfU6b9b_8era_IkvBSELujFZPsyy')

  // Calling http api to run get method on specific contract
  const result = await tonClient.runMethod(
    accountAddress, // address to call get method on
    'get_wallet_address', // method name
    builder.build(), // optional params list
  );

  // Deserializing get method result
  const address = result.stack.readAddress();
  console.log(address.toRawString());
}

main();
