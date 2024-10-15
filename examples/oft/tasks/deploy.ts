import { task } from 'hardhat/config';
import { getEidForNetworkName } from '@layerzerolabs/devtools-evm-hardhat';
import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities';
import { SendParam } from "../utils/typeDefinitions";
import { Options } from '@layerzerolabs/lz-v2-utilities';
import { EndpointId } from '@layerzerolabs/lz-definitions';

// Deploy the OFT example contract
task('lz:deploy', 'Deploys the OFT example contract')
    .setAction(async (taskArgs, { ethers, deployments }) => {
        const OFT = await ethers.getContractFactory("OFT");
        const oft = await OFT.deploy();
        await oft.deployed();
        console.log("OFT deployed to:", oft.address);
    });

export default 'deployOFT';
