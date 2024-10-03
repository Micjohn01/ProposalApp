import { Box } from "@radix-ui/themes";
import Layout from "./components/Layout";
import CreateProposalModal from "./components/CreateProposalModal";
import Proposals from "./components/Proposals";
import useContract from "./hooks/useContract";
import { useCallback, useEffect, useState } from "react";
import { Contract } from "ethers";
import useRunners from "./hooks/useRunners";
import { Interface } from "ethers";
import ABI from "./ABI/proposal.json";

const multicallAbi = [
    "function tryAggregate(bool requireSuccess, (address target, bytes callData)[] calls) returns ((bool success, bytes returnData)[] returnData)",
];

function App() {
    const readOnlyProposalContract = useContract(true);
    const { readOnlyProvider } = useRunners();
    const [proposals, setProposals] = useState([]);

    const fetchProposals = useCallback(async () => {
        if (!readOnlyProposalContract) return;

        const multicallContract = new Contract(
            import.meta.env.VITE_MULTICALL_ADDRESS,
            multicallAbi,
            readOnlyProvider
        );

        const itf = new Interface(ABI);

        try {
            const proposalCount = Number(
                await readOnlyProposalContract.proposalCount()
            );

            const proposalsIds = Array.from(
                { length: proposalCount - 1 },
                (_, i) => i + 1
            );

            const calls = proposalsIds.map((id) => ({
                target: import.meta.env.VITE_CONTRACT_ADDRESS,
                callData: itf.encodeFunctionData("proposals", [id]),
            }));

            const responses = await multicallContract.tryAggregate.staticCall(
                true,
                calls
            );

            const decodedResults = responses.map((res) =>
                itf.decodeFunctionResult("proposals", res.returnData)
            );

            const data = decodedResults.map((proposalStruct) => ({
                description: proposalStruct.description,
                amount: proposalStruct.amount,
                minRequiredVote: proposalStruct.minVotesToPass,
                votecount: proposalStruct.voteCount,
                deadline: proposalStruct.votingDeadline,
                executed: proposalStruct.executed,
            }));

            setProposals(data);
        } catch (error) {
            console.log("error fetching proposals: ", error);
        }
    }, [readOnlyProposalContract, readOnlyProvider]);

    const proposalWhenCreated = (proposalId, description, recipient, amount, votingDeadline, minVotesToPass) => {

        setProposals((prevproposals) =>[
            ...prevproposals,
            {
                proposalId,
                description: description,
                amount: amount,
                minVoteRequired: minVotesToPass,
                voteCount: 0,
                deadline: votingDeadline,
                executed: false
            }
        ])
    }

    const whenVoted = (proposalId, voter) => {

        setProposals((prevproposals) => prevproposals.map((proposal) => {
            if (Number(proposal.proposalId) === Number(proposalId)){
                return {
                    ...proposal,
                    voteCount: proposal.voteCount + 1
                };
            }
            return proposal;
        }))
    };

    useEffect(() => {
        if(!readOnlyProposalContract) return;
        readOnlyProposalContract.on("ProposalCreated", proposalWhenCreated);
        readOnlyProposalContract.on("Voted", whenVoted);
        fetchProposals();
        return () => {
            readOnlyProposalContract.off("ProposalCreated", proposalWhenCreated);
            readOnlyProposalContract.off("Voted", whenVoted);
        };
    }, [fetchProposals]);

    return (
        <Layout>
            <Box className="flex justify-end p-4">
                <CreateProposalModal />
            </Box>
            <Proposals proposals={proposals} />
        </Layout>
    );
}

export default App;
