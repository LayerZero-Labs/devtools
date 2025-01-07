module initia_std::query {
    use initia_std::string::{Self, String};
    use initia_std::json;

    /*
    type QueryProposalResponse struct {
        Proposal *Proposal `protobuf:"bytes,1,opt,name=proposal,proto3" json:"proposal,omitempty"`
    }

    type Proposal struct {
        Id uint64 `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
        Messages []*types1.Any `protobuf:"bytes,2,rep,name=messages,proto3" json:"messages,omitempty"`
        Status v1.ProposalStatus `protobuf:"varint,3,opt,name=status,proto3,enum=cosmos.gov.v1.ProposalStatus" json:"status,omitempty"`
        FinalTallyResult *v1.TallyResult `protobuf:"bytes,4,opt,name=final_tally_result,json=finalTallyResult,proto3" json:"final_tally_result,omitempty"`
        SubmitTime *time.Time `protobuf:"bytes,5,opt,name=submit_time,json=submitTime,proto3,stdtime" json:"submit_time,omitempty"`
        DepositEndTime *time.Time `protobuf:"bytes,6,opt,name=deposit_end_time,json=depositEndTime,proto3,stdtime" json:"deposit_end_time,omitempty"`
        TotalDeposit []types.Coin `protobuf:"bytes,7,rep,name=total_deposit,json=totalDeposit,proto3" json:"total_deposit"`
        VotingStartTime *time.Time `protobuf:"bytes,8,opt,name=voting_start_time,json=votingStartTime,proto3,stdtime" json:"voting_start_time,omitempty"`
        VotingEndTime          *time.Time `protobuf:"bytes,9,opt,name=voting_end_time,json=votingEndTime,proto3,stdtime" json:"voting_end_time,omitempty"`
        EmergencyStartTime     *time.Time `protobuf:"bytes,10,opt,name=emergency_start_time,json=emergencyStartTime,proto3,stdtime" json:"emergency_start_time,omitempty"`
        EmergencyNextTallyTime *time.Time `protobuf:"bytes,11,opt,name=emergency_next_tally_time,json=emergencyNextTallyTime,proto3,stdtime" json:"emergency_next_tally_time,omitempty"`
        Metadata string `protobuf:"bytes,12,opt,name=metadata,proto3" json:"metadata,omitempty"`

        Title string `protobuf:"bytes,13,opt,name=title,proto3" json:"title,omitempty"`

        Summary string `protobuf:"bytes,14,opt,name=summary,proto3" json:"summary,omitempty"`

        Proposer string `protobuf:"bytes,15,opt,name=proposer,proto3" json:"proposer,omitempty"`

        Expedited bool `protobuf:"varint,16,opt,name=expedited,proto3" json:"expedited,omitempty"`
        Emergency bool `protobuf:"varint,17,opt,name=emergency,proto3" json:"emergency,omitempty"`

        FailedReason string `protobuf:"bytes,18,opt,name=failed_reason,json=failedReason,proto3" json:"failed_reason,omitempty"`
    }

    */

    struct ProposalRequest has copy, drop {
        proposal_id: u64
    }

    struct ProposalResponse has copy, drop {
        id: u64,
        title: String,
        summary: String,
        status: String,
        submit_time: String,
        emergency: bool
    }

    #[view]
    public fun get_proposal(proposal_id: u64): (u64, String, String, String) {
        let response =
            query_stargate(
                b"/initia.gov.v1.Query/Proposal",
                json::marshal(&ProposalRequest { proposal_id })
            );
        let res = json::unmarshal<ProposalResponse>(response);
        (res.id, res.title, res.summary, string::utf8(response))
    }

    #[view]
    public fun get_proposal_status(proposal_id: u64): (u64, String, String, bool) {
        let response =
            query_stargate(
                b"/initia.gov.v1.Query/Proposal",
                json::marshal(&ProposalRequest { proposal_id })
            );
        let res = json::unmarshal<ProposalResponse>(response);
        (res.id, res.status, res.submit_time, res.emergency)
    }

    /// query_custom examples are in initia_stdlib::address module
    native public fun query_custom(name: vector<u8>, data: vector<u8>): vector<u8>;
    native public fun query_stargate(path: vector<u8>, data: vector<u8>): vector<u8>;

    #[test_only]
    native public fun set_query_response(
        path_or_name: vector<u8>, data: vector<u8>, response: vector<u8>
    );

    #[test_only]
    native public fun unset_query_response(
        path_or_name: vector<u8>, data: vector<u8>
    );

    #[test]
    fun test_query_custom() {
        set_query_response(b"path", b"data123", b"output");

        let res = query_custom(b"path", b"data123");
        assert!(res == b"output", 0);
    }

    #[test]
    fun test_query_stargate() {
        set_query_response(b"path", b"data123", b"output");

        let res = query_stargate(b"path", b"data123");
        assert!(res == b"output", 0);
    }

    #[test]
    #[expected_failure(abort_code = 0x1006E, location = Self)]
    fun test_query_unsset() {
        set_query_response(b"path", b"data123", b"output");
        unset_query_response(b"path", b"data123");

        let res = query_custom(b"path", b"data123");
        assert!(res == b"", 0);
    }
}
