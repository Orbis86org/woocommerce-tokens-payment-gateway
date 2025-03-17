import {WalletConnectContext} from "../../../contexts/WalletConnectContext";
import {useCallback, useContext, useEffect} from 'react';
import {WalletInterface} from "../walletInterface";
import {
    AccountId,
    Client,
    ContractExecuteTransaction,
    ContractId,
    Hbar,
    HbarUnit,
    LedgerId,
    TokenAssociateTransaction,
    TokenId,
    TransferTransaction
} from "@hashgraph/sdk";
import {ContractFunctionParameterBuilder} from "../contractFunctionParameterBuilder";
import {appConfig} from "../../../config";
import {SignClientTypes} from "@walletconnect/types";
import {DAppConnector, HederaChainId, HederaJsonRpcMethod, HederaSessionEvent,} from '@hashgraph/hedera-wallet-connect'
import EventEmitter from "events";
import eventBus from "../../../eventBus"

// Created refreshEvent because `dAppConnector.walletConnectClient.on(eventName, syncWithWalletConnectContext)` would not call syncWithWalletConnectContext
// Reference usage from walletconnect implementation https://github.com/hashgraph/hedera-wallet-connect/blob/main/src/lib/dapp/index.ts#L120C1-L124C9
const refreshEvent = new EventEmitter();

// Create a new project in walletconnect cloud to generate a project id
const currentNetworkConfig = appConfig.networks.testnet;
const hederaNetwork = currentNetworkConfig.network;
const hederaClient = Client.forName(hederaNetwork);

// Adapted from walletconnect dapp example:
// https://github.com/hashgraph/hedera-wallet-connect/blob/main/src/examples/typescript/dapp/main.ts#L87C1-L101C4
// Create a new project in walletconnect cloud to generate a project id
const projectId = window?.wctg_vars?.wallet_connect_project_id || '';
const siteUrl = window?.wctg_vars?.site_url || '';
const siteName = window?.wctg_vars?.site_name || '';
const network = window?.wctg_vars?.network || 'testnet'

const ledgerId = network == 'testnet' ? LedgerId.TESTNET : LedgerId.MAINNET;
const hederaChainId = network == 'testnet' ? HederaChainId.Testnet : HederaChainId.Mainnet;


const metadata: SignClientTypes.Metadata = {
  name: siteName,
  description: "",
  url: siteUrl,
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
}

