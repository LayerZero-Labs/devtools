// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";
import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

struct IHyperAsset {
    address assetBridgeAddress;
    uint64 coreIndexId;
    int64 decimalDiff;
}

struct IHyperAssetAmount {
    uint256 evm;
    uint256 dust; // This is the refund amount
    uint64 core;
}

interface IHyperLiquidComposerCore {
    // 0xeb907f6e
    event ErrorERC20_Refund(address refundTo, uint256 refundAmount);
    // 0x0b0fd82e
    event ErrorHYPE_Refund(address refundTo, uint256 refundAmount);
    // 0x612baef0
    event ErrorMessage(bytes reason);

    // 0xbb643711
    event ExcessHYPE_Refund(address refundTo, uint256 refundAmount);

    function endpoint() external view returns (address);
    function oft() external view returns (IOFT);
    function token() external view returns (IERC20);
    function HLP_PRECOMPILE_WRITE() external view returns (address);
    function HLP_PRECOMPILE_READ_SPOT_BALANCE() external view returns (address);

    function oftAsset() external view returns (address, uint64, int64);
    function hypeAsset() external view returns (address, uint64, int64);

    function HYPE_CHAIN_ID_TESTNET() external pure returns (uint256);
    function HYPE_CHAIN_ID_MAINNET() external pure returns (uint256);

    function HYPE_INDEX_TESTNET() external pure returns (uint64);
    function HYPE_INDEX_MAINNET() external pure returns (uint64);

    function hypeIndexByChainId(uint256 _chainId) external view returns (uint64);

    function validate_addresses_or_refund(
        bytes calldata _maybeReceiver,
        bytes32 _senderBytes32,
        uint256 _amountLD
    ) external returns (address _receiver);
    function quoteHyperCoreAmount(uint256 _amount, bool _isOFT) external returns (IHyperAssetAmount memory);
    function balanceOfHyperCore(address _user, uint64 _tokenId) external view returns (uint64);
    function getOFTAsset() external view returns (IHyperAsset memory);
    function getHypeAsset() external view returns (IHyperAsset memory);
    function refundNativeTokens(address refundAddress) external payable;
}
