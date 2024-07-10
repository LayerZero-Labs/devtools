import { task } from 'hardhat/config';
import { getEidForNetworkName } from '@layerzerolabs/devtools-evm-hardhat';
import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities';
import { SendParam } from "../utils/typeDefinitions";
import { Options } from '@layerzerolabs/lz-v2-utilities';
import { EndpointId } from '@layerzerolabs/lz-definitions';

// Wire OAPP config
task('lz:oapp:config:wire', 'Wires OAPP config')
    .setAction(async (taskArgs, { ethers, deployments }) => {
        console.log("Wire OAPP config here");
        // Add your custom wiring logic here
    });

export default 'oappConfigWire';
