// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {USDCOFTAdapter} from "../src/USDCOFTAdapter.sol";
import {USDTOFTAdapter} from "../src/USDTOFTAdapter.sol";
import {WETHOFTAdapter} from "../src/WETHOFTAdapter.sol";
import {EnforcedOptionParam} from "layerzerolabs/oapp/contracts/oapp/interfaces/IOAppOptionsType3.sol";

contract OFTAdaptersScript is Script {
    // Mainnet
    address public usdc = 0x3073f7aAA4DB83f95e9FFf17424F71D4751a3073;
    address public usdt = 0x3073f7aAA4DB83f95e9FFf17424F71D4751a3073;
    address public weth = 0x3073f7aAA4DB83f95e9FFf17424F71D4751a3073;

    address public lzEndpoint = 0x1a44076050125825900e736c501f859c50fE728c;
    uint32 public movementEid = 30325;

    // Testnet
    address public tUsdc = 0x3D40fF7Ff9D5B01Cb5413e7E5C18Aa104A6506a5;
    address public tUsdt = 0xC1c94Dde81053612aC602ba39b6AfBd3CfE6a8Bc;
    address public tWeth = 0x50e288885258bC62da02d7Bd1e37d5c7B27F814F;
    address public tLzEndpoint = 0x6EDCE65403992e310A62460808c4b910D972f10f;
    uint32 public tMovementEid = 40325;

    USDCOFTAdapter public usdcA;
    USDTOFTAdapter public usdtA;
    WETHOFTAdapter public wethA;
    // Enforced options: worker -> gas units
    bytes public options = abi.encodePacked(uint176(0x00030100110100000000000000000000000000001388));
    // Movement MOVEOFTAdapter in bytes32
    bytes32 public usdcOftAdapterBytes32 = 0x33987308d6698c3def1f155c8ea394360e9756b0a22e64fb20834327f04a1e42;
    bytes32 public usdtOftAdapterBytes32 = 0x9cda672762a6f88e4b608428dd063e03aaf6712f0a427923dd0f1416afa1c075;
    bytes32 public wethOftAdapterBytes32 = 0x2fa1f2914aa17d239410cb81ab46dd8fa9230272c58bc84e9e8b971eded79ca5;

    function run() public {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        address owner = vm.addr(pk);

        // switch to Testnet variables if not on Mainnet
        if (block.chainid != 1) {
            usdc = tUsdc;
            usdt = tUsdt;
            weth = tWeth;
            movementEid = tMovementEid;
            lzEndpoint = tLzEndpoint;
        }

        // Deploy the adapter
        usdcA = new USDCOFTAdapter(usdc, lzEndpoint, owner);
        usdtA = new USDTOFTAdapter(usdt, lzEndpoint, owner);
        wethA = new WETHOFTAdapter(weth, lzEndpoint, owner);

        usdcA.setPeer(movementEid, usdcOftAdapterBytes32);
        usdtA.setPeer(movementEid, usdtOftAdapterBytes32);
        wethA.setPeer(movementEid, wethOftAdapterBytes32);

        EnforcedOptionParam[] memory enforcedParams = new EnforcedOptionParam[](2);
        enforcedParams[0] = EnforcedOptionParam({eid: movementEid, msgType: uint16(1), options: options});
        enforcedParams[1] = EnforcedOptionParam({eid: movementEid, msgType: uint16(2), options: options});

        usdcA.setEnforcedOptions(enforcedParams);
        usdtA.setEnforcedOptions(enforcedParams);
        wethA.setEnforcedOptions(enforcedParams);
    }
}
