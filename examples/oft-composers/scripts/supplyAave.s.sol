// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IStargate } from "@stargatefinance/stg-evm-v2/src/interfaces/IStargate.sol";
import { SendParam, MessagingFee, OFTReceipt } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/interfaces/IOFT.sol";
import { OptionsBuilder } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OptionsBuilder.sol";

contract SupplyAaveScript is Script {
    using OptionsBuilder for bytes;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        address sender = vm.addr(pk);

        address stargate = vm.envAddress("STARGATE_POOL");
        uint32 dstEid = uint32(vm.envUint("DST_EID"));
        address composer = vm.envAddress("COMPOSER");
        uint256 amountLD = vm.envUint("AMOUNT_LD");
        address recipient = sender;
        if (vm.envExists("COMPOSE_RECIPIENT")) {
            recipient = vm.envAddress("COMPOSE_RECIPIENT");
        }
        uint128 composeGas = 200000;
        if (vm.envExists("COMPOSE_GAS_LIMIT")) {
            composeGas = uint128(vm.envUint("COMPOSE_GAS_LIMIT"));
        }
        address refund = sender;
        if (vm.envExists("REFUND_ADDRESS")) {
            refund = vm.envAddress("REFUND_ADDRESS");
        }
        bool payInLzToken = false;
        if (vm.envExists("PAY_IN_LZ_TOKEN")) {
            payInLzToken = vm.envBool("PAY_IN_LZ_TOKEN");
        }

        // Step 1: compose payload
        bytes memory composeMsg = abi.encode(recipient, amountLD);

        // Step 2: options (compose index 0, gas limit, no native drop)
        bytes memory extraOptions = OptionsBuilder.newOptions().addExecutorLzComposeOption(0, composeGas, 0);

        // Step 3: assemble SendParam with placeholder minAmount
        SendParam memory sendParam = SendParam({
            dstEid: dstEid,
            to: bytes32(uint256(uint160(composer))),
            amountLD: amountLD,
            minAmountLD: 0,
            extraOptions: extraOptions,
            composeMsg: composeMsg,
            oftCmd: bytes("")
        });

        // Quote OFT to learn the actual receive amount
        (, , OFTReceipt memory oftReceipt) = IStargate(stargate).quoteOFT(sendParam);
        sendParam.minAmountLD = oftReceipt.amountReceivedLD;
        sendParam.composeMsg = abi.encode(recipient, oftReceipt.amountReceivedLD);

        // Quote LayerZero messaging fee
        MessagingFee memory fee = IStargate(stargate).quoteSend(sendParam, payInLzToken);

        // ERC20 approval if required
        address token = IStargate(stargate).token();
        if (token != address(0)) {
            _ensureApproval(token, sender, stargate, sendParam.amountLD);
        }

        // Step 4: compute value (add amount if pool uses native token)
        uint256 valueToSend = fee.nativeFee;

        // Step 5: send
        (, OFTReceipt memory finalReceipt) = IStargate(stargate).send{ value: valueToSend }(sendParam, fee, refund);

        console.log("message sent; amount received LD =", finalReceipt.amountReceivedLD);
        vm.stopBroadcast();
    }

    function _ensureApproval(address token, address owner, address spender, uint256 amount) internal {
        IERC20 erc20 = IERC20(token);
        if (erc20.allowance(owner, spender) < amount) {
            erc20.approve(spender, type(uint256).max);
        }
    }
}

/*
    forge script scripts/supplyAave.s.sol:SupplyAaveScript \
    --rpc-url https://arbitrum.gateway.tenderly.co \
    --broadcast -vv --via-ir
*/
