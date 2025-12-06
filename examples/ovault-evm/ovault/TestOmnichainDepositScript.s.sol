// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {
    IOFT,
    SendParam,
    MessagingFee,
    MessagingReceipt,
    OFTReceipt
} from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import {OptionsBuilder} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TestOmniDepositFlowMainnet - Dynamic Gas
 * @notice Cross-chain vault deposit test with dynamic fee quoting
 * @dev Quotes fees from both chains: Forward (ETH→AVAX) + Return (AVAX→ETH)
 *
 * Usage:
 *   forge script scripts/ovault/TestOmniDepositFlowMainnet.DYNAMIC_GAS.s.sol:TestOmniDepositFlowMainnetDynamic \
 *     --rpc-url $ETHEREUM_MAINNET_RPC_URL --broadcast --slow
 *
 * Env vars: PRIVATE_KEY, AVALANCHE_MAINNET_RPC_URL (optional), TEST_RECIPIENT, TEST_AMOUNT
 */
contract TestOmniDepositFlowMainnetDynamic is Script {
    using OptionsBuilder for bytes;

    // LayerZero Endpoint IDs
    uint32 constant AVALANCHE_EID = 30106;
    uint32 constant ETHEREUM_EID = 30101;

    // Gas limits (input for fee calculation)
    uint128 constant GAS_LIMIT_RECEIVE = 300_000;
    uint128 constant GAS_LIMIT_COMPOSE = 500_000;
    uint128 constant GAS_LIMIT_RETURN = 150_000;

    // Safety buffer (20%)
    uint256 constant FEE_BUFFER = 120;

    // Default amount
    uint256 constant DEFAULT_AMOUNT = 1e6;

    // State
    IOFT public token;
    IOFT public shareOFTAdapter;
    address public vaultComposer;
    address public recipient;
    uint256 public depositAmount;
    address public deployer;
    uint256 public avalancheFork;
    uint256 public ethereumFork;

    function run() external {
        console.log("\n=== OVault Omnichain Deposit (Dynamic Gas) ===\n");

        _setupForks();
        _loadConfig();

        uint256 pk = vm.envUint("PRIVATE_KEY");
        deployer = vm.addr(pk);

        // Step 1: Quote return fee on Avalanche
        uint256 returnFee = _quoteReturnFee() * FEE_BUFFER / 100;
        console.log("Return fee (AVAX->ETH):", returnFee, "wei");

        // Step 2: Quote forward fee on Ethereum
        vm.selectFork(ethereumFork);
        bytes memory composeMsg = _buildComposeMessage(returnFee);
        SendParam memory sendParam = _prepareSendParam(composeMsg, returnFee);
        uint256 forwardFee = token.quoteSend(sendParam, false).nativeFee * FEE_BUFFER / 100;
        console.log("Forward fee (ETH->AVAX):", forwardFee, "wei");

        uint256 totalFee = forwardFee + returnFee;
        console.log("Total fee:", totalFee, "wei");
        console.log("Total fee:", totalFee / 1e15, "milliETH");

        require(deployer.balance >= totalFee, "Insufficient ETH");
        console.log("Balance:", deployer.balance, "wei [OK]\n");

        // Execute
        vm.startBroadcast(pk);
        (MessagingReceipt memory receipt,) = token.send{value: totalFee}(sendParam, MessagingFee(totalFee, 0), deployer);
        vm.stopBroadcast();

        console.log("=== SUCCESS ===");
        console.log("GUID:", vm.toString(receipt.guid));
        console.log("Track: https://layerzeroscan.com\n");
    }

    function _setupForks() internal {
        string memory ethRpc = vm.envString("ETHEREUM_MAINNET_RPC_URL");
        string memory avaxRpc;
        try vm.envString("AVALANCHE_MAINNET_RPC_URL") returns (string memory rpc) {
            avaxRpc = rpc;
        } catch {
            avaxRpc = "https://api.avax.network/ext/bc/C/rpc";
        }
        ethereumFork = vm.createFork(ethRpc);
        avalancheFork = vm.createFork(avaxRpc);
        vm.selectFork(ethereumFork);
    }

    function _loadConfig() internal {
        string memory ethJson = vm.readFile("./deployments/1.json");
        token = IOFT(vm.parseJsonAddress(ethJson, ".token"));

        string memory avaxJson = vm.readFile("./deployments/avalanche/ovault-hub.json");
        vaultComposer = vm.parseJsonAddress(avaxJson, ".vaultComposer");
        shareOFTAdapter = IOFT(vm.parseJsonAddress(avaxJson, ".shareOFTAdapter"));

        try vm.envAddress("TEST_RECIPIENT") returns (address r) {
            recipient = r;
        } catch {
            recipient = vm.addr(vm.envUint("PRIVATE_KEY"));
        }

        try vm.envUint("TEST_AMOUNT") returns (uint256 a) {
            depositAmount = a;
        } catch {
            depositAmount = DEFAULT_AMOUNT;
        }

        console.log("Deposit:", depositAmount / 1e6, "Token");
        console.log("Recipient:", recipient);
    }

    function _quoteReturnFee() internal returns (uint256) {
        vm.selectFork(avalancheFork);
        bytes memory opts = OptionsBuilder.newOptions().addExecutorLzReceiveOption(GAS_LIMIT_RETURN, 0);
        SendParam memory p = SendParam({
            dstEid: ETHEREUM_EID,
            to: bytes32(uint256(uint160(recipient))),
            amountLD: depositAmount,
            minAmountLD: 0,
            extraOptions: opts,
            composeMsg: "",
            oftCmd: ""
        });
        return shareOFTAdapter.quoteSend(p, false).nativeFee;
    }

    function _buildComposeMessage(uint256 minMsgValue) internal view returns (bytes memory) {
        bytes memory opts = OptionsBuilder.newOptions().addExecutorLzReceiveOption(GAS_LIMIT_RETURN, 0);
        SendParam memory p = SendParam({
            dstEid: ETHEREUM_EID,
            to: bytes32(uint256(uint160(recipient))),
            amountLD: depositAmount,
            minAmountLD: 0,
            extraOptions: opts,
            composeMsg: "",
            oftCmd: ""
        });
        return abi.encode(p, minMsgValue);
    }

    function _prepareSendParam(bytes memory composeMsg, uint256 returnFee) internal view returns (SendParam memory) {
        bytes memory opts = OptionsBuilder.newOptions().addExecutorLzReceiveOption(GAS_LIMIT_RECEIVE, 0)
            .addExecutorLzComposeOption(0, GAS_LIMIT_COMPOSE, uint128(returnFee));
        return SendParam({
            dstEid: AVALANCHE_EID,
            to: bytes32(uint256(uint160(vaultComposer))),
            amountLD: depositAmount,
            minAmountLD: depositAmount,
            extraOptions: opts,
            composeMsg: composeMsg,
            oftCmd: ""
        });
    }
}
