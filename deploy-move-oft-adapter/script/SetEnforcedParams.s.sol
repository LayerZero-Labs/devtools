// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/Console.sol";
import {MOVEOFTAdapter, RateLimiter} from "../src/MOVEOFTAdapter.sol";
import {MOVEMock, ERC20} from "../src/MOVEMock.sol";
import {EnforcedOptionParam} from "layerzerolabs/oapp/contracts/oapp/interfaces/IOAppOptionsType3.sol";

contract MOVEOFTAdapterScript is Script {
    
    // Input your contract address here
    MOVEOFTAdapter public adapter = MOVEOFTAdapter(0x1);
    uint32 public movementEid = 30325;

    function run() public {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        EnforcedOptionParam[] memory enforcedParams = new EnforcedOptionParam[](2);
        enforcedParams[0] = EnforcedOptionParam({
            eid: movementEid,
            msgType: uint16(1),
            options: options
        });
        enforcedParams[1] = EnforcedOptionParam({
            eid: movementEid,
            msgType: uint16(2),
            options: options
        });
        adapter.setEnforcedOptions(enforcedParams);

    }
}