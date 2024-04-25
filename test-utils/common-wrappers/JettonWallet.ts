import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
  Slice,
  StateInit,
} from '@ton/core';
import { Maybe } from '@ton/core/dist/utils/maybe';

export type JettonWalletConfig = {
  ownerAddress: Address;
  minterAddress: Address;
  walletCode: Cell;
};

export class JettonWallet implements Contract {
  static readonly code = Cell.fromBase64(
    'te6ccgECIQEABIQAAlOEVJLUBMyoEngAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAgEDAMADART/APSkE/S88sgLEQIBIAQFAUO/8ILrZjtXoAGS9KasRnKI3y3+3bnaG+4o9lIci+vSHx7ABgIBIAcIAEQAaHR0cHM6Ly9ncmFtY29pbi5vcmcvaW1nL2ljb24ucG5nAgEgCQoCASANDgFBv0VGpv/ht5z92GutPbh0MT3N4vsF5qdKp/NVLZYXx50TCwFBv27U+UKnhIziywZrd6ESjGof+MQ/Q4otziRhK6n/q4sDDAAKAEdyYW0ACgBHUkFNAUG/Ugje9G9aHU+dzmarMJ9KhRMF8Wb5Hvedkj71jjT5ogkPAUG/XQH6XjwGkBxFBGxrLdzqWvdk/qDu1yoQ1ATyMSzrJH0QAFoAVGhlIGZpcnN0LWV2ZXIgUG9XIGpldHRvbiBvbiBUT04gQmxvY2tjaGFpbi4ABAA5AgFiEhMCAswUFQAboPYF2omh9AH0gfSBqGECAdQWFwIBIBgZAMMIMcAkl8E4AHQ0wMBcbCVE18D8Azg+kD6QDH6ADFx1yH6ADH6ADBzqbQAAtMfghAPin6lUiC6lTE0WfAJ4IIQF41FGVIgupYxREQD8ArgNYIQWV8HvLqTWfAL4F8EhA/y8IAARPpEMHC68uFNgAgEgGhsAg9QBBrkPaiaH0AfSB9IGoYAmmPwQgLxqKMqRBdQQg97svvCd0JWPlxYumfmP0AGAnQKBHkKAJ9ASxniwDni2Zk9qpAHxUD0z/6APpAIfAB7UTQ+gD6QPpA1DBRNqFSKscF8uLBKML/8uLCVDRCcFQgE1QUA8hQBPoCWM8WAc8WzMkiyMsBEvQA9ADLAMkg+QBwdMjLAsoHy//J0AT6QPQEMfoAINdJwgDy4sR3gBjIywVQCM8WcPoCF8trE8yBwCASAdHgCeghAXjUUZyMsfGcs/UAf6AiLPFlAGzxYl+gJQA88WyVAFzCORcpFx4lAIqBOgggnJw4CgFLzy4sUEyYBA+wAQI8hQBPoCWM8WAc8WzMntVAL3O1E0PoA+kD6QNQwCNM/+gBRUaAF+kD6QFNbxwVUc21wVCATVBQDyFAE+gJYzxYBzxbMySLIywES9AD0AMsAyfkAcHTIywLKB8v/ydBQDccFHLHy4sMK+gBRqKGCCJiWgGa2CKGCCJiWgKAYoSeXEEkQODdfBOMNJdcLAYB8gANc7UTQ+gD6QPpA1DAH0z/6APpAMFFRoVJJxwXy4sEnwv/y4sIFggkxLQCgFrzy4sOCEHvdl97Iyx8Vyz9QA/oCIs8WAc8WyXGAGMjLBSTPFnD6AstqzMmAQPsAQBPIUAT6AljPFgHPFszJ7VSAAcFJ5oBihghBzYtCcyMsfUjDLP1j6AlAHzxZQB88WyXGAEMjLBSTPFlAG+gIVy2oUzMlx+wAQJBAjAHzDACPCALCOIYIQ1TJ223CAEMjLBVAIzxZQBPoCFstqEssfEss/yXL7AJM1bCHiA8hQBPoCWM8WAc8WzMntVA==',
  );

  static readonly OPCODES = {
    TRANSFER: 0xf8a7ea5,
    BURN: 0x595f07bc,
  };

  static configToCell(config: JettonWalletConfig): Cell {
    return beginCell()
      .storeCoins(0)
      .storeAddress(config.ownerAddress)
      .storeAddress(config.minterAddress)
      .storeRef(config.walletCode)
      .endCell();
  }

  constructor(
    readonly address: Address,
    readonly init?: Maybe<StateInit>,
  ) {
  }

  static createFromAddress(address: Address) {
    return new JettonWallet(address);
  }

  static createFromConfig(
    config: JettonWalletConfig,
    code: Cell = JettonWallet.code,
    workchain = 0,
  ) {
    const data = JettonWallet.configToCell(config);
    const init = { code, data };
    return new JettonWallet(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendTransfer(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      toAddress: Address;
      queryId: number;
      fwdAmount: bigint;
      jettonAmount: bigint;
      forwardPayload?: Maybe<Cell | Slice>;
    },
  ) {
    const builder = beginCell()
      .storeUint(JettonWallet.OPCODES.TRANSFER, 32)
      .storeUint(opts.queryId, 64)
      .storeCoins(opts.jettonAmount)
      .storeAddress(opts.toAddress)
      .storeAddress(via.address)
      .storeUint(0, 1)
      .storeCoins(opts.fwdAmount);

    if (opts.forwardPayload instanceof Slice) {
      builder.storeSlice(opts.forwardPayload);
    } else {
      builder.storeMaybeRef(opts.forwardPayload);
    }

    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: builder.endCell(),
    });
  }

  async sendBurn(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      queryId: number;
      jettonAmount: bigint;
    },
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(JettonWallet.OPCODES.BURN, 32)
        .storeUint(opts.queryId, 64)
        .storeCoins(opts.jettonAmount)
        .storeAddress(via.address)
        .storeUint(0, 1)
        .endCell(),
    });
  }

  async getWalletData(provider: ContractProvider): Promise<{
    balance: bigint;
    ownerAddress: Address;
    jettonMasterAddress: Address;
    jettonWalletCode: Cell;
  }> {
    const { stack } = await provider.get('get_wallet_data', []);

    return {
      balance: stack.readBigNumber(),
      ownerAddress: stack.readAddress(),
      jettonMasterAddress: stack.readAddress(),
      jettonWalletCode: stack.readCell(),
    };
  }
}
