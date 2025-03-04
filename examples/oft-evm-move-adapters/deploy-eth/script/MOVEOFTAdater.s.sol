// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/Console.sol";
import {MOVEOFTAdapter, RateLimiter} from "../src/MOVEOFTAdapter.sol";
import {MOVEMock, ERC20} from "../src/MOVEMock.sol";
import {EnforcedOptionParam} from "layerzerolabs/oapp/contracts/oapp/interfaces/IOAppOptionsType3.sol";

contract MOVEOFTAdapterScript is Script {
    
    MOVEOFTAdapter public adapter;
    // Mainnet
    address public move = 0x3073f7aAA4DB83f95e9FFf17424F71D4751a3073;
    address public lzEndpoint = 0x1a44076050125825900e736c501f859c50fE728c;
    uint32 public movementEid = 30325;

    // Testnet
    address public tMove = 0xcf28bDf5352881cAc32bA7C94265Ac7C720B7DC6;
    address public tLzEndpoint = 0x6EDCE65403992e310A62460808c4b910D972f10f;
    uint32 public tMovementEid = 40325;

    // Enforced options: worker -> gas units
    bytes public options = abi.encodePacked(uint176(0x00030100110100000000000000000000000000001388));
    // Movement MOVEOFTAdapter in bytes32
    bytes32 public moveOftAdapterBytes32 = 0x1f6569607261e5d6c8e1053325e4b9a3b2966d3a1a58efd627381069d453b9de;

    function run() public {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        address owner = vm.addr(pk);

        // switch to Testnet variables if not on Mainnet
        if (block.chainid != 1) {
            move = tMove;
            movementEid = tMovementEid;
            lzEndpoint = tLzEndpoint;
        }

        RateLimiter.RateLimitConfig[] memory rateLimitConfigs = new RateLimiter.RateLimitConfig[](2);
        rateLimitConfigs[0] = RateLimiter.RateLimitConfig({
            dstEid: movementEid,
            limit: 75000000 * 1e8,
            window: 1 days
        });
        rateLimitConfigs[1] = RateLimiter.RateLimitConfig({
            dstEid: 1, // incoming
            limit: 0,
            window: 1 days
        });
        // Deploy the adapter
        adapter = new MOVEOFTAdapter(
                move,
                lzEndpoint,
                owner,
                rateLimitConfigs
            );

        adapter.setPeer(movementEid, moveOftAdapterBytes32);
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