import pMemoize from 'p-memoize'
import type { OwnableFactory } from '@layerzerolabs/ua-devtools'
import { OwnableMixin } from './mixin'
import { IOwnable } from '@layerzerolabs/ua-devtools'
import { OmniSDK } from '@layerzerolabs/devtools-evm'
import { OmniSDKFactory } from '@layerzerolabs/devtools'

/**
 * Syntactic sugar that adds IOwnable functionality to an instance of OmniSDK
 *
 * @param {OmniSDKFactory<OApp>} sdkFactory
 * @returns {OwnableFactory<OApp & IOwnable>}
 */
export const createOwnableFactory = (sdkFactory: OmniSDKFactory<OmniSDK>): OwnableFactory<OmniSDK & IOwnable> =>
    pMemoize(async (point) => Object.assign(await sdkFactory(point), OwnableMixin))
