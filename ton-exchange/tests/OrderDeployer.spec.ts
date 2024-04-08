import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, Address } from '@ton/core';
import { OrderDeployer } from '../wrappers/OrderDeployer';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('OrderDeployer', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('OrderDeployer');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let orderDeployer: SandboxContract<OrderDeployer>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        orderDeployer = blockchain.openContract(OrderDeployer.createFromConfig({
            admin: Address.parse('0QA__NJI1SLHyIaG7lQ6OFpAe9kp85fwPr66YwZwFc0p5wIu'),
            orderId: 0,
            orderCode: await compile('Order'),
            jettonWalletCode: await compile('JettonWallet'),
          }, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await orderDeployer.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: orderDeployer.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and orderDeployer are ready to use
    });
});
