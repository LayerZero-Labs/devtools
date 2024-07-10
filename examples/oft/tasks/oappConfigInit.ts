import { task } from 'hardhat/config';
import { getEidForNetworkName } from '@layerzerolabs/devtools-evm-hardhat';
import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities';
import { SendParam } from "../utils/typeDefinitions";
import { Options } from '@layerzerolabs/lz-v2-utilities';
import { EndpointId } from '@layerzerolabs/lz-definitions';

// Initialize OAPP config
task('lz:oapp:config:init', 'Initializes OAPP config')
    .setAction(async (taskArgs, { ethers, deployments }) => {
        console.log("Initialize OAPP config here");
        // Add your custom initialization logic here
    });

export default 'oappConfigInit';
