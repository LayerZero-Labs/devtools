// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OApp, Origin, MessagingFee, MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EvidenceOracle
 * @notice Procedural Proof — A new trust primitive for AI-era cross-chain governance.
 *
 * This OApp implements a four-layer epistemic governance architecture:
 *   1. Evidence Layer: AI submits decision + evidence hash (IPFS CID commitment)
 *   2. Verification Layer: Independent verifiers audit AI's SOP compliance
 *   3. Distribution Layer: LayerZero dispatches verified decisions cross-chain
 *   4. Execution Layer: Target chain receives and acts on verified decisions
 *
 * Trust model isomorphic to LayerZero DVN:
 *   - DVN verifies message transport integrity (hash comparison)
 *   - EvidenceOracle verifies AI process compliance (SOP audit)
 *   - Both are permissionlessly challengeable (fraud proof via replay)
 *
 * @dev Inherits OApp for native LayerZero V2 cross-chain messaging.
 */
contract EvidenceOracle is OApp, OAppOptionsType3 {

    // ═══════════════════════════════════════════
    //  STRUCTS
    // ═══════════════════════════════════════════

    struct Decision {
        bytes32 evidenceCid;     // IPFS CID of full evidence package
        bytes32 sopHash;         // keccak256 of the SOP document used
        bytes32 conclusionHash;  // keccak256 of AI's conclusion
        uint8 conclusion;        // 0=NO_TRIGGER, 1=TRIGGER
        uint64 timestamp;        // when AI executed the SOP
        address submitter;       // AI agent address
        uint8 approvals;         // verifier approval count
        uint8 rejections;        // verifier rejection count
        bool dispatched;         // whether cross-chain dispatch occurred
        bool challenged;         // whether a challenge was raised
    }

    struct SOP {
        bytes32 sopHash;
        string name;
        string ipfsCid;          // full SOP doc on IPFS
        bool active;
    }

    // ═══════════════════════════════════════════
    //  STATE
    // ═══════════════════════════════════════════

    uint256 public decisionCount;
    uint8 public threshold = 2;              // approvals needed for dispatch

    mapping(uint256 => Decision) public decisions;
    mapping(bytes32 => SOP) public sops;     // sopHash => SOP
    mapping(address => bool) public verifiers;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // ═══════════════════════════════════════════
    //  EVENTS
    // ═══════════════════════════════════════════

    event SOPRegistered(bytes32 indexed sopHash, string name, string ipfsCid);
    event DecisionSubmitted(uint256 indexed id, address submitter, bytes32 evidenceCid, bytes32 sopHash);
    event DecisionVerified(uint256 indexed id, address verifier, bool approved);
    event DecisionDispatched(uint256 indexed id, uint32 dstEid, bytes32 receiver);
    event DecisionChallenged(uint256 indexed id, address challenger, string reason);
    event VerifierUpdated(address verifier, bool status);

    // ═══════════════════════════════════════════
    //  CONSTRUCTOR
    // ═══════════════════════════════════════════

    constructor(
        address _endpoint,
        address _delegate
    ) OApp(_endpoint, _delegate) Ownable(_delegate) {}

    // ═══════════════════════════════════════════
    //  SOP MANAGEMENT
    // ═══════════════════════════════════════════

    /// @notice Register a new Standard Operating Procedure
    /// @param name Human-readable SOP name
    /// @param ipfsCid IPFS CID where the full SOP document is stored
    function registerSOP(string calldata name, string calldata ipfsCid) external onlyOwner {
        bytes32 sopHash = keccak256(abi.encodePacked(name, ipfsCid));
        sops[sopHash] = SOP(sopHash, name, ipfsCid, true);
        emit SOPRegistered(sopHash, name, ipfsCid);
    }

    // ═══════════════════════════════════════════
    //  VERIFIER MANAGEMENT
    // ═══════════════════════════════════════════

    function setVerifier(address verifier, bool status) external onlyOwner {
        verifiers[verifier] = status;
        emit VerifierUpdated(verifier, status);
    }

    function setThreshold(uint8 _threshold) external onlyOwner {
        threshold = _threshold;
    }

    // ═══════════════════════════════════════════
    //  LAYER 1: EVIDENCE SUBMISSION
    // ═══════════════════════════════════════════

    /// @notice AI agent submits a decision with evidence commitment
    /// @param evidenceCid IPFS CID of the full evidence package (inputs, steps, outputs)
    /// @param sopHash Which SOP was followed
    /// @param conclusionHash keccak256 of the conclusion data
    /// @param conclusion 0=NO_TRIGGER, 1=TRIGGER
    function submitDecision(
        bytes32 evidenceCid,
        bytes32 sopHash,
        bytes32 conclusionHash,
        uint8 conclusion
    ) external returns (uint256 decisionId) {
        require(sops[sopHash].active, "SOP not registered or inactive");

        decisionId = decisionCount++;
        decisions[decisionId] = Decision({
            evidenceCid: evidenceCid,
            sopHash: sopHash,
            conclusionHash: conclusionHash,
            conclusion: conclusion,
            timestamp: uint64(block.timestamp),
            submitter: msg.sender,
            approvals: 0,
            rejections: 0,
            dispatched: false,
            challenged: false
        });

        emit DecisionSubmitted(decisionId, msg.sender, evidenceCid, sopHash);
    }

    // ═══════════════════════════════════════════
    //  LAYER 2: SOP COMPLIANCE VERIFICATION
    // ═══════════════════════════════════════════

    /// @notice Verifier audits evidence against SOP and votes
    /// @dev Isomorphic to DVN hash verification — verifier checks process, not conclusion
    function verify(uint256 decisionId, bool approved) external {
        require(verifiers[msg.sender], "Not a registered verifier");
        require(!hasVoted[decisionId][msg.sender], "Already voted");
        require(!decisions[decisionId].dispatched, "Already dispatched");

        hasVoted[decisionId][msg.sender] = true;

        if (approved) {
            decisions[decisionId].approvals++;
        } else {
            decisions[decisionId].rejections++;
        }

        emit DecisionVerified(decisionId, msg.sender, approved);
    }

    // ═══════════════════════════════════════════
    //  LAYER 3: CROSS-CHAIN DISPATCH (LayerZero)
    // ═══════════════════════════════════════════

    /// @notice Dispatch verified decision to target chain via LayerZero
    /// @param decisionId The decision to dispatch
    /// @param dstEid LayerZero Endpoint ID of target chain
    /// @param options LayerZero execution options (gas, value)
    function dispatch(
        uint256 decisionId,
        uint32 dstEid,
        bytes calldata options
    ) external payable returns (MessagingReceipt memory receipt) {
        Decision storage d = decisions[decisionId];
        require(d.approvals >= threshold, "Threshold not met");
        require(!d.dispatched, "Already dispatched");

        d.dispatched = true;

        // Encode the verified decision for cross-chain delivery
        bytes memory payload = abi.encode(
            decisionId,
            d.evidenceCid,
            d.sopHash,
            d.conclusionHash,
            d.conclusion,
            d.approvals
        );

        receipt = _lzSend(dstEid, payload, options, MessagingFee(msg.value, 0), payable(msg.sender));

        emit DecisionDispatched(decisionId, dstEid, peers[dstEid]);
    }

    /// @notice Quote the fee for dispatching a decision
    function quoteDispatch(
        uint256 decisionId,
        uint32 dstEid,
        bytes calldata options
    ) external view returns (MessagingFee memory fee) {
        Decision storage d = decisions[decisionId];
        bytes memory payload = abi.encode(
            decisionId,
            d.evidenceCid,
            d.sopHash,
            d.conclusionHash,
            d.conclusion,
            d.approvals
        );
        fee = _quote(dstEid, payload, options, false);
    }

    // ═══════════════════════════════════════════
    //  LAYER 4: RECEIVE (Target Chain)
    // ═══════════════════════════════════════════

    /// @notice Handle incoming verified decision from source chain
    /// @dev Override this in your target-chain contract to execute domain logic
    function _lzReceive(
        Origin calldata /*_origin*/,
        bytes32 /*_guid*/,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        (
            uint256 decisionId,
            bytes32 evidenceCid,
            bytes32 sopHash,
            bytes32 conclusionHash,
            uint8 conclusion,
            uint8 approvals
        ) = abi.decode(_message, (uint256, bytes32, bytes32, bytes32, uint8, uint8));

        // Store received decision — extend this for domain-specific execution
        decisions[decisionId] = Decision({
            evidenceCid: evidenceCid,
            sopHash: sopHash,
            conclusionHash: conclusionHash,
            conclusion: conclusion,
            timestamp: uint64(block.timestamp),
            submitter: address(0),   // cross-chain, original submitter not preserved
            approvals: approvals,
            rejections: 0,
            dispatched: true,
            challenged: false
        });
        decisionCount++;
    }

    // ═══════════════════════════════════════════
    //  CHALLENGE (Fraud Proof)
    // ═══════════════════════════════════════════

    /// @notice Anyone can challenge a decision by providing evidence of SOP violation
    /// @dev Off-chain: challenger fetches evidence from IPFS, replays SOP, finds violation
    function challenge(uint256 decisionId, string calldata reason) external {
        require(decisions[decisionId].approvals > 0, "Decision does not exist");
        decisions[decisionId].challenged = true;
        emit DecisionChallenged(decisionId, msg.sender, reason);
        // In production: slash verifiers who approved a fraudulent decision
    }
}
