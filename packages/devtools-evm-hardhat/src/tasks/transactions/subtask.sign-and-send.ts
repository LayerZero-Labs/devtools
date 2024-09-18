import { types } from '@/cli'
import { SUBTASK_LZ_SIGN_AND_SEND } from '@/constants'
import { signAndSendFlow, type SignAndSendFlowArgs } from '@layerzerolabs/devtools'
import { subtask } from 'hardhat/config'

/**
 * @deprecated Use `SignAndSendFlowArgs` from `@layerzerolabs/devtools` instead.
 */
export type SignAndSendTaskArgs = SignAndSendFlowArgs

subtask(SUBTASK_LZ_SIGN_AND_SEND, 'Sign and send a list of transactions using a local signer', signAndSendFlow)
    .addFlag('ci', 'Continuous integration (non-interactive) mode. Will not ask for any input from the user')
    .addParam('transactions', 'List of OmniTransaction objects', undefined, types.any)
    .addParam('createSigner', 'Function that creates a signer for a particular network', undefined, types.fn)
