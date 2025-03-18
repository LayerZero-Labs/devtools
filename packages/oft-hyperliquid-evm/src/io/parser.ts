import fs from 'fs'
import path from 'path'

import { NativeSpotDeployment } from '@/types'

const DEPLOY_DIR = path.join('deploy', 'native-spots')

export function getNativeSpot(key: string): NativeSpotDeployment {
    const nativeSpotPath = path.join(process.cwd(), DEPLOY_DIR, `${key}.json`)
    const nativeSpot = fs.readFileSync(nativeSpotPath, 'utf8')
    if (!nativeSpot) {
        throw new Error(
            `Native spot ${key} not found - make sure the native spot for the token ${key} is found at ${nativeSpotPath}`
        )
    }
    return JSON.parse(nativeSpot) as NativeSpotDeployment
}

export function writeUpdatedNativeSpots(
    key: string,
    tokenAddress: string,
    tokenName: string,
    txHash: string,
    nonce: number,
    from: string,
    connected: boolean,
    weiDiff?: number
) {
    const spot = getNativeSpot(key)
    spot.nativeSpot.evmContract = tokenAddress
    spot.nativeSpot.fullName = tokenName
    spot.txData.txHash = txHash
    spot.txData.nonce = nonce
    spot.txData.from = from
    spot.txData.connected = connected
    spot.txData.weiDiff = weiDiff

    fs.writeFileSync(path.join(process.cwd(), DEPLOY_DIR, `${key}.json`), JSON.stringify(spot, null, 2))
    console.log(`Updated native spot ${key}`)
}

export function writeNativeSpotConnected(key: string, connected: boolean, weiDiff: number) {
    const spot = getNativeSpot(key)
    spot.txData.connected = connected
    spot.txData.weiDiff = weiDiff

    fs.writeFileSync(path.join(process.cwd(), DEPLOY_DIR, `${key}.json`), JSON.stringify(spot, null, 2))
    console.log(`Updated native spot ${key}`)
}
