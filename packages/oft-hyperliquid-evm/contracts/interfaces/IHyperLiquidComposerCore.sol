// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IOAppComposer } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";
import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

struct IHyperAsset {
    address assetBridgeAddress;
    uint64 coreIndexId;
    uint64 decimalDiff;
}

struct IHyperAssetAmount {
    uint256 evm;
    uint256 dust; // This is the refund amount
    uint64 core;
}

interface IHyperLiquidComposerCore {
    event errorRefund(address refundTo, uint256 refundAmount);
    event errorNativeRefund_Failed(address refundTo, uint256 refundAmount);

    function endpoint() external view returns (address);
    function oft() external view returns (IOFT);
    function token() external view returns (IERC20);
    function L1WritePrecompileAddress() external view returns (address);
    function L1ReadPrecompileAddress_SpotBalance() external view returns (address);

    function quoteHyperCoreAmount(uint256 _amount, bool _isOFT) external returns (IHyperAssetAmount memory);
    function balanceOfHyperCore(address _user, uint64 _tokenId) external view returns (uint64);
    function getOFTAsset() external view returns (IHyperAsset memory);
    function getHypeAsset() external view returns (IHyperAsset memory);
    function refundTokens(bytes calldata err) external payable returns (bytes memory);
    function refundNativeTokens(address refundAddress) external payable;
}
