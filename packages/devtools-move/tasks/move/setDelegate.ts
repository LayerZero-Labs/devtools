import { getConnection } from '../../sdk/moveVMConnectionBuilder'
import { IOFT } from '../../sdk/IOFT'
import { OFT } from '../../sdk/oft'
import { InitiaOFT } from '../../sdk/initiaOFT'
import { setDelegate } from './utils/moveVMOftConfigOps'
import { getContractNameFromLzConfig, getDelegateFromLzConfig, getMoveVMOAppAddress, sendAllTxs } from './utils/utils'
import { getAptosPrivateKey } from './utils/config'
import { EndpointId, Stage } from '@layerzerolabs/lz-definitions'
import { Aptos } from '@aptos-labs/ts-sdk'

async function executeSetDelegate(
    accountAddress: string,
    lzConfig: any,
    stage: Stage,
    chainName: string,
    eid: EndpointId
) {
    const contractName = getContractNameFromLzConfig(eid, lzConfig)
    const oAppAddress = getMoveVMOAppAddress(contractName, chainName, stage)

    console.log(`\n🔧 Setting ${chainName}-${stage} OApp Delegate`)
    console.log(`\tFor: ${oAppAddress}\n`)

    const moveVMConnection = getConnection(chainName, stage)

    let oft: IOFT
    if (chainName === 'aptos' || chainName === 'movement') {
        const aptosPrivateKey = getAptosPrivateKey(chainName)
        oft = new OFT(moveVMConnection as Aptos, oAppAddress, accountAddress, aptosPrivateKey, eid)
    } else if (chainName === 'initia') {
        oft = new InitiaOFT(moveVMConnection, oAppAddress, eid)
    } else {
        throw new Error(`${chainName}-${stage} is not supported`)
    }

    const delegate = getDelegateFromLzConfig(eid, lzConfig)

    const setDelegatePayload = await setDelegate(oft, delegate, eid)

    await sendAllTxs(moveVMConnection as Aptos, oft, accountAddress, [setDelegatePayload])
}

export { executeSetDelegate as setDelegate }
