import { INewOperation } from '@layerzerolabs/devtools-extensible-cli/cli/types/NewOperation'
import { createEvmOmniContracts, readPrivateKey } from '../../tasks/evm/wire-evm'
import { ethers } from 'ethers'

class EVMQuoteSendOperation implements INewOperation {
    vm = 'evm'
    operation = 'send'
    description = 'Sends an OFT message'
    reqArgs = ['oapp_config', 'src_eid', 'dst_eid', 'to', 'amount', 'min_amount']
    addArgs = [
        {
            name: '--src-eid',
            arg: {
                help: 'The source endpoint ID',
                required: false,
            },
        },
        {
            name: '--dst-eid',
            arg: {
                help: 'The destination endpoint ID',
                required: false,
            },
        },
        {
            name: '--to',
            arg: {
                help: 'The address to send the message to',
                required: false,
            },
        },
        {
            name: '--amount',
            arg: {
                help: 'The amount to send',
                required: false,
            },
        },
        {
            name: '--min-amount',
            arg: {
                help: 'The minimum amount to send',
                required: false,
            },
        },
        {
            name: '--refund-address',
            arg: {
                help: 'The address to refund the gas fee to',
                required: false,
            },
        },
    ]

    async impl(args: any): Promise<void> {
        await sendOFT(args)
    }
}

const NewOperation = new EVMQuoteSendOperation()
export { NewOperation }

async function sendOFT(args: any): Promise<MessagingFee> {
    const srcEid = args.src_eid
    const dstEid = args.dst_eid
    const to = ethers.utils.hexZeroPad(ethers.utils.getAddress(args.to), 32)
    const amount = args.amount
    const minAmount = args.min_amount

    const privateKey = readPrivateKey(args)
    const omniContracts = await createEvmOmniContracts(args, privateKey)
    let oft: ethers.Contract
    const contract = omniContracts[srcEid.toString()]
    if (contract?.contract?.oapp) {
        oft = contract.contract.oapp
    } else {
        throw new Error(`No OApp found for endpoint ID ${srcEid}`)
    }
    const refundAddress = args.refund_address || (await oft.signer.getAddress())

    console.log(`\n🚀 Sending ${amount} units`)
    console.log(`\t📝 Using OFT at address: ${oft.address}`)
    console.log(`\t👤 From account: ${await oft.signer.getAddress()}`)
    console.log(`\t🎯 To account: ${to}`)
    console.log(`\t🌐 dstEid: ${dstEid}`)
    console.log(`\t🔍 Min amount: ${minAmount}`)

    const sendParam: SendParam = {
        dstEid: dstEid,
        to: to,
        amountLD: amount,
        minAmountLD: minAmount,
        extraOptions: '0x',
        composeMsg: '0x',
        oftCmd: '0x',
    }

    const fee: MessagingFee = await oft.quoteSend(sendParam, false)

    console.log('\n💰 Quote received:')
    console.log('\t🏦 Native fee:', fee.nativeFee.toString())
    console.log('\t🪙 LZ token fee:', fee.lzTokenFee.toString())

    const tx = await oft.send(sendParam, fee, refundAddress, {
        value: fee.nativeFee,
    })

    console.log('\n📨 Transaction sent:')
    console.log('\t🔑 Hash:', tx.hash)
    console.log('\t🔍 LayerZero Explorer:', `https://layerzeroscan.com/tx/${tx.hash}`)
    console.log('\t📤 From:', tx.from)
    console.log('\t📥 To:', tx.to)
    console.log('\t💵 Value:', ethers.utils.formatEther(tx.value), 'ETH')
    console.log('\t⛽ Gas limit:', tx.gasLimit.toString())

    return tx
}

type SendParam = {
    dstEid: number
    to: string
    amountLD: number
    minAmountLD: number
    extraOptions: string
    composeMsg: string
    oftCmd: string
}

type MessagingFee = {
    nativeFee: bigint
    lzTokenFee: bigint
}
