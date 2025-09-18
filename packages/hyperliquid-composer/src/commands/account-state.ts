import { setDefaultLogLevel } from '@layerzerolabs/io-devtools'

import { spotClearinghouseState } from '@/operations'
import { SpotBalancesResponse, UserArgs, GetCoreBalancesArgs } from '@/types'

export async function isAccountActivated(args: UserArgs): Promise<boolean> {
    setDefaultLogLevel(args.logLevel)

    const user = args.user
    const isTestnet = args.network === 'testnet'

    const userBalances = await spotClearinghouseState(user, isTestnet, args.logLevel)

    return userBalances.balances.length === 0 ? false : true
}

export async function getCoreBalances(args: GetCoreBalancesArgs): Promise<SpotBalancesResponse> {
    setDefaultLogLevel(args.logLevel)

    const user = args.user
    const isTestnet = args.network === 'testnet'

    const userBalances = await spotClearinghouseState(user, isTestnet, args.logLevel)
    return userBalances
}
