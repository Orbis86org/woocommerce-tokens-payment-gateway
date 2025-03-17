import {AccountId, ContractId, TokenId, TransactionId, TransferTransaction} from "@hashgraph/sdk";
import {ContractFunctionParameterBuilder} from "./contractFunctionParameterBuilder";

export interface WalletInterface {
  getAccountId: () => AccountId;
  getSigner: () => any;
  signAndFreezeTransaction: () => any;
  executeTransaction: () => any;
  executeContractFunction: (contractId: ContractId, functionName: string, functionParameters: ContractFunctionParameterBuilder, gasLimit: number) => Promise<TransactionId | TransferTransaction | string | null>;
  disconnect: () => void;
  transferHBAR: (toAddress: AccountId, amount: number, returnRawTransaction: boolean) => Promise<TransactionId | string | null>;
  transferFungibleToken: (toAddress: AccountId, tokenId: TokenId, amount: number, returnRawTransaction: boolean ) => Promise<TransactionId | string | null>;
  transferNonFungibleToken: (toAddress: AccountId, tokenId: TokenId, serialNumber: number) => Promise<TransactionId | string | null>;
  associateToken: (tokenId: TokenId) => Promise<TransactionId | string | null>;
}