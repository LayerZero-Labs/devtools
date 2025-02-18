// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/Console.sol";
import {MOVEOFTAdapter, RateLimiter} from "../src/MOVEOFTAdapter.sol";
import {MOVEMock, ERC20} from "../src/MOVEMock.sol";
import {EnforcedOptionParam} from "layerzerolabs/oapp/contracts/oapp/interfaces/IOAppOptionsType3.sol";

contract MOVEOFTAdapterScript is Script {
    
    // Input your contract address here
    MOVEOFTAdapter public adapter = MOVEOFTAdapter(address(0x1));
    uint32 public movementEid = 30325;

    function run() public {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        RateLimiter.RateLimitConfig[] memory rateLimitConfigs = new RateLimiter.RateLimitConfig[](2);
        rateLimitConfigs[0] = RateLimiter.RateLimitConfig({
            dstEid: movementEid,
            limit: 25000000 * 1e8,
            window: 1 days
        });
        rateLimitConfigs[1] = RateLimiter.RateLimitConfig({
            dstEid: 1, // incoming
            limit: 0, // if 0, no incoming limit
            window: 1 days
        });
        adapter.setRateLimits(rateLimitConfigs);
    }
}