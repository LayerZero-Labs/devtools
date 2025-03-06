import { NativeSpots } from '@layerzerolabs/oft-hyperliquid-evm'

// curl -X POST https://api.hyperliquid-testnet.xyz/info -H "Content-Type: application/json" -d '{"type": "spotMeta"}' > out.json
const nativeSpots: NativeSpots = {
    ALICE: {
        name: 'ALICE',
        szDecimals: 0,
        weiDecimals: 6,
        index: 1231,
        tokenId: '0x503e1e612424896ec6e7a02c7350c963',
        isCanonical: false,
        evmContract: null,
        fullName: null,
        deployerTradingFeeShare: '0.25',
    },
    BOB: {
        name: 'BOB',
        szDecimals: 0,
        weiDecimals: 6,
        index: 1232,
        tokenId: '0x1a799f5ac47b70f204e687bfb1cb9753',
        isCanonical: false,
        evmContract: null,
        fullName: null,
        deployerTradingFeeShare: '1.0',
    },
}

export { nativeSpots }
