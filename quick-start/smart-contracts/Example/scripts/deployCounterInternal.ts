import { toNano } from '@ton/core';
import { CounterInternal } from '../wrappers/CounterInternal';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const counterInternal = provider.open(
        CounterInternal.createFromConfig(
            {
                id: Math.floor(Math.random() * 10000),
                counter: 0,
            },
            await compile('CounterInternal')
        )
    );

    await counterInternal.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(counterInternal.address);

    console.log('ID', await counterInternal.getID());
}
