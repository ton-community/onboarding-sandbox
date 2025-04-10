import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano} from '@ton/core';
import { HelloWorld } from '../wrappers/HelloWorld';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('HelloWorld', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('HelloWorld');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let helloWorld: SandboxContract<HelloWorld>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        helloWorld = blockchain.openContract(
            HelloWorld.createFromConfig(
                {
                    id: 0,
                    ctxCounter: 0,
                    ctxCounterExt: 0n,
                },
                code
            )
        );

        deployer = await blockchain.treasury('deployer');

        const deployResult = await helloWorld.sendDeploy(deployer.getSender(), toNano('1.00'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: helloWorld.address,
            deploy: true,
            success: true,
        });
    });

    it('should correctly initialize and return the initial data', async () => {
        // Define the expected initial values (same as in beforeEach)
        const expectedConfig = {
            id: 0,
            counter: 0,
            counterExt: 0n
        };

        // Log the initial configuration values before verification
        console.log('Initial configuration values (before deployment):');
        console.log('- ID:', expectedConfig.id);
        console.log('- Counter:', expectedConfig.counter);
        console.log('- CounterExt:', expectedConfig.counterExt);

        console.log('Retrieved values after deployment:');
        // Verify counter value
        const counter = await helloWorld.getCounter();
        console.log('- Counter:', counter);
        expect(counter).toBe(expectedConfig.counter);

        // Verify ID value
        const id = await helloWorld.getID();
        console.log('- ID:', id);
        expect(id).toBe(expectedConfig.id);

        // Verify counterExt
        const [_, counterExt] = await helloWorld.getCounters();
        console.log('- CounterExt', counterExt);
        expect(counterExt).toBe(expectedConfig.counterExt);
    });

    it('should send an external message and update counter', async () => {
        const receiver = await blockchain.treasury('receiver');

        const receiverBalanceBefore = await receiver.getBalance();
        const [__, counterExtBefore] = await helloWorld.getCounters()
        const increase = 5;

        const result = await helloWorld.sendExternalIncrease({
            increaseBy: increase,
            value: toNano(0.05),
            addr: receiver.address,
            queryID: 0
        });

        expect(result.transactions).toHaveTransaction({
            from: undefined, // External messages have no 'from' address
            to: helloWorld.address,
            success: true,
        });

        expect(result.transactions).toHaveTransaction({
            from: helloWorld.address,
            to: receiver.address,
            success: true,
        });

        const receiverBalanceAfter = await receiver.getBalance();

        expect(receiverBalanceAfter).toBeGreaterThan(receiverBalanceBefore);
        const [_, counterExt] = await helloWorld.getCounters()
        expect(counterExtBefore + BigInt(increase)).toBe(counterExt);
    });

    it('should increase counter', async () => {
        const increaseTimes = 3;
        for (let i = 0; i < increaseTimes; i++) {
            console.log(`increase ${i + 1}/${increaseTimes}`);

            const increaser = await blockchain.treasury('increaser' + i);

            const counterBefore = await helloWorld.getCounter();

            console.log('counter before increasing', counterBefore);

            const increaseBy = Math.floor(Math.random() * 100);

            console.log('increasing by', increaseBy);

            const increaseResult = await helloWorld.sendIncrease(increaser.getSender(), {
                increaseBy,
                value: toNano('0.05'),
            });

            expect(increaseResult.transactions).toHaveTransaction({
                from: increaser.address,
                to: helloWorld.address,
                success: true,
            });

            const counterAfter = await helloWorld.getCounter();

            console.log('counter after increasing', counterAfter);

            expect(counterAfter).toBe(counterBefore + increaseBy);
        }
    });
});
