import fs from 'fs'
import path from 'path'

import { NativeSpot, NativeSpots } from '@/types'

export function getNativeSpot(nativeSpots: NativeSpots, key: string): NativeSpot {
    for (const spot of Object.values(nativeSpots)) {
        if (spot.name === key) {
            return spot
        }
    }

    throw new Error(`Native spot ${key} not found`)
}

export function writeUpdatedNativeSpots(
    nativeSpots: NativeSpots,
    key: string,
    tokenAddress: string,
    tokenName: string
) {
    const spot = getNativeSpot(nativeSpots, key)
    spot.evmContract = tokenAddress
    spot.fullName = tokenName

    fs.writeFileSync(path.join(process.cwd(), 'nativeSpots.ts'), JSON.stringify(nativeSpots, null, 2))
}
