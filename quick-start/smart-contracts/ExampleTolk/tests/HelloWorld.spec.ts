import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
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
                    seqno: 0,
                    //it will be changed later, just initialization check
                    public_key: 0n
                },
                code
            )
        );

        deployer = await blockchain.treasury('deployer');

        const deployResult = await helloWorld.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: helloWorld.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and helloWorld are ready to use
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

    it('should correctly initialize and return the initial data', async () => {
        // Define the expected initial values (same as in beforeEach)
        const expectedConfig = {
            id: 0,
            seqno: 0,
            public_key: 0n
        };
    
        // Verify counter value
        const counter = await helloWorld.getCounter();
        expect(counter).toBe(expectedConfig.seqno);
    
        // Verify ID value
        const id = await helloWorld.getID();
        expect(id).toBe(expectedConfig.id);
    
        // Verify seqno and public_key values
        const [seqno, publicKey] = await helloWorld.getSeqnoPKey();
        expect(seqno).toBe(expectedConfig.seqno);
        expect(publicKey).toBe(expectedConfig.public_key);
    });
});
