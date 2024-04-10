import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
import { Maybe } from "@ton/ton/dist/utils/maybe";

export type OrderConfig = {
  status: number;
  baseJettonAddress?: Maybe<Address>;
  quoteJettonAddress?: Maybe<Address>;
  side: number;
  quantity: number;
  price: number;
  deployerAddress: Address;
  creatorAddress?: Maybe<Address>;
  walletAddress?: Maybe<Address>;
  orderId: number;
  orderCode: Cell;
  jettonWalletCode: Cell;
  expirationTime: number;
};

function orderConfigToCell(config: OrderConfig): Cell {
  return beginCell()
    .storeUint(config.status, 3)
    .storeRef(beginCell()
      .storeAddress(config.baseJettonAddress)
      .storeAddress(config.quoteJettonAddress)
      .endCell())
    .storeUint(config.side, 1)
    .storeUint(config.quantity, 64)
    .storeUint(config.price, 32)
    .storeUint(config.orderId, 32)
    .storeAddress(config.deployerAddress)
    .storeAddress(config.creatorAddress)
    .storeAddress(config.walletAddress)
    .storeRef(config.orderCode)
    .storeRef(config.jettonWalletCode)
    .storeUint(config.expirationTime, 64)
    .endCell();
}

export class Order implements Contract {
  constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
  }

  static createFromAddress(address: Address) {
    return new Order(address);
  }

  static createFromConfig(config: OrderConfig, code: Cell, workchain = 0) {
    const data = orderConfigToCell(config);
    const init = { code, data };
    return new Order(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint, {
    queryId,
    creatorAddress,
  }: {
    queryId: number,
    creatorAddress: Address
  }) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(0x25DE17E2, 32)
        .storeUint(queryId, 64)
        .storeAddress(creatorAddress)
        .endCell(),
    });
  }

  async getOrderData(provider: ContractProvider) {
    const { stack } = await provider.get('get_order_data', []);

    const status = stack.readNumber();
    const baseWalletAddress = stack.readAddressOpt();
    const quoteWalletAddress = stack.readAddressOpt();
    const side = stack.readNumber();
    const quantity = stack.readNumber();
    const price = stack.readNumber();
    const orderId = stack.readNumber();
    const deployerAddress = stack.readAddressOpt();
    const creatorAddress = stack.readAddressOpt();
    const walletAddress = stack.readAddressOpt();
    const orderCode = stack.readCell();
    const jettonWalletCode = stack.readCell();
    const expirationTime = stack.readNumber();

    return {
      status,
      baseWalletAddress,
      quoteWalletAddress,
      side,
      quantity,
      price,
      orderId,
      deployerAddress,
      creatorAddress,
      walletAddress,
      orderCode,
      jettonWalletCode,
      expirationTime,
    };
  }

  async getState(provider: ContractProvider) {
    return provider.getState();
  }
}
