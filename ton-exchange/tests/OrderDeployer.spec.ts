import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, Cell, toNano } from '@ton/core';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { JettonWallet } from '../wrappers/JettonWallet';
import { JettonMinter } from '../wrappers/JettonMinter';
import { Order } from '../wrappers/Order';
import { OrderDeployer } from '../wrappers/OrderDeployer';

describe('OrderDeployer', () => {
    let orderDeployerCode;
    let orderCode: Cell;
    let tonOrderCode: Cell;
    let jettonWalletCode: Cell;
    let jettonMinterCode: Cell;
  
    let firstJettonMinter: SandboxContract<JettonMinter>;
    let secondJettonMinter: SandboxContract<JettonMinter>;
  
    let blockchain: Blockchain;
  
    let deployer: SandboxContract<TreasuryContract>;
    let orderDeployer: SandboxContract<OrderDeployer>;
    let order: SandboxContract<Order>;
  
    let seller: SandboxContract<TreasuryContract>;
    let buyer: SandboxContract<TreasuryContract>;
  
    let orderDeployerJettonWallet: SandboxContract<JettonWallet>;
    let orderJettonWallet: SandboxContract<JettonWallet>;
    let sellerJettonWallet: SandboxContract<JettonWallet>;
    let buyerJettonWallet: SandboxContract<JettonWallet>;
    
    let jettonAmount = 10n;

    beforeAll(async () => {
        blockchain = await Blockchain.create();

        [orderDeployerCode, orderCode, tonOrderCode, jettonMinterCode, jettonWalletCode] = await Promise.all([
        compile('OrderDeployer'),
        compile('Order'),
        compile('TonOrder'),
        compile('JettonMinter'),
        compile('JettonWallet'),
        ]);
        deployer = await blockchain.treasury('deployer');
        seller = await blockchain.treasury('seller');
        buyer = await blockchain.treasury('buyer');

        orderDeployer = blockchain.openContract(OrderDeployer.createFromConfig({
            tonOrderCode,
            orderCode,
            jettonWalletCode,
            admin: deployer.address,
            orderId: 0,
          }, orderDeployerCode));
          firstJettonMinter = blockchain.openContract(JettonMinter.createFromConfig({
            jettonWalletCode,
            adminAddress: deployer.address,
            content: beginCell().storeStringTail('firstminter').endCell(),
          }, jettonMinterCode));
          await firstJettonMinter.sendDeploy(deployer.getSender(), toNano(0.25));
          await firstJettonMinter.sendMint(deployer.getSender(), {
            jettonAmount,
            queryId: 9,
            toAddress: seller.address,
            amount: toNano(1),
            value: toNano(2),
          });
          
          secondJettonMinter = blockchain.openContract(JettonMinter.createFromConfig({
            jettonWalletCode,
            adminAddress: deployer.address,
            content: beginCell().storeStringTail('secondminter').endCell(),
          }, jettonMinterCode));
          await secondJettonMinter.sendDeploy(deployer.getSender(), toNano(0.25));
          await secondJettonMinter.sendMint(deployer.getSender(), {
            jettonAmount,
            queryId: 9,
            toAddress: buyer.address,
            amount: toNano(1),
            value: toNano(2),
          });

          sellerJettonWallet = blockchain.openContract(JettonWallet.createFromAddress(await firstJettonMinter.getWalletAddress(seller.address)));
          buyerJettonWallet = blockchain.openContract(JettonWallet.createFromAddress(await secondJettonMinter.getWalletAddress(buyer.address)));
    });

    it('should deploy', async () => {
        const { transactions } = await orderDeployer.sendDeploy(deployer.getSender(), toNano(0.05));
        expect(transactions).toHaveTransaction({
            from: deployer.address,
            to: orderDeployer.address,
            deploy: true,
            success: true,
        });

        orderDeployerJettonWallet = blockchain.openContract(JettonWallet.createFromAddress(await firstJettonMinter.getWalletAddress(orderDeployer.address)));
    });

    it('should fill after deploy', async () => {
        const expirationTime = Math.ceil(Date.now() / 1000) + 1000;
        const side = 0;
        const price = 1;
    
        const result = await sellerJettonWallet.sendTransfer(seller.getSender(), {
          value: toNano(1),
          fwdAmount: toNano(0.6),
          queryId: 9,
          jettonAmount,
          toAddress: orderDeployer.address,
          forwardPayload: beginCell()
            .storeUint(0x26DE15E1, 32)
            .storeRef(beginCell()
              .storeAddress(firstJettonMinter.address) // base_jetton_address
              .storeAddress(secondJettonMinter.address) // quote_jetton_address
              .storeUint(side, 1)
              .storeUint(price, 32)
              .storeUint(expirationTime, 64)
              .endCell(),
            )
            .endCell()
            .asSlice(),
        });
        
        const { address: newOrderAddress } = await orderDeployer.getOrderAddress(0, 0);
        const orderJettonWalletAddress = await firstJettonMinter.getWalletAddress(newOrderAddress);
        const orderJettonWallet = blockchain.openContract(JettonWallet.createFromAddress(orderJettonWalletAddress));

        expect(result.transactions).toHaveTransaction({
        from: seller.address,
        to: sellerJettonWallet.address,
        success: true,
        });
        // expect(result.transactions).toHaveTransaction({
        //     from: orderDeployer.address,
        //     to: newOrderAddress,
        //     deploy: true,
        //     success: true,
        // });
        // expect(result.transactions).toHaveTransaction({
        // from: orderDeployerJettonWallet.address,
        // to: orderJettonWallet.address,
        // success: true,
        // });

        // const order = blockchain.openContract(Order.createFromAddress(newOrderAddress));
        // const orderData = await order.getOrderData();

        // expect(orderData.status).toEqual(2);
        // expect(orderData.price).toEqual(price);
        // expect(orderData.quantity).toEqual(Number(jettonAmount));
        // expect(orderData.expirationTime).toEqual(expirationTime);
    });
});
