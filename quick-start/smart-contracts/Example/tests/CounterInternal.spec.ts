import { Blockchain, SandboxContract, TreasuryContract} from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { CounterInternal } from '../wrappers/CounterInternal';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('CounterInternal', () => {
    let codeHelloWorld: Cell;
    let blockchain: Blockchain;
    let counterInternal: SandboxContract<CounterInternal>;
    let deployerCounter: SandboxContract<TreasuryContract>;

    beforeAll(async () => {
        codeHelloWorld = await compile('HelloWorld');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployerCounter = await blockchain.treasury('deployerCounter');

        // Deploy CounterInternal with HelloWorld as the owner
        counterInternal = blockchain.openContract(
            await CounterInternal.fromInit(0n, deployerCounter.address)
        );

        const deployResultCounter = await counterInternal.send(deployerCounter.getSender(), { value: toNano('1.00') }, {
            $$type: 'Deploy',
            queryId: 0n
        });

        expect(deployResultCounter.transactions).toHaveTransaction({
            from: deployerCounter.address,
            to: counterInternal.address,
            deploy: true,
            success: true
        });
    });

    it('should fail if not owner call increment', async () => {
        // Verify owner is correctly set to HelloWorld
        const ownerAddress = await counterInternal.getOwner();
        expect(ownerAddress.equals(deployerCounter.address)).toBe(true);

        // Get initial counter value
        const counterBefore = await counterInternal.getCounter();

        // Try to increase counter from a non-owner account (should fail)
        const nonOwner = await blockchain.treasury('nonOwner');
        const increaseBy = 5n;

        const nonOwnerResult = await counterInternal.send(nonOwner.getSender(), {
            value: toNano('0.05')
        }, {
            $$type: 'Add',
            amount: increaseBy,
            queryId: 0n
        });

        // This should fail since only the owner should be able to increment
        expect(nonOwnerResult.transactions).toHaveTransaction({
            from: nonOwner.address,
            to: counterInternal.address,
            success: false,
            exitCode: 132 // The error code thrown in the contract, Access Denied
        });

        // Counter should remain unchanged
        const counterAfterNonOwner = await counterInternal.getCounter();
        expect(counterAfterNonOwner).toBe(counterBefore);
    });
});
