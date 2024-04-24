import asyncio
from typing import AsyncGenerator, Literal, Optional

from pytoniq_core import Address, Cell, begin_cell
from pytoniq import LiteBalancer
import time

import contextlib

from pytoniq.contract.wallets.wallet import WalletV4R2


ORDER_DEPLOYER_ADDRESS = "EQBuObr2M7glm08w6cBGjIuuCbmvBFGwuVs6qb3AQpac9Xpf"
BASE_MASTER_ADDRESS = Address("kQBWwN8SW6Rc_wHl3hnXYLTCWKPk3-VWtuhib3KMg0Wsqdbl")
QUOTE_MASTER_ADDRESS = "kQCXIMgabnmqaEUspkO0XlSPS4t394YFBlIg0Upygyw3fuSL"
JETTON_WALLET_ADDRESS = "kQDkPYFZC9w6h-_wZCZ959XBCv6IdLEFWMMqHTLcHFRc4_YH"
JETTON_MASTER_ADDRESS = "kQBWwN8SW6Rc_wHl3hnXYLTCWKPk3-VWtuhib3KMg0Wsqdbl"

mnemonics = "your mnemonics here"


async def create_ton_order(wallet: WalletV4R2, side: Literal["buy", "sell"]):
    match side:
        case "buy":
            await _create_jetton_to_ton(
                wallet=wallet, via=BASE_MASTER_ADDRESS, amount=1, price=1
            )

        case "sell":
            await _create_ton_to_jetton(
                wallet=wallet, via=BASE_MASTER_ADDRESS, amount=1, price=1
            )

        case unknown:
            raise ValueError(f"Unknown order side: {unknown}")


async def _create_jetton_to_ton(
    wallet: WalletV4R2, via: Address, amount: int, price: int
):
    pass


async def _create_ton_to_jetton(
    wallet: WalletV4R2, via: Address, amount: int, price: int
):
    pass


async def _create_ton_order_by_ton(wallet: WalletV4R2, via: Address, value: int):
    body = (
        begin_cell()
        .store_uint(0x26DE17E2, 32)
        .store_uint(0, 64)
        .store_address(JETTON_MASTER_ADDRESS)
        .store_coins(1)
        .store_uint(3, 32)
        .store_uint(0, 64)
        .end_cell()
    )

    message = wallet.create_wallet_internal_message(
        destination=via,
        value=value,
        body=body,
    )

    await wallet.raw_transfer([message])


async def close_ton_order_by_ton():
    async with lite_balancer() as provider:
        wallet = await WalletV4R2.from_mnemonic(provider, mnemonics)
        assert isinstance(wallet, WalletV4R2)
        await _close_ton_order_by_ton(
            wallet=wallet,
            via=Address("EQByxhbOkRKssQTSjnZOYNvl9T3IYqmDPvbGiwhaqrR4Mdbz"),
            value=int(0.015 * 1e9),
            query_id=5,
        )


async def _close_ton_order_by_ton(
    wallet: WalletV4R2, via: Address, value: int, query_id: int
):
    body = begin_cell().store_uint(0x26DE17E4, 32).store_uint(query_id, 64).end_cell()

    message = wallet.create_wallet_internal_message(
        destination=via, value=value, body=body
    )

    await wallet.raw_transfer([message])


async def create_ton_order_by_jetton():
    price = 1
    async with lite_balancer() as provider:
        wallet = await WalletV4R2.from_mnemonic(provider, mnemonics)
        assert isinstance(wallet, WalletV4R2)
        await _create_ton_order_by_jetton(
            wallet=wallet,
            via=Address("EQByxhbOkRKssQTSjnZOYNvl9T3IYqmDPvbGiwhaqrR4Mdbz"),
            value=price,
            to_address=Address("EQByxhbOkRKssQTSjnZOYNvl9T3IYqmDPvbGiwhaqrR4Mdbz"),
            query_id=9,
            forward_amount=5,
            jetton_amount=2,
            forward_payload=(
                begin_cell()
                .store_uint(0x26DE15E2, 32)
                .store_address(JETTON_MASTER_ADDRESS)
                .store_uint(price, 32)
                .store_uint(int(time.time()), 64)
                .end_cell()
            ),
        )


async def _create_ton_order_by_jetton(
    wallet: WalletV4R2,
    via: Address,
    value: int,
    to_address: Address,
    query_id: int,
    forward_amount: int,
    jetton_amount: int,
    forward_payload: Optional[Cell] = None,
):

    body = (
        begin_cell()
        .store_uint(0xF8A7EA5, 32)
        .store_uint(query_id, 64)
        .store_coins(jetton_amount)
        .store_address(to_address)
        .store_address(via)
        .store_uint(0, 1)
        .store_coins(forward_amount)
        .store_maybe_ref(forward_payload)
        .end_cell()
    )

    message = wallet.create_wallet_internal_message(
        destination=via, value=value, body=body
    )

    await wallet.raw_transfer([message])


async def close_ton_order_by_jetton():
    pass


async def _close_ton_order_by_jetton():
    pass


@contextlib.asynccontextmanager
async def lite_balancer() -> AsyncGenerator[LiteBalancer, None]:
    balancer = LiteBalancer.from_testnet_config(trust_level=2)
    await balancer.start_up()
    yield balancer
    await balancer.close_all()


async def _main():
    async with lite_balancer() as provider:
        wallet = await WalletV4R2.from_mnemonic(provider, mnemonics)
        assert isinstance(wallet, WalletV4R2)

        await create_ton_order(wallet, "buy")
        await create_ton_order(wallet, "sell")


def main():
    asyncio.run(_main())
