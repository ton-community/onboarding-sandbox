import { toNano } from '@ton/core';
import { CounterInternal } from '../wrappers/CounterInternal';
import { NetworkProvider } from '@ton/blueprint';
import { Address } from '@ton/core';

export async function run(provider: NetworkProvider) {
    const counterInternal = provider.open(
        await CounterInternal.fromInit(
            BigInt(Math.floor(Math.random() * 10000)),
            Address.parse("kQDW2lkFHPO_EWAsWI90MdvqU5fr8tiELbbcfaA8FmSkMVJ8") //just a random address
        ),
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

    console.log('ID', await counterInternal.getId());
}
