// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IMintableBurnable } from "@layerzerolabs/oft-evm/contracts/interfaces/IMintableBurnable.sol";

interface IERC7802 {
    event CrosschainBurn(address indexed from, uint256 amount, address indexed sender);
    event CrosschainMint(address indexed to, uint256 amount, address indexed sender);

    function crosschainBurn(address _from, uint256 _amount) external;
    function crosschainMint(address _to, uint256 _amount) external;
}

contract SuperChainMintBurnERC20 is ERC20, IERC7802, IMintableBurnable, Ownable {
    address public TOKEN_BRIDGE;

    error Unauthorized();
    error InvalidTokenBridgeAddress();

    event SetTokenBridge(address _tokenBridge);

    constructor(string memory name, string memory symbol) ERC20(name, symbol) Ownable(msg.sender) {}

    modifier onlyTokenBridge() {
        if (msg.sender != TOKEN_BRIDGE) revert Unauthorized();
        _;
    }

    function setTokenBridge(address _tokenBridge) external onlyOwner {
        if (_tokenBridge == address(0)) revert InvalidTokenBridgeAddress();

        TOKEN_BRIDGE = _tokenBridge;
        emit SetTokenBridge(_tokenBridge);
    }

    // @notice 'sender' in these contexts is the caller, i.e. the current tokenBridge,
    // It is NOT the 'sender' from the src chain who initialized the transfer

    // Functions to handle IERC7802.sol
    function crosschainBurn(address _from, uint256 _amount) external onlyTokenBridge {
        _burn(_from, _amount);
        emit CrosschainBurn(_from, _amount, msg.sender);
    }
    function crosschainMint(address _to, uint256 _amount) external onlyTokenBridge {
        _mint(_to, _amount);
        emit CrosschainMint(_to, _amount, msg.sender);
    }

    // Functions to handle MintBurnOFTAdapter.sol
    function burn(address _from, uint256 _amount) external onlyTokenBridge returns (bool) {
        _burn(_from, _amount);
        emit CrosschainBurn(_from, _amount, msg.sender);
        return true;
    }
    function mint(address _to, uint256 _amount) external onlyTokenBridge returns (bool) {
        _mint(_to, _amount);
        emit CrosschainMint(_to, _amount, msg.sender);
        return true;
    }
}
