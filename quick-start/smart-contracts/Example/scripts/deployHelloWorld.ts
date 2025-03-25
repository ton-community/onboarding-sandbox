import { toNano } from '@ton/core';
import { HelloWorld } from '../wrappers/HelloWorld';
import { CounterInternal } from '../wrappers/CounterInternal';
import { compile, NetworkProvider } from '@ton/blueprint';
import { mnemonicToWalletKey } from '@ton/crypto';

export async function run(provider: NetworkProvider) {
    const mnemonic = "table dizzy all reopen repeat tag august bid lunch purse able logic shuffle shoe ritual jacket dilemma cage dragon plunge arrange sister catalog impact".split(' '); // Insert your mnemonic
    const { publicKey, secretKey } = await mnemonicToWalletKey(mnemonic);

    const helloWorld = provider.open(
        HelloWorld.createFromConfig(
            {
                id: Math.floor(Math.random() * 10000),
                seqno: 0,
                publicKey: publicKey
            },
            await compile('HelloWorld')
        )
    );

    await helloWorld.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(helloWorld.address);

    const counterInternal = provider.open(
        await CounterInternal.fromInit(
            BigInt(Math.floor(Math.random() * 10000)),
            helloWorld.address
        )
    );

    await counterInternal.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(counterInternal.address);

    console.log('ID', await helloWorld.getID());
    console.log('ID', (await counterInternal.getId()).toString());
}
