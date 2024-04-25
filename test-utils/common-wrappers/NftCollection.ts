import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  StateInit,
  toNano,
  TupleBuilder,
} from '@ton/core';
import { NftItem } from './NftItem';

export type NftCollectionConfig = {
  ownerAddress: Address;
  nextItemIndex?: number;
  content?: Cell;
  nftItemCode?: Cell;
  royaltyParams?: Cell;
};

export class NftCollection implements Contract {
  static readonly code = Cell.fromBase64(
    'te6ccgECEwEAAf4AART/APSkE/S88sgLAQIBYgIDAgLNBAUCASANDgPr0QY4BIrfAA6GmBgLjYSK3wfSAYAOmP6Z/2omh9IGmf6mpqGEEINJ6cqClAXUcUG6+CgOhBCFRlgFa4QAhkZYKoAueLEn0BCmW1CeWP5Z+A54tkwCB9gHAbKLnjgvlwyJLgAPGBEuABcYEZAmAB8YEvgsIH+XhAYHCAIBIAkKAGA1AtM/UxO78uGSUxO6AfoA1DAoEDRZ8AaOEgGkQ0PIUAXPFhPLP8zMzMntVJJfBeIApjVwA9QwjjeAQPSWb6UgjikGpCCBAPq+k/LBj96BAZMhoFMlu/L0AvoA1DAiVEsw8AYjupMCpALeBJJsIeKz5jAyUERDE8hQBc8WE8s/zMzMye1UACgB+kAwQUTIUAXPFhPLP8zMzMntVAIBIAsMAD1FrwBHAh8AV3gBjIywVYzxZQBPoCE8trEszMyXH7AIAC0AcjLP/gozxbJcCDIywET9AD0AMsAyYAAbPkAdMjLAhLKB8v/ydCACASAPEAAlvILfaiaH0gaZ/qamoYLehqGCxABDuLXTHtRND6QNM/1NTUMBAkXwTQ1DHUMNBxyMsHAc8WzMmAIBIBESAC+12v2omh9IGmf6mpqGDYg6GmH6Yf9IBhAALbT0faiaH0gaZ/qamoYCi+CeAI4APgCw',
  );

  static readonly OPCODES = {
    DEPLOY_NFT: 1,
    BATCH_DEPLOY_NFT: 2,
  };

  static configToCell(config: NftCollectionConfig): Cell {
    return beginCell()
      .storeAddress(config.ownerAddress)
      .storeUint(config.nextItemIndex ?? 0, 64)
      .storeRef(config.content ?? beginCell().storeRef(new Cell()))
      .storeRef(config.nftItemCode ?? NftItem.code)
      .storeRef(config.royaltyParams ?? Cell.EMPTY)
      .endCell();
  }

  static createFromAddress(address: Address) {
    return new NftCollection(address);
  }

  static createFromConfig(
    config: NftCollectionConfig,
    code: Cell,
    workchain = 0,
  ) {
    const data = NftCollection.configToCell(config);
    const init = { code, data };
    return new NftCollection(contractAddress(workchain, init), init);
  }

  constructor(
    readonly address: Address,
    readonly init?: StateInit,
  ) {
  }

  async sendDeployNft(
    provider: ContractProvider,
    via: Sender,
    opts: {
      to: Address;
      queryId: number;
      index: number;
      value: bigint;
      itemValue?: bigint;
      content?: Cell;
    },
  ) {
    await provider.internal(via, {
      value: opts.value,
      body: beginCell()
        .storeUint(NftCollection.OPCODES.DEPLOY_NFT, 32)
        .storeUint(opts.queryId, 64)
        .storeUint(opts.index, 64)
        .storeCoins(opts.itemValue ?? toNano('0.02'))
        .storeRef(
          beginCell()
            .storeAddress(opts.to)
            .storeRef(opts.content ?? Cell.EMPTY),
        )
        .endCell(),
    });
  }

  async getRoyaltyParams(provider: ContractProvider): Promise<{
    royaltyFactor: number;
    royaltyBase: number;
    royaltyAddress: Address;
  }> {
    const { stack } = await provider.get('royalty_params', []);

    return {
      royaltyFactor: stack.readNumber(),
      royaltyBase: stack.readNumber(),
      royaltyAddress: stack.readAddress(),
    };
  }

  async getNftAddressByIndex(
    provider: ContractProvider,
    index: number,
  ): Promise<Address> {
    const builder = new TupleBuilder();
    builder.writeNumber(index);

    const { stack } = await provider.get(
      'get_nft_address_by_index',
      builder.build(),
    );

    return stack.readAddress();
  }

  async getCollectionData(provider: ContractProvider): Promise<{
    nextItemIndex: number;
    collectionContent: Cell;
    ownerAddress: Address;
  }> {
    const { stack } = await provider.get('get_collection_data', []);
    return {
      nextItemIndex: stack.readNumber(),
      collectionContent: stack.readCell(),
      ownerAddress: stack.readAddress(),
    };
  }
}
