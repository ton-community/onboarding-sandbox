import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type OrderDeployerConfig = {
  admin: Address;
  orderId: number;
  orderCode: Cell;
  jettonWalletCode: Cell;
};

export type GetOrderDeployerData = Omit<OrderDeployerConfig, 'orderCode' | 'jettonWalletCode'> & {
  orderCode: string;
  jettonWalletCode: string
}

export function orderDeployerConfigToCell(config: OrderDeployerConfig): Cell {
  return beginCell()
    .storeAddress(config.admin)
    .storeUint(config.orderId, 32)
    .storeRef(config.orderCode)
    .storeRef(config.jettonWalletCode)
    .endCell();
}

export class OrderDeployer implements Contract {
  constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
  }

  static createFromConfig(config: OrderDeployerConfig, code: Cell, workchain = 0) {
    const data = orderDeployerConfigToCell(config);
    const init = { code, data };
    return new OrderDeployer(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async getOrderDeployerData(provider: ContractProvider): Promise<GetOrderDeployerData> {
    const res = await provider.get('get_order_deployer_data', []);
    return {
      admin: res.stack.readAddress(),
      orderId: res.stack.readNumber(),
      orderCode: res.stack.readCell().toString(''),
      jettonWalletCode: res.stack.readCell().toString(''),
    };
  }

  async getOrderAddress(provider: ContractProvider, orderId: number): Promise<{ address: Address }> {
    const res = await provider.get('get_order_address', [{ type: 'int', value: BigInt(orderId) }]);
    return {
      address: res.stack.readAddress(),
    };
  }
}
