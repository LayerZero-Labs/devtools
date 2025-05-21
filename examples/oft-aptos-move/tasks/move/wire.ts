/* eslint-disable import/no-unresolved */
import { subtask, task } from 'hardhat/config'

import { firstFactory } from '@layerzerolabs/devtools'
import { SUBTASK_LZ_SIGN_AND_SEND } from '@layerzerolabs/devtools-evm-hardhat'
import { SUBTASK_LZ_OAPP_WIRE_CONFIGURE, TASK_LZ_OAPP_WIRE } from '@layerzerolabs/ua-devtools-evm-hardhat'

import { createAptosOAppFactory } from '../utils/aptosSdkFactory'
import { createAptosSignerFactory } from '../utils/aptosSignerFactory'
import { createAptosConnectionFactory } from '../utils/aptosUtils'

import type { SignAndSendTaskArgs } from '@layerzerolabs/devtools-evm-hardhat/tasks'

/**
 * Override the default lz:oapp:wire task to add Aptos support.
 */
task(TASK_LZ_OAPP_WIRE).setAction(async (args, hre, runSuper) => {
    const privateKey = process.env.APTOS_PRIVATE_KEY_HEX ?? ''
    const connectionFactory = createAptosConnectionFactory()
    const aptosSignerFactory = createAptosSignerFactory(privateKey, connectionFactory)
    const aptosSdkFactory = createAptosOAppFactory(
        () => new (require('aptos').AptosAccount)(privateKey),
        connectionFactory
    )

    subtask(SUBTASK_LZ_OAPP_WIRE_CONFIGURE, 'Configure Aptos OApp', (subArgs, _hre, subRunSuper) =>
        subRunSuper({ ...subArgs, sdkFactory: firstFactory(aptosSdkFactory, subArgs.configurator) })
    )

    subtask(SUBTASK_LZ_SIGN_AND_SEND, 'Sign Aptos transactions', (subArgs: SignAndSendTaskArgs, _hre, subRunSuper) =>
        subRunSuper({ ...subArgs, createSigner: firstFactory(aptosSignerFactory, subArgs.createSigner) })
    )

    return runSuper(args)
})
