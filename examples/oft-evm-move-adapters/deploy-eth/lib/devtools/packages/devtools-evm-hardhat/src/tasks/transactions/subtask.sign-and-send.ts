import { types } from '@/cli'
import { SUBTASK_LZ_SIGN_AND_SEND } from '@/constants'
import { createSignAndSendFlow, type OmniSignerFactory, type OmniTransaction } from '@layerzerolabs/devtools'
import type { Logger } from '@layerzerolabs/io-devtools'
import { subtask } from 'hardhat/config'

export interface SignAndSendTaskArgs {
    ci?: boolean
    logger?: Logger
    transactions: OmniTransaction[]
    createSigner: OmniSignerFactory
}

subtask(
    SUBTASK_LZ_SIGN_AND_SEND,
    'Sign and send a list of transactions using a local signer',
    ({ transactions, ...args }: SignAndSendTaskArgs) => createSignAndSendFlow(args)({ transactions })
)
    .addFlag('ci', 'Continuous integration (non-interactive) mode. Will not ask for any input from the user')
    .addParam('transactions', 'List of OmniTransaction objects', undefined, types.any)
    .addParam('createSigner', 'Function that creates a signer for a particular network', undefined, types.fn)
    .addParam('logger', 'Logger object (see @layerzerolabs/io-devtools', undefined, types.any, true)
    .addParam('onFailure', 'Function that handles sign & send failures', undefined, types.fn, true)
