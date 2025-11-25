// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { IOAppCore, ILayerZeroEndpointV2 } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppCore.sol";

/**
 * @title OAppCore
 * @dev Abstract contract implementing the IOAppCore interface with basic OApp configurations.
 * @notice Abstract contract implementing the IOAppCore interface with basic OApp configurations.
 * @dev ADAPTED FOR: Storage-based endpoint + AccessControl (not Ownable)
 */
abstract contract OAppCoreUpgradeable is IOAppCore, Initializable {
    /// @custom:storage-location erc7201:layerzerov2.storage.oappcore
    struct OAppCoreStorage {
        // Storage-based endpoint for upgradeability
        ILayerZeroEndpointV2 endpoint;
        mapping(uint32 => bytes32) peers;
    }

    // keccak256(abi.encode(uint256(keccak256("layerzerov2.storage.oappcore")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant OAPP_CORE_STORAGE_LOCATION =
        0x72ab1bc1039b79dc4724ffca13de82c96834302d3c7e0d4252232d4b2dd8f900;

    function _getOAppCoreStorage() internal pure returns (OAppCoreStorage storage $) {
        assembly {
            $.slot := OAPP_CORE_STORAGE_LOCATION
        }
    }

    /// @dev Gets endpoint from storage
    function endpoint() public view returns (ILayerZeroEndpointV2) {
        return _getOAppCoreStorage().endpoint;
    }

    /**
     * @dev Initializes the OAppCore with the provided delegate.
     * @param _delegate The delegate capable of making OApp configurations inside of the endpoint.
     *
     * @dev The delegate typically should be set as the owner of the contract.
     * @dev Ownable is not initialized here on purpose. It should be initialized in the child contract to
     * accommodate the different version of Ownable.
     */
    /// @dev Initializes endpoint in storage and sets delegate
    function __OAppCore_init(address _endpoint, address _delegate) internal onlyInitializing {
        __OAppCore_init_unchained(_endpoint, _delegate);
    }

    function __OAppCore_init_unchained(address _endpoint, address _delegate) internal onlyInitializing {
        if (_delegate == address(0)) revert InvalidDelegate();

        OAppCoreStorage storage $ = _getOAppCoreStorage();
        $.endpoint = ILayerZeroEndpointV2(_endpoint);
        $.endpoint.setDelegate(_delegate);
    }

    /**
     * @notice Returns the peer address (OApp instance) associated with a specific endpoint.
     * @param _eid The endpoint ID.
     * @return peer The address of the peer associated with the specified endpoint.
     */
    function peers(uint32 _eid) public view override returns (bytes32) {
        OAppCoreStorage storage $ = _getOAppCoreStorage();
        return $.peers[_eid];
    }

    /**
     * @notice Sets the peer address (OApp instance) for a corresponding endpoint.
     * @param _eid The endpoint ID.
     * @param _peer The address of the peer to be associated with the corresponding endpoint.
     *
     * @dev Only the owner/admin of the OApp can call this function.
     * @dev Indicates that the peer is trusted to send LayerZero messages to this OApp.
     * @dev Set this to bytes32(0) to remove the peer address.
     * @dev Peer is a bytes32 to accommodate non-evm chains.
     */
    /// @dev Sets peer for endpoint (access control must be added by parent)
    function setPeer(uint32 _eid, bytes32 _peer) public virtual {
        OAppCoreStorage storage $ = _getOAppCoreStorage();
        $.peers[_eid] = _peer;
        emit PeerSet(_eid, _peer);
    }

    /**
     * @notice Internal function to get the peer address associated with a specific endpoint; reverts if NOT set.
     * ie. the peer is set to bytes32(0).
     * @param _eid The endpoint ID.
     * @return peer The address of the peer associated with the specified endpoint.
     */
    function _getPeerOrRevert(uint32 _eid) internal view virtual returns (bytes32) {
        OAppCoreStorage storage $ = _getOAppCoreStorage();
        bytes32 peer = $.peers[_eid];
        if (peer == bytes32(0)) revert NoPeer(_eid);
        return peer;
    }

    /**
     * @notice Sets the delegate address for the OApp.
     * @param _delegate The address of the delegate to be set.
     *
     * @dev Only the owner/admin of the OApp can call this function.
     * @dev Provides the ability for a delegate to set configs, on behalf of the OApp, directly on the Endpoint contract.
     */
    /// @dev Sets delegate on endpoint (access control must be added by parent)
    function setDelegate(address _delegate) public virtual {
        OAppCoreStorage storage $ = _getOAppCoreStorage();
        $.endpoint.setDelegate(_delegate);
    }
}
