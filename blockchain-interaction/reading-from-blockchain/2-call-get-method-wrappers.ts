import { Address, JettonMaster, TonClient } from "@ton/ton";

async function main() {
  // Initializaing TON HTTP API Client
  const tonClient = new TonClient({
    endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
  });

  // Initializing wrappers
  const jettonMaster = tonClient.open(
    JettonMaster.create(Address.parse('kQD0GKBM8ZbryVk2aESmzfU6b9b_8era_IkvBSELujFZPsyy')),
  );

  // Calling get method through wrapper
  const address = jettonMaster.getWalletAddress(Address.parse('0QD-SuoCHsCL2pIZfE8IAKsjc0aDpDUQAoo-ALHl2mje04A-'));
  console.log(address);
}

main();
