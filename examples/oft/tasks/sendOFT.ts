import { task } from 'hardhat/config'
import { getEidForNetworkName } from '@layerzerolabs/devtools-evm-hardhat'
import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities';
import { SendParam } from "../utils/typeDefinitions";
import { Options } from '@layerzerolabs/lz-v2-utilities';
import { EndpointId } from '@layerzerolabs/lz-definitions';

// send tokens from a contract on one network to another
task('lz:oft:send', 'Sends tokens from either SwellOFTAdapter or SwellOFT')
    .addParam('to', 'contract address on network B')
    .addParam('destination', 'name of network B')
    .addParam('amount', 'amount to transfer in token decimals')
    .setAction(async (taskArgs, { ethers, deployments }) => {

        let eidB;
        let options;
        
        if (taskArgs.destination == 'solana-testnet') {
            eidB = EndpointId.SOLANA_V2_TESTNET;
            options = Options.newOptions().addExecutorLzReceiveOption(0, 0).toBytes();

        } else if (taskArgs.destination == 'solana-mainnet') {
            eidB = EndpointId.SOLANA_V2_MAINNET;
            options = Options.newOptions().addExecutorLzReceiveOption(0, 0).toBytes();
        } else {
            eidB = getEidForNetworkName(taskArgs.destination);
            options = Options.newOptions().addExecutorLzReceiveOption(0, 0).toBytes();
        }
        
        const toAddress = taskArgs.to;

        // Get the contract factories
        let oftDeployment;
        let isSwellOFTAdapterProxy = false;
        try {
            oftDeployment = await deployments.get('SwellOFT_Proxy');
        } catch (error) {
        }

        if (!oftDeployment) {
            try {
                oftDeployment = await deployments.get('SwellOFTAdapter_Proxy');
                isSwellOFTAdapterProxy = true;
            } catch (error) {
            }
        }

        if (!oftDeployment) {
            throw new Error('Neither SwellOFT_Proxy nor SwellOFTAdapter_Proxy contract factories could be found');
        }

        const [signer] = await ethers.getSigners();

        // Create contract instances
        const swellOFTProxyContract = new ethers.Contract(oftDeployment.address, oftDeployment.abi, signer);
        const MintableErc20Factory = await ethers.getContractFactory('MockERC20');

        let decimals, amount;

        // If the contract is SwellOFT, get decimals from it
        if (!isSwellOFTAdapterProxy) {
            decimals = await swellOFTProxyContract.decimals();
        } else {
            // If the contract is SwellOFTAdapterProxy, get decimals from the inner token
            const innerTokenAddress = await swellOFTProxyContract.token();
            const innerToken = MintableErc20Factory.attach(innerTokenAddress);
            decimals = await innerToken.decimals();
            // Approve the amount to be spent by the oft contract
            amount = ethers.utils.parseUnits(taskArgs.amount, decimals);
            await innerToken.approve(oftDeployment.address, amount);
        }

        // Now you can interact with the correct contract
        const oft = swellOFTProxyContract;

        const sendParam: SendParam = {
            dstEid: eidB,
            to: addressToBytes32(toAddress),
            amountLD: amount!,
            minAmountLD: amount!,
            extraOptions: options,
            composeMsg: ethers.utils.arrayify('0x'), // Assuming no composed message
            oftCmd: ethers.utils.arrayify('0x') // Assuming no OFT command is needed
        };
        // Get the quote for the send operation
        const feeQuote = await oft.quoteSend(sendParam, false);
        const nativeFee = feeQuote.nativeFee;

        console.log(
            `sending ${taskArgs.amount} token(s) to network ${taskArgs.destination} (${eidB})`
        )

        // Send the transaction
        if (isSwellOFTAdapterProxy = true) {
            const innerToken = MintableErc20Factory.attach(await oft.token());
            await innerToken.approve(oft.address, amount); 
            // const mint = await innerToken.mint(signer.address, amount);
            // console.log(
            //     `Minting ${amount} token(s) to signer ${signer.address}, see tx hash here: ${mint.hash}`
            // )
        }

        const r = await oft.send(
            sendParam, 
            { nativeFee: nativeFee, lzTokenFee: 0},
            signer.address,
            { value: nativeFee }
        );
        console.log(`Send tx initiated. See: https://layerzeroscan.com/tx/${r.hash}`)
    })

export default 'sendOFT'