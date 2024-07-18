import {Blockchain, SandboxContract, TreasuryContract} from '@ton/sandbox';
import {beginCell, Cell, toNano} from '@ton/core';
import '@ton/test-utils';
import {compile} from '@ton/blueprint';
import {JettonWallet} from '../wrappers/JettonWallet';
import {JettonMinter} from '../wrappers/JettonMinter';
import {TonOrder} from '../wrappers/TonOrder';

const NORM_FACTOR = 10 ** 9;

describe('TonOrder', () => {
  let orderCode: Cell;
  let jettonWalletCode: Cell;
  let jettonMinterCode: Cell;

  let jettonMinter: SandboxContract<JettonMinter>;

  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>;

  let order: SandboxContract<TonOrder>;

  let seller: SandboxContract<TreasuryContract>;

  let deployerJettonWallet: SandboxContract<JettonWallet>;
  let sellerJettonWallet: SandboxContract<JettonWallet>;

  let orderJettonWallet: SandboxContract<JettonWallet>;

  const jettonAmount = 10n;

  beforeAll(async () => {
    blockchain = await Blockchain.create();

    [orderCode, jettonMinterCode, jettonWalletCode] = await Promise.all([
      compile('TonOrder'),
      compile('JettonMinter'),
      compile('JettonWallet'),
    ]);

    deployer = await blockchain.treasury('deployer');
    seller = await blockchain.treasury('seller');

    jettonMinter = blockchain.openContract(
      JettonMinter.createFromConfig(
        {
          jettonWalletCode,
          adminAddress: deployer.address,
          content: beginCell().storeStringTail('minter').endCell(),
        },
        jettonMinterCode
      )
    );

    await jettonMinter.sendDeploy(deployer.getSender(), toNano(0.25));

    await jettonMinter.sendMint(deployer.getSender(), {
      jettonAmount,
      queryId: 9,
      toAddress: deployer.address,
      amount: toNano(1),
      value: toNano(2),
    });

    deployerJettonWallet = blockchain.openContract(
      JettonWallet.createFromAddress(
        await jettonMinter.getWalletAddress(deployer.address)
      )
    );
    sellerJettonWallet = blockchain.openContract(
      JettonWallet.createFromAddress(
        await jettonMinter.getWalletAddress(seller.address)
      )
    );

    order = blockchain.openContract(
      TonOrder.createFromConfig(
        {
          status: 0,
          side: 0,
          quantity: 0,
          price: 0,
          deployerAddress: deployer.address,
          orderId: 1,
          orderCode,
          jettonWalletCode,
          expirationTime: 0,
        },
        orderCode
      )
    );

    orderJettonWallet = blockchain.openContract(
      JettonWallet.createFromAddress(
        await jettonMinter.getWalletAddress(order.address)
      )
    );
  });

  it('should deploy', async () => {
    const expirationTime = Math.ceil(Date.now() / 1000) + 1000;
    const side = 0;
    const price = 1.5 * NORM_FACTOR;

    const result = await order.sendDeploy(deployer.getSender(), toNano(1), {
      side,
      queryId: 9,
      expirationTime,
      price,
      quantity: Number(jettonAmount),
      jettonMasterAddress: jettonMinter.address,
      creatorAddress: seller.address,
    });

    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: order.address,
      deploy: true,
      success: true,
    });

    const orderData = await order.getOrderData();

    expect(orderData.status).toEqual(1);
    expect(orderData.creatorAddress).toEqualAddress(seller.address);
  });

  it('should initialize', async () => {
    await deployerJettonWallet.sendTransfer(deployer.getSender(), {
      queryId: 9,
      toAddress: order.address,
      value: toNano(1),
      fwdAmount: toNano(0.2),
      jettonAmount,
    });

    const orderData = await order.getOrderData();
    expect(orderData.status).toEqual(2);
  });

  it('should close', async () => {
    await order.sendClose(seller.getSender(), {
      value: toNano(1),
      queryId: 9,
    });

    const orderData = await order.getOrderData();
    expect(orderData.status).toEqual(3);

    const orderJettonAmount = await orderJettonWallet.getWalletJettonAmount();
    expect(orderJettonAmount).toEqual(0n);

    const sellerJettonAmount = await sellerJettonWallet.getWalletJettonAmount();
    expect(sellerJettonAmount).toEqual(jettonAmount);
  });
});
