import { setDefaultLogLevel } from '@layerzerolabs/io-devtools'

import { spotClearinghouseState } from '@/operations'
import { SpotBalancesResponse } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function isAccountActivated(args: any): Promise<boolean> {
    setDefaultLogLevel(args.logLevel)

    const user = args.user
    const isTestnet = args.network === 'testnet'

    const userBalances = await spotClearinghouseState(user, isTestnet, args.logLevel)

    return userBalances.balances.length === 0 ? false : true
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCoreBalances(args: any): Promise<SpotBalancesResponse> {
    setDefaultLogLevel(args.logLevel)

    const user = args.user
    const isTestnet = args.network === 'testnet'

    const userBalances = await spotClearinghouseState(user, isTestnet, args.logLevel)
    return userBalances
}
