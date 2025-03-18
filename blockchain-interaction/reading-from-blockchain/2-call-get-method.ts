import { Address, TonClient, TupleBuilder } from "@ton/ton";

async function main() {
  const tonClient = new TonClient({
    endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
  });

  // Building optional get method parameters list
  const builder = new TupleBuilder();
  builder.writeAddress(Address.parse('0QD-SuoCHsCL2pIZfE8IAKsjc0aDpDUQAoo-ALHl2mje04A-'));

  const result = await tonClient.runMethod(
    Address.parse('kQD0GKBM8ZbryVk2aESmzfU6b9b_8era_IkvBSELujFZPsyy'), // address to call get method on
    'get_wallet_address', // method name
    builder.build(), // optional params list
  );

  // deserializing get method result
  const address = result.stack.readAddress();
  console.log(address);
}

main();
