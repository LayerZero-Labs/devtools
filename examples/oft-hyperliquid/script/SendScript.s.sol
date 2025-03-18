// SPDX-License-Identifier: LZBL-1.2
pragma solidity 0.8.22;

import { AddressCast } from "@layerzerolabs/lz-evm-protocol-v2/contracts/libs/AddressCast.sol";

import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

import { IOFT, SendParam, OFTReceipt, MessagingReceipt, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

import { Script, console } from "forge-std/Script.sol";
import { WrappedHyperCoreAdapter } from "../contracts/WrappedHyperCoreAdapter.sol";
import { WrappedHyperliquidOFT } from "../contracts/WrappedHyperliquidOFT.sol";
import { MyHyperLiquidOFT } from "../contracts/MyHyperLiquidOFT.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

/**
 * @title MintAndBurnOFTAdapterWithFee
 * @notice MintAndBurnOFTAdapter with fees
 * @notice This contract wraps the EUROP ERC20 token for use in the LayerZero network as an OFT and also imposes a Fee that is claimable by ONLY the owner (Schuman).
 */
contract SendScript is Script {
    using AddressCast for address;
    using OptionsBuilder for bytes;

    address payable public constant WRAPPED_HYPERCORE_COMPOSER = payable(0xa1f743B67979554Adc87d4eb2596d2C99bD74dCC);
    address public constant WRAPPED_HYPERLIQUID_OAPP = 0x56b2B6d7F1b95df6c74f1A3fA9A5366b2af6C2c9;
    address public constant BSC_HYPERLIQUID_OFT = 0x590f81164c28fC52135C1D015d56312EDb919812;

    uint32 public constant bscEid = 40102;
    uint32 public constant hyperliquidEid = 40362;

    uint256 public constant amount = 1e18;

    MyHyperLiquidOFT public myOFT_BSC;
    function setUp() public {
        myOFT_BSC = MyHyperLiquidOFT(BSC_HYPERLIQUID_OFT);
    }

    function run() public {
        SendParam memory sendParam = buildSendParam(WRAPPED_HYPERCORE_COMPOSER, msg.sender, amount, hyperliquidEid);

        vm.startBroadcast();

        console.log("sendParam.amount", sendParam.amountLD);
        MessagingFee memory msgFee = quoteSend(sendParam);
        console.log("msgFee.nativeFee", msgFee.nativeFee);
        console.log("msgFee.lzTokenFee", msgFee.lzTokenFee);

        _send(sendParam, msgFee);

        vm.stopBroadcast();
    }

    function buildSendParam(
        address _composer,
        address _receiver,
        uint256 _tokenAmount,
        uint32 _dstEid
    ) public pure returns (SendParam memory sendParam) {
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzComposeOption(0, 50_000, 1e12);
        bytes memory composeMsg = abi.encodePacked(_receiver);

        sendParam = SendParam({
            dstEid: _dstEid,
            to: addressToBytes32(_composer),
            amountLD: _tokenAmount,
            minAmountLD: (_tokenAmount * 9) / 10,
            extraOptions: options,
            composeMsg: composeMsg,
            oftCmd: ""
        });
    }

    function quoteSend(SendParam memory _sendParam) public view returns (MessagingFee memory) {
        return myOFT_BSC.quoteSend(_sendParam, false);
    }

    function _send(SendParam memory _sendParam, MessagingFee memory _fee) internal {
        myOFT_BSC.send{ value: _fee.nativeFee }(_sendParam, _fee, msg.sender);
    }

    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }
}

// 100000 = 0.001
// 10000 =  0.0001 =

// 0.00000001
//
