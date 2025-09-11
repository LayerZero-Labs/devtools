import { BaseExchangeRequest } from './base'
import { RegisterHyperliquidity, SetDeployerTradingFeeShare } from './spotDeploy'
import { RegisterSpot } from './spotDeploy'
import { Genesis, UserGenesis } from './spotDeploy'
import { EnableFreezePrivilege, FreezeUser, RevokeFreezePrivilege, EnableQuoteToken } from './spotDeploy'

export interface EvmUserModifyRequest extends BaseExchangeRequest {
    action: {
        type: 'evmUserModify'
        usingBigBlocks: boolean
    }
}

export interface EvmSpotDeploy extends BaseExchangeRequest {
    action: {
        type: 'spotDeploy'
        requestEvmContract: {
            token: number
            address: string
            evmExtraWeiDecimals: number
        }
    }
}

export interface FinalizeEvmContract extends BaseExchangeRequest {
    action: {
        type: 'finalizeEvmContract'
        token: number
        input: {
            create: {
                nonce: number
            }
        }
    }
}

export interface SpotDeployAction extends BaseExchangeRequest {
    action:
        | {
              type: 'spotDeploy'
              setDeployerTradingFeeShare: SetDeployerTradingFeeShare
          }
        | {
              type: 'spotDeploy'
              userGenesis: UserGenesis
          }
        | {
              type: 'spotDeploy'
              genesis: Genesis
          }
        | {
              type: 'spotDeploy'
              registerSpot: RegisterSpot
          }
        | {
              type: 'spotDeploy'
              registerHyperliquidity: RegisterHyperliquidity
          }
        | {
              type: 'spotDeploy'
              enableFreezePrivilege: EnableFreezePrivilege
          }
        | {
              type: 'spotDeploy'
              freezeUser: FreezeUser
          }
        | {
              type: 'spotDeploy'
              revokeFreezePrivilege: RevokeFreezePrivilege
          }
        | {
              type: 'spotDeploy'
              enableQuoteToken: EnableQuoteToken
          }
}

export interface SpotClearinghouseState extends BaseExchangeRequest {
    action: {
        type: 'spotClearinghouseState'
        user: string
    }
}
