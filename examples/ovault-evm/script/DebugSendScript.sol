// SPDX-License-Identifier: LZBL-1.2
pragma solidity ^0.8.0;

import { AddressCast } from "@layerzerolabs/lz-evm-protocol-v2/contracts/libs/AddressCast.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

import { IOFT, SendParam, OFTReceipt, MessagingReceipt, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";

import { Script, console } from "forge-std/Script.sol";
/**
 * @title Lets the user send an LZ OFT transfer to transfer an amount of OFT from a source EVM chain to OVault testnet or mainnet
 * @notice There are 3 supported modes that correspond to <amount>, <gas>, <value> in the forge script below:
 * @notice forge script script/SendScript.s.sol --private-key $PRIVATE_KEY --rpc-url $RPC_URL_BASE_TESTNET --sig "exec(address oft,string dstChain,uint256 amt,uint256 minAmt,uint128 lzComposeGas,uint128 lzComposeValue)" $SHARE_OFT_BASE_SEP  "base-sep" 1ether 500000 0.000025ether [--broadcast]
 */

contract DebugSendScript is Script {
    using AddressCast for address;

    using OptionsBuilder for bytes;

    address payable public addressComposer;

    OFT public srcOFT;

    mapping(uint256 => uint32) public chainIdToSrcEid;
    mapping(string => uint32) public chainNameToDstEid;

    uint32 public HUB_EID = 40231;

    function setUp() public {
        chainIdToSrcEid[421614] = 40231; // arb sep
        chainIdToSrcEid[84532] = 40245; // base sep

        chainNameToDstEid["arb-sep"] = 40231; // arb sep
        chainNameToDstEid["base-sep"] = 40245; // base sep
        chainNameToDstEid["bad-eid"] = 100000; // bad eid

        addressComposer = payable(vm.envAddress("OVAULT_COMPOSER_ADDRESS"));
    }

    function exec(
        address _fromOFT,
        string memory _dstChain,
        uint256 _amount,
        uint256 _minAmount,
        uint128 _lzComposeGas,
        uint128 _lzComposeValue
    ) public {
        uint32 srcEid = chainIdToSrcEid[block.chainid];
        if (srcEid == 0) {
            revert("Source chain is not Arbitrum Sepolia or Base Sepolia");
        }

        uint32 dstEid = chainNameToDstEid[_dstChain];
        if (dstEid == 0) {
            revert("Destination chain is not Arbitrum Sepolia or Base Sepolia");
        }

        srcOFT = OFT(_fromOFT);

        SendParam memory sendParam = buildSendParam(
            addressComposer,
            msg.sender,
            _amount,
            _minAmount,
            dstEid,
            _lzComposeGas,
            _lzComposeValue
        );

        vm.startBroadcast();

        MessagingFee memory msgFee = quoteSend(sendParam);

        _send(sendParam, msgFee);

        vm.stopBroadcast();
    }

    function buildSendParam(
        address _composer,
        address _receiver,
        uint256 _tokenAmount,
        uint256 _minAmount,
        uint32 _dstEid,
        uint128 _lzComposeGas,
        uint128 _lzComposeValue
    ) public view returns (SendParam memory sendParam) {
        bytes memory options;
        bytes memory composeMsg = "";
        uint32 dstEid = _dstEid;
        bytes32 to = _receiver.toBytes32();

        if (_lzComposeGas > 0) {
            options = OptionsBuilder.newOptions().addExecutorLzComposeOption(0, _lzComposeGas, _lzComposeValue);
            SendParam memory hopSendParam = SendParam({
                dstEid: dstEid,
                to: to,
                amountLD: _tokenAmount,
                minAmountLD: _minAmount,
                extraOptions: hex"",
                composeMsg: composeMsg,
                oftCmd: hex""
            });
            composeMsg = abi.encode(hopSendParam);
            to = _composer.toBytes32();
            dstEid = HUB_EID;
        }

        sendParam = SendParam({
            dstEid: dstEid,
            to: to,
            amountLD: _tokenAmount,
            minAmountLD: _tokenAmount,
            extraOptions: options,
            composeMsg: composeMsg,
            oftCmd: ""
        });
    }

    function quoteSend(SendParam memory _sendParam) public view returns (MessagingFee memory) {
        return srcOFT.quoteSend(_sendParam, false);
    }

    function _send(SendParam memory _sendParam, MessagingFee memory _fee) internal {
        srcOFT.send{ value: _fee.nativeFee }(_sendParam, _fee, msg.sender);
    }
}
