// SPDX-License-Identifier: LZBL-1.2
pragma solidity ^0.8.0;

import { AddressCast } from "@layerzerolabs/lz-evm-protocol-v2/contracts/libs/AddressCast.sol";

import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

import { IOFT, SendParam, OFTReceipt, MessagingReceipt, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

import { Script, console } from "forge-std/Script.sol";
import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

/**
 * @title Lets the user send an LZ OFT transfer to transfer an amount of OFT from a source EVM chain to HyperEVM testnet or mainnet
 * @notice There are 3 supported modes that correspond to <amount>, <gas>, <value> in the forge script below:
 * @notice forge script script/SendScript.s.sol --private-key $PRIVATE_KEY --rpc-url $RPC_URL_ARBITRUM_SEPOLIA --sig "exec(uint256,uint128,uint128)" <amount> <gas> <value> [--broadcast]
 * @notice 1. Send to HyperEVM 
                - true, false, false
 * @notice 2. Send to HyperCore 
                - true, true, false
 * @notice 3. Send to HyperCore + Fund HyperCore with HYPE 
                - true, true, true
 */
contract SendScript is Script {
    using AddressCast for address;
    using OptionsBuilder for bytes;

    address payable public address_HyperEVM_Composer;
    address public address_HyperEVM_OFT;

    OFT public myOFT_SRC;
    address public address_src_OFT;

    uint32 public srcEid;
    uint32 public dstEid;

    function exec(uint256 _amount, uint128 _lzComposeGas, uint128 _lzComposeValue) public {
        address_HyperEVM_Composer = payable(vm.envAddress("HYPEREVM_COMPOSER"));
        address_HyperEVM_OFT = vm.envAddress("HYPEREVM_OFT");
        address_src_OFT = vm.envAddress("SRC_OFT");

        srcEid = uint32(vm.envUint("SRC_EID"));
        dstEid = uint32(vm.envUint("DST_EID"));

        myOFT_SRC = OFT(address_src_OFT);

        SendParam memory sendParam = buildSendParam(
            address_HyperEVM_Composer,
            msg.sender,
            _amount,
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
        uint32 _dstEid,
        uint128 _lzComposeGas,
        uint128 _lzComposeValue
    ) public pure returns (SendParam memory sendParam) {
        bytes memory options;
        bytes memory composeMsg = "";
        bytes32 to = addressToBytes32(_receiver);

        if (_lzComposeGas > 0) {
            options = OptionsBuilder.newOptions().addExecutorLzComposeOption(0, _lzComposeGas, _lzComposeValue);
            composeMsg = abi.encode(_tokenAmount, addressToBytes32(_receiver));
            to = addressToBytes32(_composer);
        }

        sendParam = SendParam({
            dstEid: _dstEid,
            to: to,
            amountLD: _tokenAmount,
            minAmountLD: (_tokenAmount * 9) / 10,
            extraOptions: options,
            composeMsg: composeMsg,
            oftCmd: ""
        });
    }

    function quoteSend(SendParam memory _sendParam) public view returns (MessagingFee memory) {
        return myOFT_SRC.quoteSend(_sendParam, false);
    }

    function _send(SendParam memory _sendParam, MessagingFee memory _fee) internal {
        myOFT_SRC.send{ value: _fee.nativeFee }(_sendParam, _fee, msg.sender);
    }

    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }
}
