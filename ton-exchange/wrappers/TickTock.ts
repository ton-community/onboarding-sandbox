import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
import { SandboxContractProvider, TickOrTock } from '@ton/sandbox';

export type TickTockConfig = {
  creatorAddress: Address;
  endTimeTs: number;
};


export class TickTock implements Contract {
  constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
  }

  static configToCell(config: TickTockConfig): Cell {
    return beginCell()
      .storeAddress(config.creatorAddress)
      .storeUint(config.endTimeTs, 64)
      .endCell();
  }

  static createFromConfig(config: TickTockConfig, code: Cell, workchain = 0) {
    const data = this.configToCell(config);
    const init = { code, data };
    return new TickTock(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendTickTock(provider: SandboxContractProvider, which: TickOrTock) {
    return provider.tickTock(which);
  }
}
