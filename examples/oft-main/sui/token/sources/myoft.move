module myoft::myoft;

use sui::coin;
use sui::transfer;
use sui::tx_context::TxContext;
use std::option;

/// One-time witness for coin creation.
public struct MYOFT has drop {}

/// Initialize the coin on package publish.
fun init(otw: MYOFT, ctx: &mut TxContext) {
    let (treasury_cap, coin_metadata) = coin::create_currency(
        otw,
        6,
        b"MYOFT",
        b"My Omnichain Fungible Token",
        b"A LayerZero OFT on Sui with mint/burn capabilities",
        option::none(),
        ctx,
    );

    transfer::public_freeze_object(coin_metadata);
    transfer::public_transfer(treasury_cap, ctx.sender());
}
