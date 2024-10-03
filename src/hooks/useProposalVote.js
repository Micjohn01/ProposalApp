import { useCallback } from "react";
import { toast } from "react-toastify";
import useContract from "./useContract";
import { useAppKitAccount } from "@reown/appkit/react";
import { useAppKitNetwork } from "@reown/appkit/react";
import { liskSepoliaNetwork } from "../connection";

const useProposalVote = () => {
    const contract = useContract(true);
    const { address } = useAppKitAccount();
    const { chainId } = useAppKitNetwork();
    return useCallback(
        async (proposalId) => {
            if (
                !proposalId
            ) {
                toast.error("Empty proposal ID");
                return;
            }
            if (!address) {
                toast.error("Connect your wallet!");
                return;
            }
            if (Number(chainId) !== liskSepoliaNetwork.chainId) {
                toast.error("You are not connected to the right network");
                return;
            }

            if (!contract) {
                toast.error("Cannot get contract!");
                return;
            }

            try {
                const estimatedGas = await contract.createProposal.estimateGas(
                    proposalId
                );
                const tx = await contract.createProposal(
                    proposalId,
                    {
                        gasLimit: (estimatedGas * BigInt(120)) / BigInt(100),
                    }
                );
                const reciept = await tx.wait();

                if (reciept.status === 1) {
                    toast.success("Successfully voted");
                    return;
                }
                toast.error("Voting failed");
                return;
            } catch (error) {
                console.error("error while voting: ", error);
                toast.error("Vote errored");
            }
        },
        [address, chainId, contract]
    );
};

export default useProposalVote;