const dAppConnector = new DAppConnector(
    metadata,
    ledgerId,
    projectId,
    Object.values(HederaJsonRpcMethod),
    [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
    [hederaChainId],
)


// ensure walletconnect is initialized only once
let walletConnectInitPromise: Promise<void> | undefined = undefined;
const initializeWalletConnect = async () => {


  if (walletConnectInitPromise === undefined) {
    walletConnectInitPromise = dAppConnector.init({ logger: 'error' });
  }

  await walletConnectInitPromise;
};

export const openWalletConnectModal = async () => {
  await initializeWalletConnect();

  try {
    return new Promise<boolean>((resolve) => {
      // Subscribe to modal state changes
      const unsubscribe = dAppConnector.walletConnectModal.subscribeModal((newState) => {
        if (!newState.open) {
          // console.log('Modal was closed');
          unsubscribe(); // Clean up the listener
          resolve(false); // Resolve the promise with false
        }
      });

      // Open the modal and handle session flow
      dAppConnector.openModal().then(async (session) => {
        unsubscribe(); // Clean up the listener

        // Check if the session is acknowledged
        if (session.acknowledged) {
          refreshEvent.emit("sync");

          eventBus.emit('walletConnected', {
            connected: true,
            account_id: dAppConnector.signers[0]?.getAccountId()?.toString()
          }); // You can pass data as needed


          resolve(true); // Resolve with true for successful connection
        } else {
          refreshEvent.emit("sync");

          resolve(false); // Resolve with false if not fully connected
        }
      }).catch((error) => {
        refreshEvent.emit("sync");

        // console.error('Error during modal interaction:', error);
        unsubscribe(); // Clean up the listener
        resolve(false); // Resolve with false on error
      });
    });
  } catch (error) {
    // Handle modal closure or other errors

    return false;
  }

};

class WalletConnectWallet implements WalletInterface {
  public getSigner() {
    if (dAppConnector.signers.length === 0) {
      throw new Error('No signers found!');
    }
    return dAppConnector.signers[0];
  }

  public getAccountId() {
    // Need to convert from walletconnect's AccountId to hashgraph/sdk's AccountId because walletconnect's AccountId and hashgraph/sdk's AccountId are not the same!
    return AccountId.fromString(this.getSigner().getAccountId().toString());
  }

  async transferHBAR(toAddress: AccountId, amount: number, returnRawTransaction = false ) {
   const transferHBARTransaction = new TransferTransaction()
        // .setNodeAccountIds(  [ new AccountId(3) ] )
        .addHbarTransfer(this.getAccountId(), new Hbar(-amount, HbarUnit.Hbar)) // Sender
        .addHbarTransfer(toAddress, new Hbar(amount, HbarUnit.Hbar)); // Receiver

    if( returnRawTransaction ){
      return transferHBARTransaction;
    }

    const signer = this.getSigner();

    try {
      // Freeze and sign
      await transferHBARTransaction.freezeWithSigner(signer);
      console.log("Transaction frozen successfully");

      // Execute transaction
      const txResult = await transferHBARTransaction.executeWithSigner(signer);
      console.log("Transaction executed, txResult:", txResult);
      console.log('Executed Transaction: ', txResult.toString() );

      return txResult ? txResult.transactionId : null;
    } catch (error) {
      console.error("Error executing transaction:", error);
      return null;
    }
  }


  async executeTransaction( transaction ){
    const signer = this.getSigner();

    try {
      // Freeze and sign
      await transaction.freezeWithSigner(signer);
      console.log("Transaction frozen successfully");

      const signedTx = await signer.signTransaction(transaction);
      console.log("Signed Transaction:", signedTx);

      // Execute transaction
      const txResult = await transaction.executeWithSigner(signer);
      console.log("Transaction executed, txResult:", txResult);
      console.log('Executed Transaction: ', txResult.toString() );

      return txResult ? txResult.transactionId : null;
    } catch (error) {
      console.error("Error executing transaction:", error);
      return null;
    }
  }


  async transferFungibleToken(toAddress: AccountId, tokenId: TokenId, amount: number, returnRawTransaction = false ) {
    const transferTokenTransaction = new TransferTransaction()
        .addTokenTransfer(tokenId, this.getAccountId(), -amount)
        .addTokenTransfer(tokenId, toAddress.toString(), amount);

    if( returnRawTransaction ){
      return transferTokenTransaction;
    }

    const signer = this.getSigner();
    await transferTokenTransaction.freezeWithSigner(signer);
    const txResult = await transferTokenTransaction.executeWithSigner(signer);
    return txResult ? txResult.transactionId : null;
  }

  async transferNonFungibleToken(toAddress: AccountId, tokenId: TokenId, serialNumber: number) {
    const transferTokenTransaction = new TransferTransaction()
        .addNftTransfer(tokenId, serialNumber, this.getAccountId(), toAddress);

    const signer = this.getSigner();
    await transferTokenTransaction.freezeWithSigner(signer);
    const txResult = await transferTokenTransaction.executeWithSigner(signer);
    return txResult ? txResult.transactionId : null;
  }

  async associateToken(tokenId: TokenId) {
    const associateTokenTransaction = new TokenAssociateTransaction()
        .setAccountId(this.getAccountId())
        .setTokenIds([tokenId]);

    const signer = this.getSigner();
    await associateTokenTransaction.freezeWithSigner(signer);
    const txResult = await associateTokenTransaction.executeWithSigner(signer);
    return txResult ? txResult.transactionId : null;
  }

  // Purpose: build contract execute transaction and send to wallet for signing and execution
  // Returns: Promise<TransactionId | null>
  async executeContractFunction(contractId: ContractId, functionName: string, functionParameters: ContractFunctionParameterBuilder, gasLimit: number) {
    const tx = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(gasLimit)
        .setFunction(functionName, functionParameters.buildHAPIParams());

    const signer = this.getSigner();
    await tx.freezeWithSigner(signer);
    const txResult = await tx.executeWithSigner(signer);

    // in order to read the contract call results, you will need to query the contract call's results form a mirror node using the transaction id
    // after getting the contract call results, use ethers and abi.decode to decode the call_result
    return txResult ? txResult.transactionId : null;
  }
  disconnect() {
    dAppConnector.disconnectAll().then(() => {
      refreshEvent.emit("sync");
      localStorage.removeItem('hederaAccountId')
    });
  }
}
export const walletConnectWallet = new WalletConnectWallet();

// this component will sync the walletconnect state with the context
export const WalletConnectClient = () => {
  // use the HashpackContext to keep track of the hashpack account and connection
  const { setAccountId, setIsConnected } = useContext(WalletConnectContext);

  // sync the walletconnect state with the context
  const syncWithWalletConnectContext = useCallback(() => {
    const accountId = dAppConnector.signers[0]?.getAccountId()?.toString();
    if (accountId) {
      setAccountId(accountId);
      setIsConnected(true);
      localStorage.setItem('hederaAccountId', accountId)
    } else {
      setAccountId('');
      setIsConnected(false);
    }
  }, [setAccountId, setIsConnected]);

  useEffect(() => {
    // Sync after walletconnect finishes initializing
    refreshEvent.addListener("sync", syncWithWalletConnectContext);

    initializeWalletConnect().then(() => {
      syncWithWalletConnectContext();
    });

    return () => {
      refreshEvent.removeListener("sync", syncWithWalletConnectContext);
    }
  }, [syncWithWalletConnectContext]);


  return null;
};
