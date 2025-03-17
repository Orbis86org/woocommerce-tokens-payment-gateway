/**
 * This popup shows the payment form. It is triggered by clicking, 'Place Order' on
 * WooCommerce Checkout.
 *
 * It works as follows:
 * 1. It loads supported SaucerSwap tokens and displays them on the select field.
 *    It also shows the order price in the token's price e.g. 3560 SAUCE.
 * 2. It checks the tokens in the associated wallet - is this necessary?
 * 3. User makes the payment and tokens transferred to treasury wallet.
 * 4. The tokens are converted to HBAR or USDC.
 */
import React, {useContext, useEffect, useState} from "react";
import * as ethers from 'ethers';
import {
    AccountAllowanceApproveTransaction,
    AccountId,
    Client,
    ContractExecuteTransaction,
    ContractFunctionParameters,
    ContractId,
    EntityIdHelper,
    Hbar,
    HbarUnit,
    PrivateKey,
    TokenId,
    TransactionRecordQuery
} from '@hashgraph/sdk';
import {Button, Flex, message, Modal, Select, Spin, Steps, Typography} from 'antd';
import QuoterV2Abi from './QuoterV2.json';
import SwapV2Abi from './SwapV2.json';
import axios from "axios";
import ConnectWallet from "../ConnectWallet";
import {WalletConnectContext, WalletConnectContextProvider} from "../contexts/WalletConnectContext";
import {useWalletInterface} from "../services/wallets/useWalletInterface";
import eventBus from "../eventBus";

const { Text } = Typography;

export function PaymentPopup({ open, handleClose }) {
    /**
     * MAINNET AND TESTNET VARIABLES
     *
     * https://docs.saucerswap.finance/developer/contract-deployments
     */
    let myAccountId = AccountId.fromString(window.wtpg_price_formatter_params.hedera_account_id);
    let quoterV2ContractAddress = null;
    let swapV2ContractAddress = null;
    let saucerSwapV1RouterV3 = null;
    let whbarHelperContractAddress = null;
    let whbarTokenId = null;
    let saucerSwapApiUrl = null;
    let network = window.wtpg_price_formatter_params.network;
    let swapToken = window.wtpg_price_formatter_params.swap_token == 'yes';

    

    if (network === 'mainnet') {
        quoterV2ContractAddress = '0.0.3949424';
        swapV2ContractAddress = '0.0.3949434';
        saucerSwapV1RouterV3 = '0.0.3045981';
        whbarHelperContractAddress = '0.0.5808826';
        whbarTokenId = '0.0.1456986';
        saucerSwapApiUrl = 'https://api.saucerswap.finance';
    } else {
        quoterV2ContractAddress = '0.0.1390002';
        swapV2ContractAddress = '0.0.1414040';
        saucerSwapV1RouterV3 = '0.0.19264';
        whbarHelperContractAddress = '0.0.4371947';
        whbarTokenId = '0.0.15058';
        saucerSwapApiUrl = 'https://test-api.saucerswap.finance';
    }

    /*
     * Order Details
     */
    let orderTotal = window.wtpg_price_formatter_params.total;
    let supportedTokens = window.wtpg_price_formatter_params.tokens;
    let defaultToken = window.wtpg_price_formatter_params.default_token;

    /**
     * Hedera Variables and Functions
     */
    // Convert Hedera Account to EVM address
    const convertAccountIdToEVMAddress = (accountId) => {
            const { shard, realm, num } = EntityIdHelper.fromString(accountId);
            return '0x' + EntityIdHelper.toSolidityAddress([shard, realm, num]);
        };

    /*
     * Get account balance
     */
    const getAccountHbarBalance = async (accountIdOrEvmAddress) => {
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");

        const requestOptions = {
            method: "GET",
            redirect: "follow"
        };

        let mirrorNodeBaseUrl = `https://${network}.mirrornode.hedera.com`;
        const url = `${mirrorNodeBaseUrl}/api/v1/accounts/${accountIdOrEvmAddress}`;
        let fetchResponse = await fetch(url, requestOptions);
        let balanceResponse = await (fetchResponse.json());

        if (balanceResponse.balance && balanceResponse.balance.balance) {
            return Hbar.fromTinybars(balanceResponse.balance.balance).toString();
        }

        return false;
    };

    const getAccountTokenBalance = async (tokenId, accountIdOrEvmAddress) => {
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");

        const requestOptions = {
            method: "GET",
            redirect: "follow"
        };

        let mirrorNodeBaseUrl = `https://${network}.mirrornode.hedera.com`;
        const url = `${mirrorNodeBaseUrl}/api/v1/accounts/${accountIdOrEvmAddress}/tokens`;
        let fetchResponse = await fetch(url, requestOptions);
        let balanceResponse = await (fetchResponse.json());

        let balance = 0;
        if (balanceResponse?.tokens) {
            balanceResponse?.tokens?.forEach(function (item, index, array) {
                if (item.token_id === tokenId) {
                    balance = item.balance / Math.pow(10, item.decimals);
                }
            });
        }

        if (balance > 0) {
            return balance;
        }

        return false;
    };

    const { accountId: address, setAccountId, isConnected, setIsConnected } = useContext(WalletConnectContext);
    const { walletInterface } = useWalletInterface();

    /**
     * Transfer HBAR
     *
     * @param toAddress
     * @param amount - In full HBAR amount
     */
    const transferHBAR = async (toAddress, amount) => {
        return await walletInterface.transferHBAR(toAddress, amount);
    };

    /**
     * Swap HBAR To Default Token and Transfer
     *
     * The steps are:
     * 1. Client associates with default token
     * 2. Client swaps HBAR for token
     * 3. The received token is then transferred to store address
     *
     * @param toAddress - The treasury wallet address
     * @param amount - In full HBAR amount
     * @returns Transaction ID or false on failure
     */
    const swapHBARToDefaultTokenAndTransferToStore = async (toAddress, amount) => {
        if (defaultToken.id === 'hbar') {
            return await transferHBAR(toAddress, amount);
        }

        try {
            /*
             * Step 1: Pre-check - Ensure the client wallet is associated with the default token.
             *
             */
            const tokenId = TokenId.fromString(defaultToken.id); // e.g., '0.0.11835358' for SAUCE
            const isAssociated = await walletInterface.associateToken(tokenId);
            if (!isAssociated) {
                console.error('Failed to associate default token:', defaultToken.id);
                return false;
            }

            // Step 2: Define swap parameters
            const swapRouterContractId = ContractId.fromString(swapV2ContractAddress); // e.g., '0.0.1414040' for testnet
            const inputHbar = Hbar.from(amount, HbarUnit.Hbar);
            const inputTinybar = inputHbar.toTinybars().toString();
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20-minute deadline

            // Token path: E.g. [SAUCE, WHBAR] (reverse path for exactInput: tokenOut -> tokenIn)
            const tokenIn = TokenId.fromString(whbarTokenId).toSolidityAddress(); // WHBAR (e.g., '0.0.15058')
            const tokenOut = TokenId.fromString(defaultToken.id).toSolidityAddress(); // SAUCE (e.g., '0.0.11835358')
            const feeTier = 5000; // 0.5% fee (in basis points, adjust based on pool)
            const path = tokenIn + decimalToPaddedHex(feeTier, 6) + tokenOut; // Encoded path

            // Step 3: Calculate minimum output amount (amountOutMinimum)
            const amountOutMinimum = 0; // await getMinOutputAmountV2(amount, whbarTokenId, defaultToken.id);
            console.log('Calculated amountOutMinimum:', ethers.formatUnits(amountOutMinimum, defaultToken.decimals), defaultToken.name);

            console.log( 'To address: ', toAddress.toString() );
            console.log( 'To EVM address: ', convertAccountIdToEVMAddress( address ) )

            console.log('Network: ', network)
            console.log('swapV2ContractAddress ', swapV2ContractAddress )


            // Step 4: Encode parameters
            const abiInterfaces = new ethers.Interface(SwapV2Abi); // Use SwapV2.json ABI
            const params = {
                path: '0x' + path,
                recipient: convertAccountIdToEVMAddress( address ), // Treasury wallet
                deadline: deadline.toString(),
                amountIn: inputTinybar,
                amountOutMinimum: amountOutMinimum.toString()
            };

            const swapEncoded = abiInterfaces.encodeFunctionData('exactInput', [params]);
            const refundHBAREncoded = abiInterfaces.encodeFunctionData('refundETH');
            const multiCallParam = [swapEncoded, refundHBAREncoded];
            const encodedData = abiInterfaces.encodeFunctionData('multicall', [multiCallParam]);
            const encodedDataAsUint8Array = hexToUint8Array(encodedData.substring(2)); // Remove '0x' prefix

            // Step 5: Execute the swap transaction
            const response = await new ContractExecuteTransaction()
                .setPayableAmount(inputHbar)
                .setContractId(swapRouterContractId)
                .setGas(1000000) // Adjust gas limit as needed
                .setFunctionParameters(encodedDataAsUint8Array)
                .freezeWithSigner( walletInterface.getSigner() );

            const swapResponse = await response.executeWithSigner( walletInterface.getSigner() );

            // Step 6: Get the transaction record and result
            const recordQuery = new TransactionRecordQuery()
                .setTransactionId(swapResponse.transactionId);

            const record = await recordQuery.execute( client );
            const result = record.contractFunctionResult;
            console.log('Result: ', result);
            if (!result) {
                console.error('No contract function result');
                return false;
            }

            // Debug the raw results
            const results = result.getResult(['bytes[]']);
            console.log('Raw Results:', results);

            // Decode the exactInput result (first element of the multicall results)
            if (!results[0] || !Array.isArray(results[0]) || results[0].length === 0) {
                console.error('No valid result from exactInput');
                return false;
            }

            // Decode the exactInput result (first element of the multicall results)
            const exactInputResult = results[0][0]; // Should be a single bytes value for exactInput
            const abi = [
                'function exactInput((bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum)) external returns (uint256 amountOut)'
            ];
            const resultAbiInterfaces = new ethers.Interface(abi);
            const swapResult = resultAbiInterfaces.decodeFunctionResult('exactInput', exactInputResult);
            const amountOut = swapResult[0]; // uint256 amountOut

            const tokensReceived = ethers.formatUnits(amountOut, defaultToken.decimals); // E.g. 676.11474 Sauce
            console.log('Swap successful, amountOut:', tokensReceived, defaultToken.name);


            // Step 7: Transfer Those Tokens To Store
            return await transferFungibleToken( toAddress, TokenId.fromString(defaultToken.id), amountOut );
        } catch (error) {
            console.error('Error in transferHBARAndSwapToDefaultToken:', error);
            return false;
        }
    };

    // Associate Token
    const associateToken = async (tokenId) => {
        let result = await walletInterface.associateToken(tokenId);
        return result ? true : false;
    };

    // Transfer Token
    const transferFungibleToken = async (address, tokenId, amount) => {
        return await walletInterface.transferFungibleToken(address, tokenId, Number(amount));
    };


    /**
     * Swap Fungible Token With HBAR and Transfer To Store
     *
     * Steps:
     * 1. Client associates with default token if not yet associated. Since this is HBAR, no need to do so.
     * 2. Give Swap Contract allowance to spend token amount
     * 3. Client makes swap operation from the selected token to HBAR
     * 4. After successful swap, transfer the HBAR amount to the store wallet.
     *
     * @param recipientAddress - Treasury wallet (e.g., 0.0.4486966)
     * @param tokenId - Input token ID (e.g., SAUCE: 0.0.11835358)
     * @param amount - Amount of input token in token units (e.g., 3560 SAUCE)
     * @returns Transaction ID or false on failure
     */
    const swapFungibleTokenWithHBARAndTransferToStore = async (recipientAddress, tokenId, amount) => {

        try {
            // Step 1: Log the accounts involved
            console.log('Customer Account (sender):', walletInterface.getAccountId().toString());
            console.log('Treasury Account (myAccountId):', myAccountId.toString());
            console.log('Recipient Address:', recipientAddress.toString());

            // Step 2: Approve the SaucerSwap router to spend the token on behalf of the client wallet
            const tokenAmountInSmallestUnit = amount;
            const approvalAmount = tokenAmountInSmallestUnit;
            console.log('Approving SaucerSwap router:', swapV2ContractAddress, 'to spend', approvalAmount, 'SAUCE on behalf of', walletInterface.getAccountId().toString() );
            const approvalTransaction = await new AccountAllowanceApproveTransaction()
                .approveTokenAllowance(tokenId.toString(), walletInterface.getAccountId(), ContractId.fromString(swapV2ContractAddress), Number( approvalAmount ) )
                .freezeWithSigner( walletInterface.getSigner() );

            const approvalResponse = await approvalTransaction.executeWithSigner( walletInterface.getSigner() );

            if (!approvalResponse) {
                console.error('Failed to approve token allowance for SaucerSwap router');
                return false;
            }
            console.log('Token allowance approved:', approvalResponse.transactionId.toString(), approvalResponse.toString());

            // Add a delay to ensure the allowance is propagated
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay

            // Step 3: Define swap parameters
            const swapRouterContractId = ContractId.fromString(swapV2ContractAddress); // e.g., '0.0.1414040' for testnet
            const swapRouterAddress = '0x' + swapRouterContractId.toSolidityAddress();
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20-minute deadline

            // Token path: [SAUCE, WHBAR] (path for exactInput: tokenIn -> tokenOut)
            const tokenIn = TokenId.fromString(tokenId.toString()).toSolidityAddress(); // SAUCE or other token
            const tokenOut = TokenId.fromString(whbarTokenId).toSolidityAddress(); // WHBAR
            const feeTier = 5000; // 0.5% fee (in basis points, adjust based on pool)
            const path = tokenIn + decimalToPaddedHex(feeTier, 6) + tokenOut; // Normal path

            // Step 4: Calculate minimum output amount (amountOutMinimum) for HBAR
            const amountOutMinimum = await getMinOutputAmountV2ForHbar(amount, tokenId.toString(), whbarTokenId);
            console.log('Calculated amountOutMinimum (HBAR):', ethers.formatUnits(amountOutMinimum, 8), 'HBAR');

            // Step 5: Encode parameters for exactInput and unwrapWHBAR
            const abi = [
                'function unwrapWHBAR(uint256 amountMinimum, address recipient) external payable',
                'function multicall(bytes[] calldata data) external payable returns (bytes[] memory results)',
                'function exactInput((bytes memory path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum)) external returns (uint256 amountOut)'
            ];

            const abiInterfaces = new ethers.Interface(abi);
            const params = {
                path: '0x' + path,
                recipient: swapRouterAddress, // Send WHBAR to the router for unwrapping
                deadline: deadline.toString(),
                amountIn: tokenAmountInSmallestUnit,
                amountOutMinimum: 0, // amountOutMinimum.toString()
            };

            const swapEncoded = abiInterfaces.encodeFunctionData('exactInput', [params]);
            const unwrapEncoded = abiInterfaces.encodeFunctionData('unwrapWHBAR', [0,  convertAccountIdToEVMAddress( walletInterface.getAccountId() ) ]); // Unwrap to HBAR, send to client address
            const multiCallParam = [swapEncoded, unwrapEncoded];
            const encodedData = abiInterfaces.encodeFunctionData('multicall', [multiCallParam]);
            const encodedDataAsUint8Array = hexToUint8Array(encodedData.substring(2)); // Remove '0x' prefix

            // Step 6: Execute the swap transaction
            const response = await new ContractExecuteTransaction()
                .setContractId(swapRouterContractId)
                .setGas(2000000) // Adjust gas limit as needed
                .setFunctionParameters(encodedDataAsUint8Array)
                .freezeWithSigner(walletInterface.getSigner());

            const txResponse = await response.executeWithSigner( walletInterface.getSigner() );
            console.log('Swap and unwrap transaction executed:', txResponse.transactionId.toString());

            // Step 7: Get the transaction record
            const recordQuery = new TransactionRecordQuery()
                .setTransactionId(txResponse.transactionId);

            const record = await recordQuery.execute( client );
            const contractFunctionResult = record.contractFunctionResult;
            console.log('Result: ', contractFunctionResult);
            if (!contractFunctionResult) {
                console.error('No contract function result');
                return false;
            }

            // Debug the raw results
            const rawResults = contractFunctionResult.getResult(['bytes[]']);
            console.log('Raw Results:', rawResults);

            const exactInputResult = rawResults[0][0]; // Extract the first element of the array
            const swapResult = abiInterfaces.decodeFunctionResult('exactInput', exactInputResult);
            const amountOut = swapResult[0]; // uint256 amountOut (HBAR in tinybars)
            console.log('Swap successful, amountOut:', ethers.formatUnits(amountOut, 8), 'HBAR');

            return await transferHBAR( recipientAddress, ethers.formatUnits(amountOut, 8) );
        } catch (error) {
            console.error('Error in transferFungibleTokenAndSwapToHbar:', error);
            return false;
        }
    };

    /**
     * Swap Fungible Token With Default Token and Transfer To Store
     *
     * Steps:
     * 1. Client associates with default token if not yet associated.
     * 2. Give Swap Contract allowance to spend token amount
     * 3. Client makes swap operation from the selected token to Default Token
     * 4. After successful swap, transfer the Default token amount to the store wallet.
     *
     * @param recipientAddress - Treasury wallet (e.g., 0.0.4486966)
     * @param tokenId - Input token ID (e.g., SAUCE: 0.0.11835358)
     * @param amount - Amount of input token in token units (e.g., 3560 SAUCE)
     * @returns Transaction ID or false on failure
     */
    const swapFungibleTokenWithDefaultTokenAndTransferToStore = async (recipientAddress, tokenId, amount) => {
        let tokenContract = await getSwapTokenContract(whbarTokenId, selectedTokenId );
        console.log('Inside swapFungibleTokenWithDefaultTokenAndTransferToStore ......................');
        console.log('Token Contract: ', tokenContract );
        if( ! tokenContract || ! tokenContract.version ){
            return false;
        }

        // Step 1: Log the accounts involved
        console.log('Customer Account (sender):', walletInterface.getAccountId().toString());
        console.log('Treasury Account (myAccountId):', myAccountId.toString());
        console.log('Recipient Address:', recipientAddress.toString());

        /**
         * Handle V1 tokens:
         *
         * https://docs.saucerswap.finance/developer/saucerswap-v1/swap-operations/swap-tokens-for-tokens#swap-exact-tokens-for-tokens
         */
        if( tokenContract.version == 'v1' ){
            try{
                console.log('Inside V1 make payment..........')
                // Step 2: Approve the SaucerSwap router to spend the token on behalf of the client wallet
                const tokenAmountInSmallestUnit = amount;
                const approvalAmount = tokenAmountInSmallestUnit;
                console.log('Approving SaucerSwap router:', saucerSwapV1RouterV3, 'to spend', approvalAmount, 'token on behalf of', walletInterface.getAccountId().toString() );
                const approvalTransaction = await new AccountAllowanceApproveTransaction()
                    .approveTokenAllowance(tokenId.toString(), walletInterface.getAccountId(), ContractId.fromString(saucerSwapV1RouterV3), Number( approvalAmount ) )
                    .freezeWithSigner( walletInterface.getSigner() );

                const approvalResponse = await approvalTransaction.executeWithSigner( walletInterface.getSigner() );

                if (!approvalResponse) {
                    console.error('Failed to approve token allowance for SaucerSwap router');
                    return false;
                }
                console.log('Token allowance approved:', approvalResponse.transactionId.toString(), approvalResponse.toString());

                // Add a delay to ensure the allowance is propagated
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay

                // Step 3: Define swap parameters
                const swapRouterContractId = ContractId.fromString(saucerSwapV1RouterV3);
                const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20-minute deadline

                // Token path: (path for exactInput: tokenIn -> tokenOut)
                const tokenIn = TokenId.fromString(tokenId.toString()).toSolidityAddress(); // SAUCE or other token
                const tokenOut = TokenId.fromString(defaultToken.id).toSolidityAddress(); // Default Token
                const path = [ tokenIn, tokenOut ]; // Normal path

                // Step 4: Calculate minimum output amount (amountOutMinimum) for Default Token
                const amountOutMinimum = 0;
                console.log('Calculated amountOutMinimum (Default Token):', ethers.formatUnits(amountOutMinimum, defaultToken.decimals), defaultToken.name );

                const params = new ContractFunctionParameters();

                params.addUint256( Number( tokenAmountInSmallestUnit ) ); //uint amountIn
                params.addUint256( Number( amountOutMinimum ) ); //uint amountOutMin
                params.addAddressArray(path); //address[] calldata path
                params.addAddress( convertAccountIdToEVMAddress( walletInterface.getAccountId() ) ); //address to
                params.addUint256(deadline); //uint deadline

                const response = await new ContractExecuteTransaction()
                    .setContractId( ContractId.fromString( saucerSwapV1RouterV3 ) )
                    .setGas( 2000000 )
                    .setFunction('swapExactTokensForTokens', params)
                    .freezeWithSigner(walletInterface.getSigner());

                const txResponse = await response.executeWithSigner( walletInterface.getSigner() );
                console.log('Swap and unwrap transaction executed:', txResponse.transactionId.toString());

                const recordQuery = new TransactionRecordQuery()
                    .setTransactionId(txResponse.transactionId);

                const record = await recordQuery.execute( client );

                const result = record.contractFunctionResult!;
                const values = result.getResult(['uint[]']);
                const amounts = values[0]; //uint[] amounts
                const finalOutputAmount = amounts[amounts.length - 1]; // BigNumber

                console.log('FinalOutputAmount: ', finalOutputAmount)

                const outputTokenInSmallestUnit = finalOutputAmount.toString();
                console.log( 'outputTokenInSmallestUnit: ', outputTokenInSmallestUnit)

                return await transferFungibleToken( recipientAddress, TokenId.fromString( defaultToken.id ), outputTokenInSmallestUnit );
            } catch (e) {
                return false;
            }


        }

        /**
         * Handle V2 tokens:
         *
         * https://docs.saucerswap.finance/developer/saucerswap-v2/swap-operations/swap-tokens-for-tokens#swap-exact-tokens-for-tokens
         */
        if( tokenContract.version == 'v2' ){
            try {

                // Step 2: Approve the SaucerSwap router to spend the token on behalf of the client wallet
                const tokenAmountInSmallestUnit = amount;
                const approvalAmount = tokenAmountInSmallestUnit;
                console.log('Approving SaucerSwap router:', swapV2ContractAddress, 'to spend', approvalAmount, 'token on behalf of', walletInterface.getAccountId().toString() );
                const approvalTransaction = await new AccountAllowanceApproveTransaction()
                    .approveTokenAllowance(tokenId.toString(), walletInterface.getAccountId(), ContractId.fromString(swapV2ContractAddress), Number( approvalAmount ) )
                    .freezeWithSigner( walletInterface.getSigner() );

                const approvalResponse = await approvalTransaction.executeWithSigner( walletInterface.getSigner() );

                if (!approvalResponse) {
                    console.error('Failed to approve token allowance for SaucerSwap router');
                    return false;
                }
                console.log('Token allowance approved:', approvalResponse.transactionId.toString(), approvalResponse.toString());

                // Add a delay to ensure the allowance is propagated
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay

                // Step 3: Define swap parameters
                const swapRouterContractId = ContractId.fromString(swapV2ContractAddress); // e.g., '0.0.1414040' for testnet
                const swapRouterAddress = '0x' + swapRouterContractId.toSolidityAddress();
                const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20-minute deadline

                // Token path: (path for exactInput: tokenIn -> tokenOut)
                const tokenIn = TokenId.fromString(tokenId.toString()).toSolidityAddress(); // SAUCE or other token
                const tokenOut = TokenId.fromString(defaultToken.id).toSolidityAddress(); // Default Token
                const feeTier = 5000; // 0.5% fee (in basis points, adjust based on pool)
                const path = tokenIn + decimalToPaddedHex(feeTier, 6) + tokenOut; // Normal path

                // Step 4: Calculate minimum output amount (amountOutMinimum) for Default Token
                const amountOutMinimum = 0;
                console.log('Calculated amountOutMinimum (Default Token):', ethers.formatUnits(amountOutMinimum, defaultToken.decimals), defaultToken.name );

                // Step 5: Encode parameters
                const abiInterfaces = new ethers.Interface( SwapV2Abi );
                const params = {
                    path: '0x' + path,
                    recipient: swapRouterAddress,
                    deadline: deadline.toString(),
                    amountIn: tokenAmountInSmallestUnit,
                    amountOutMinimum: 0, // amountOutMinimum.toString()
                };

                const swapEncoded = abiInterfaces.encodeFunctionData('exactInput', [params]);
                const encodedDataAsUint8Array = hexToUint8Array( swapEncoded );

                // Step 6: Execute the swap transaction
                const response = await new ContractExecuteTransaction()
                    .setContractId(swapRouterContractId)
                    .setGas(2000000) // Adjust gas limit as needed
                    .setFunctionParameters(encodedDataAsUint8Array)
                    .freezeWithSigner(walletInterface.getSigner());

                const txResponse = await response.executeWithSigner( walletInterface.getSigner() );
                console.log('Swap and unwrap transaction executed:', txResponse.transactionId.toString());

                // Step 7: Get the transaction record
                const recordQuery = new TransactionRecordQuery()
                    .setTransactionId(txResponse.transactionId);

                const record = await recordQuery.execute( client );
                const contractFunctionResult = record.contractFunctionResult;
                console.log('Result: ', contractFunctionResult);
                if (!contractFunctionResult) {
                    console.error('No contract function result');
                    return false;
                }

                // Debug the raw results
                const rawResults = contractFunctionResult.getResult(['bytes[]']);
                console.log('Raw Results:', rawResults);

                const exactInputResult = rawResults[0][0]; // Extract the first element of the array
                const swapResult = abiInterfaces.decodeFunctionResult('exactInput', exactInputResult);
                const amountOut = swapResult[0]; // uint256 amountOut // In smallest unit
                console.log('Swap successful, amountOut:', ethers.formatUnits(amountOut, defaultToken.decimals), defaultToken.name );

                return await transferFungibleToken( recipientAddress, TokenId.fromString( defaultToken.id ), amountOut );
            } catch (error) {
                console.error('Error in transferFungibleTokenAndSwapToHbar:', error);
                return false;
            }
        }
    };

    /**
     * Get Minimum Output Amount for V2 Swap (Token to HBAR)
     * @param amount - Input token amount (e.g., 3560 SAUCE)
     * @param inputTokenId - Input token ID (e.g., SAUCE: 0.0.11835358)
     * @param outputTokenId - Output token ID (e.g., WHBAR: 0.0.15058, used as intermediary)
     * @returns Minimum output amount in tinybars
     */
    const getMinOutputAmountV2ForHbar = async (amount, inputTokenId, outputTokenId) => {
        return 0;

        try {
            const swapContract = await getSwapTokenContract(inputTokenId, outputTokenId);
            if (!swapContract || !swapContract.contractId) {
                console.error('Swap contract not found');
                return ethers.parseUnits('1', 8).toString(); // Fallback (HBAR has 8 decimals)
            }

            const inputAmountInSmallestUnit = ethers.parseUnits(amount.toString(), selectedToken.decimals).toString();
            const abiInterfaces = new ethers.Interface(QuoterV2Abi);
            const feeTier = 5000; // 0.5% fee (in basis points)
            const path = TokenId.fromString(inputTokenId).toSolidityAddress() +
                decimalToPaddedHex(feeTier, 6) +
                TokenId.fromString(outputTokenId).toSolidityAddress();
            const encodedPathData = hexToUint8Array(path);

            const params = [encodedPathData, inputAmountInSmallestUnit];
            const encodedData = abiInterfaces.encodeFunctionData('quoteExactInput', params);

            const data = {
                block: 'latest',
                data: encodedData,
                to: `0x${ContractId.fromString(quoterV2ContractAddress).toSolidityAddress()}`
            };

            const response = await fetch(`https://${network}.mirrornode.hedera.com/api/v1/contracts/call`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const contractResponse = await response.json();
            if (!contractResponse.result) {
                console.error('Failed to get quote:', contractResponse);
                return ethers.parseUnits('1', 8).toString(); // Fallback
            }

            const result = abiInterfaces.decodeFunctionResult('quoteExactInput', contractResponse.result);
            const amountOut = result.amountOut; // WHBAR output
            const slippageTolerance = 0.03; // 3% slippage
            const minOutput = BigInt(amountOut.toString()) * BigInt((1 - slippageTolerance) * 10000) / BigInt(10000);
            return minOutput.toString(); // In tinybars (WHBAR, then unwrapped to HBAR)
        } catch (error) {
            console.error('Error in getMinOutputAmountV2ForHbar:', error);
            return ethers.parseUnits('1', 8).toString(); // Fallback
        }
    };


    /**
     * End Hedera Variables and Functions
     */

    /**
     * SaucerSwap Variables and Functions
     */
    const [hbarOrderTotal, setHbarOrderTotal] = useState(0);
    const [saucerSwapTokens, setSaucerSwapTokens] = useState([]);
    const [fetchingSaucerSwapTokens, setFetchingSaucerSwapTokens] = useState(true);

    useEffect(() => {
        async function getTokens() {
            if (address) {
                let options = [];

                for (const item of supportedTokens) {
                    const hbarBalance = await getAccountHbarBalance(address);
                    if (item.id === 'hbar' || item.id === whbarTokenId) {
                        options.push({
                            id: whbarTokenId,
                            decimals: item.decimals,
                            value: item.id,
                            name: item.name,
                            label: (
                                <Flex
                                    gap="small"
                                    style={{ alignItems: 'center', flexDirection: 'row' }}
                                    justify="space-between"
                                >
                                    <Text>{item.name}</Text>
                                    <div>
                                        Balance: <Text type="secondary">{hbarBalance?.toString()}</Text>
                                    </div>
                                </Flex>
                            ),
                            balance: hbarBalance
                        });
                        continue;
                    }



                    let tokenContract = await getSwapTokenContract(whbarTokenId, item.id);
                    console.log('Adding SaucerSwapTokens...........................')
                    console.log('Default Token: ', defaultToken )
                    console.log('Token Contract: ', tokenContract);
                    if (!tokenContract?.contractId) {
                        continue;
                    }

                    const balance = await getAccountTokenBalance(item.id, address);
                    if (balance === false) {
                        continue;
                    }

                    options.push({
                        id: item.id,
                        decimals: item.decimals,
                        value: item.id,
                        name: item.name,
                        label: (
                            <Flex gap="small" style={{ flexDirection: 'row', alignItems: 'center' }} justify="space-between">
                                <Text>{item.name}</Text>
                                <div>
                                    <Text>Balance: </Text><Text type="secondary">{balance?.toString()}</Text>
                                </div>
                            </Flex>
                        ),
                        balance: balance
                    });
                }

                setSaucerSwapTokens(options);
                setFetchingSaucerSwapTokens(false);
            }
            return;
        }

        getTokens();
    }, [address]);

    /**
     * Convert HEX string to Uint8Array
     * @param hexString
     */
    function hexToUint8Array(hexString) {
        if (hexString.startsWith('0x')) {
            hexString = hexString.slice(2);
        }

        if (hexString.length % 2 !== 0) {
            throw new Error('Invalid hex string');
        }

        const byteArray = new Uint8Array(hexString.length / 2);

        for (let i = 0; i < byteArray.length; i++) {
            byteArray[i] = parseInt(hexString.substr(i * 2, 2), 16);
        }

        return byteArray;
    }

    /**
     * Convert decimal to HEX
     *
     * @param decimal
     * @param length
     */
    function decimalToPaddedHex(decimal, length) {
        let hexString = decimal.toString(16);
        while (hexString.length < length) {
            hexString = '0' + hexString;
        }
        return hexString;
    }

    /**
     * Get token swap fees from a specified V2 contract
     *
     * @param poolContractId
     */
    async function getFeeTierJsonRpcV2(poolContractId) {
        const poolEvmAddress = `0x${poolContractId.toSolidityAddress()}`;
        const provider = new ethers.JsonRpcProvider(`https://${network}.hashio.io/api`, '', {
            batchMaxCount: 1,
        });

        const abiInterfaces = new ethers.Interface([
            'function fee() external view returns (uint24)'
        ]);

        const poolContract = new ethers.Contract(poolEvmAddress, abiInterfaces.fragments, provider);
        const result = await poolContract?.fee();

        return Number(result);
    }

    async function getUSDCToHBARFeeTierJsonRpc(poolContractId) {
        const poolEvmAddress = `0x${poolContractId.toSolidityAddress()}`;
        const provider = new ethers.JsonRpcProvider(`https://mainnet.hashio.io/api`, '', {
            batchMaxCount: 1,
        });

        const abiInterfaces = new ethers.Interface([
            'function fee() external view returns (uint24)'
        ]);

        const poolContract = new ethers.Contract(poolEvmAddress, abiInterfaces.fragments, provider);
        const result = await poolContract?.fee();

        return Number(result);
    }


    /**
     * Get Input Quote from Exact Output Amount
     *
     * @link https://docs.saucerswap.finance/v/developer/saucerswap-v2/swap-operations/swap-quote#get-input-quote-from-exact-output-amount
     */
    const getInputQuoteFromExactOutputAmountV2 = async (
        outputAmount,
        outputToken,
        outputTokenDecimals,
        inputToken,
        swapOutputToInputContractId,
        version = 'v2'
    ) => {
        console.log('swapOutputToInputContractId: ', swapOutputToInputContractId, version )

        console.log('swapOutputToInputContractId: ', swapOutputToInputContractId, version);

        if (version == 'v1') {
            console.log('Inside V1..........');
            const provider = new ethers.JsonRpcProvider(`https://${network}.hashio.io/api`, '', {
                batchMaxCount: 1,
            });

            // ABI data for the getAmountsIn
            const abi = ['function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts)'];

            // Load the ABI
            const abiInterfaces = new ethers.Interface(abi);

            // Route
            const tokenIn = '0x' + TokenId.fromString(inputToken).toSolidityAddress();
            const tokenOut = '0x' + TokenId.fromString(outputToken).toSolidityAddress();
            const route = [tokenIn, tokenOut];

            // Ensure routerContract uses the correct EVM address
            const routerEvmAddress = '0x' + ContractId.fromString(saucerSwapV1RouterV3).toSolidityAddress();
            const routerContract = new ethers.Contract(routerEvmAddress, abiInterfaces.fragments, provider);

            const result = await routerContract.getAmountsIn(ethers.parseUnits(outputAmount, outputTokenDecimals), route);
            const amounts = result; // uint[] amounts
            const finalInputAmount = amounts[0]; // in token's smallest unit

            console.log('FinalInputAmount: ', finalInputAmount);

            return Number(finalInputAmount);
        }

        if( version == 'v2' ){
            console.log('Inside V2..........')
            const abiInterfaces = new ethers.Interface(QuoterV2Abi);
            let swapOutputToInputContract = ContractId.fromString(swapOutputToInputContractId);
            let swapOutputToInputContractFee = await getFeeTierJsonRpcV2(swapOutputToInputContract);

            const tokenIn = TokenId.fromString(inputToken).toSolidityAddress();
            const tokenOut = TokenId.fromString(outputToken).toSolidityAddress();

            const path = [];
            path.push(tokenOut);
            path.push(decimalToPaddedHex(swapOutputToInputContractFee, 6));
            path.push(tokenIn);

            const encodedPathData = hexToUint8Array(path.join(''));
            let outputAmountInSmallestUnit = ethers.parseUnits(outputAmount, outputTokenDecimals);
            const params = [encodedPathData, outputAmountInSmallestUnit];

            const encodedData = abiInterfaces.encodeFunctionData(abiInterfaces.getFunction('quoteExactOutput'), params);

            const data = {
                'block': 'latest',
                'data': encodedData,
                'to': `0x${ContractId.fromString(quoterV2ContractAddress).toSolidityAddress()}`,
            };

            const myHeaders = new Headers();
            myHeaders.append("Content-Type", "application/json");

            const requestOptions = {
                method: "POST",
                headers: myHeaders,
                body: JSON.stringify(data),
                redirect: "follow"
            };


            try{
                let mirrorNodeBaseUrl = `https://${network}.mirrornode.hedera.com`;
                const url = `${mirrorNodeBaseUrl}/api/v1/contracts/call`;
                let fetchResponse = await fetch(url, requestOptions);
                let contractResponse = await (fetchResponse.json());

                const result = abiInterfaces.decodeFunctionResult('quoteExactOutput', contractResponse?.result);

                console.log('FinalInputAmount: ', result.amountIn);

                return result.amountIn;
            } catch(error) {
                return null;
            }
        }

        return null;
    };

    /**
     * NB: Works on mainnet only
     *
     * @param outputAmount
     */
    const getHbarInputQuoteFromExactUSDCOutputAmountV2 = async (outputAmount) => {
        return 10000000000;

        const abiInterfaces = new ethers.Interface(QuoterV2Abi);
        let swapOutputToInputContract = ContractId.fromString('0.0.3964804'); // USDC to Hbar V2 SaucerSwap Contract
        let swapOutputToInputContractFee = await getUSDCToHBARFeeTierJsonRpc(swapOutputToInputContract);
        console.log('swapOutputToInputContractFee :', swapOutputToInputContractFee);

        let mainnetWhbarTokenId = '0.0.1456986';
        let mainnetUsdcTokenId = '0.0.456858';

        const tokenIn = TokenId.fromString( mainnetWhbarTokenId ).toSolidityAddress();
        const tokenOut = TokenId.fromString( mainnetUsdcTokenId ).toSolidityAddress();

        const path = [];
        path.push(tokenOut);
        path.push(decimalToPaddedHex(swapOutputToInputContractFee, 6));
        path.push(tokenIn);

        const encodedPathData = hexToUint8Array(path.join(''));
        let outputAmountInSmallestUnit = ethers.parseUnits(outputAmount, 6);
        const params = [encodedPathData, outputAmountInSmallestUnit];

        const encodedData = abiInterfaces.encodeFunctionData(abiInterfaces.getFunction('quoteExactOutput'), params);

        let mainnetQuoterV2ContractAddress = '0.0.3949424';

        const data = {
            'block': 'latest',
            'data': encodedData,
            'to': `0x${ContractId.fromString( mainnetQuoterV2ContractAddress ).toSolidityAddress()}`,
        };

        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");

        const requestOptions = {
            method: "POST",
            headers: myHeaders,
            body: JSON.stringify(data),
            redirect: "follow"
        };

        let mirrorNodeBaseUrl = `https://mainnet.mirrornode.hedera.com`;
        const url = `${mirrorNodeBaseUrl}/api/v1/contracts/call`;
        let fetchResponse = await fetch(url, requestOptions);
        let contractResponse = await (fetchResponse.json());

        console.log('Amount: ', outputAmount);
        console.log('Contract Response: ', contractResponse);

        const result = abiInterfaces.decodeFunctionResult('quoteExactOutput', contractResponse?.result);
        return result.amountIn;
    };

    const getSwapTokenContract = async (tokenA, tokenB) => {
        // Validate inputs
        if (!tokenA || !tokenB) {
            console.error('Invalid token inputs:', { tokenA, tokenB });
            return null;
        }

        // Ensure whbarTokenId is defined
        if (!whbarTokenId) {
            console.error('whbarTokenId is not defined');
            return null;
        }

        // Normalize HBAR to WHBAR token ID (case-insensitive)
        const normalizeToken = (token) => {
            if (typeof token !== 'string') return token;
            return token.toLowerCase() === 'hbar' ? whbarTokenId : token;
        };
        const normalizedTokenA = normalizeToken(tokenA);
        const normalizedTokenB = normalizeToken(tokenB);

        // API endpoints to try (V2 first, then V1)
        const apiEndpoints = [
            { version: 'v2', url: `${saucerSwapApiUrl}/v2/pools/` },
            { version: 'v1', url: `${saucerSwapApiUrl}/pools/` },
        ];

        // Common request configuration
        const requestConfig = {
            method: 'get',
            maxBodyLength: Infinity,
        };

        for (const { version, url } of apiEndpoints) {
            try {
                const config = { ...requestConfig, url };
                const response = await axios.request(config);
                const pools = response.data;

                // Find the matching pool
                const pool = pools.find(item => {
                    if (!item?.tokenA?.id || !item?.tokenB?.id) return false;
                    const matchAtoB = item.tokenA.id === normalizedTokenA && item.tokenB.id === normalizedTokenB;
                    const matchBtoA = item.tokenB.id === normalizedTokenA && item.tokenA.id === normalizedTokenB;
                    return matchAtoB || matchBtoA;
                });

                if (pool) {
                    const [tokenAData, tokenBData] = normalizedTokenA === pool.tokenA.id
                        ? [pool.tokenA, pool.tokenB]
                        : [pool.tokenB, pool.tokenA];

                    return {
                        contractId: pool.contractId,
                        tokenAId: tokenA,
                        tokenADecimals: tokenAData.decimals,
                        tokenBId: tokenB,
                        tokenBDecimals: tokenBData.decimals,
                        version: version
                    };
                }
            } catch (error) {
                console.warn(`Failed to fetch ${version} pools:`, error.message);
            }
        }

        console.error('No matching pool found in V2 or V1 for tokens:', { tokenA, tokenB });
        return null;
    };


    useEffect(() => {
        async function fetch() {
            // Fetch logic here
        }

        fetch();
    }, []);

    /**
     * End SaucerSwap Variables and Functions
     */

    /**
     * Form Variables and Functions
     */
    const [selectedTokenId, setSelectedTokenId] = useState(null);
    const [selectedToken, setSelectedToken] = useState(null);
    const [selectedTokenAmount, setSelectedTokenAmount] = useState('0');
    const [selectedTokenIsAssociated, setSelectedTokenIsAssociated] = useState(false);
    const [paymentMethodSelected, setPaymentMethodSelected] = useState(false);

    useEffect(() => {
        async function fetch() {
            if (selectedTokenId) {
                // Check if token is associated
            }
        }

        fetch();
    }, [selectedTokenId]);

    const handleChange = async (value) => {
        let hbarTotal = await getHbarInputQuoteFromExactUSDCOutputAmountV2(orderTotal);
        console.log('HBAR Total: ', hbarTotal);
        hbarTotal = ethers.formatUnits(hbarTotal, 8);

        if (value === 'hbar' || value === whbarTokenId) {
            setHbarOrderTotal(hbarTotal);
            setPaymentMethodSelected(true);
            setSelectedToken(null);
            return;
        }

        setHbarOrderTotal(0);
        let selectedTokenData = saucerSwapTokens?.find(token => token.id === value);
        setSelectedTokenId(selectedTokenData?.id);

        let tokenContract = await getSwapTokenContract(whbarTokenId, value);
        setSelectedToken(selectedTokenData);

        hbarTotal = Number(hbarTotal).toFixed(selectedTokenData.decimals);

        let amountIn = await getInputQuoteFromExactOutputAmountV2(
            hbarTotal.toString(),
            whbarTokenId,
            6,
            value,
            tokenContract?.contractId,
            tokenContract?.version
        );

        setSelectedTokenAmount(ethers.formatUnits(Number(amountIn), selectedTokenData?.decimals));
        setSelectedTokenIsAssociated(true);
        setPaymentMethodSelected(true);
    };

    const [current, setCurrent] = useState(0);
    const next = () => setCurrent(current + 1);
    const prev = () => setCurrent(current - 1);

    useEffect(() => {
        eventBus.on('walletConnected', (status) => {
            setIsConnected(status.connected);
            setAccountId(status.account_id);
        });

        return () => {
            eventBus.removeListener('walletConnected', () => { });
        };
    }, []);

    const steps = [
        {
            title: 'Payment Token',
            content: (
                <>
                    {!address && (
                        <>
                            <Text>Please connect your wallet to proceed.</Text>
                            <div onClick={() => handleClose()}>
                                <ConnectWallet />
                            </div>
                        </>
                    )}
                    {address && (
                        <>
                            <Text>This field will only show the Hedera tokens that are linked to your wallet and accepted for payment by us.</Text>
                            <Select
                                style={{ width: '100%', marginTop: '20px' }}
                                defaultValue={selectedTokenId}
                                placeholder="Select Payment Token"
                                onChange={handleChange}
                                options={saucerSwapTokens}
                                notFoundContent={fetchingSaucerSwapTokens ? <Spin size="small" /> : null}
                            />
                            <Button style={{ display: 'none' }} onClick={async function () {
                                // Test button logic
                            }}>
                                Test Button
                            </Button>
                            {!selectedTokenIsAssociated && selectedTokenId && (
                                <Button
                                    type="primary"
                                    onClick={async function () {
                                        await associateToken(TokenId.fromString(selectedTokenId.toString()));
                                    }}
                                    style={{ marginTop: '20px', display: 'none' }}
                                >
                                    Associate Token
                                </Button>
                            )}
                        </>
                    )}
                </>
            ),
        },
        {
            title: 'Payment',
            content: (
                <>
                    You will pay {selectedToken ? selectedTokenAmount.toString() + ' ' + selectedToken?.name : ''} {hbarOrderTotal > 0 ? hbarOrderTotal + ' HBAR' : ''} <br />
                </>
            ),
        }
    ];

    const items = steps.map((item) => ({ key: item.title, title: item.title }));
    const [makePaymentButtonLoading, setMakePaymentButtonLoading] = useState(false);

    /**
     * End Form Variables and Functions
     */

    return (
        <Modal
            title="Pay Using HBAR or any Popular Hedera Token"
            open={open}
            onOk={handleClose}
            onCancel={handleClose}
            footer={null}
            zIndex={499}
        >
            <div style={{ margin: '20px 0' }}>
                <Steps current={current} items={items} />
            </div>
            <div style={{ marginTop: 20 }}>
                {steps[current].content}
            </div>
            <div style={{ marginTop: 20 }}>
                {current < steps.length - 1 && (
                    <Button
                        type="primary"
                        onClick={() => {
                            next();
                            setMakePaymentButtonLoading(false);
                        }}
                        disabled={!paymentMethodSelected}
                    >
                        Next
                    </Button>
                )}
                {current === steps.length - 1 && (
                    <Button
                        type="primary"
                        loading={makePaymentButtonLoading}
                        onClick={async function () {
                            const date = new Date();
                            date.setTime(date.getTime() + (30 * 24 * 60 * 60 * 1000));
                            const expires = date.toUTCString();

                            document.cookie = `payer_account_id=${address}; expires=${expires}; path=/`;
                            document.cookie = `payment_network=${network}; expires=${expires}; path=/`;

                            if (myAccountId.toString() === walletInterface.getAccountId().toString()) {
                                message.error('The sender and recipient accounts are the same');
                                setMakePaymentButtonLoading(false);
                                return;
                            }

                            setMakePaymentButtonLoading(true);
                            message.success('Please approve transaction.');

                            if (hbarOrderTotal) {
                                let paid = false;
                                if (defaultToken.id === 'hbar' || ! swapToken ) {
                                    paid = await transferHBAR(myAccountId, hbarOrderTotal);
                                } else {
                                    console.log('Calling....transferHBARAndSwapToDefaultToken......')
                                    paid = await swapHBARToDefaultTokenAndTransferToStore(myAccountId, hbarOrderTotal);
                                }

                                if (paid) {
                                    document.cookie = `payment_hash=${paid}; expires=${expires}; path=/`;
                                    document.cookie = `payment_amount=${hbarOrderTotal}; expires=${expires}; path=/`;
                                    document.cookie = `payment_token_name=HBAR; expires=${expires}; path=/`;
                                    document.cookie = `payment_token_id=${whbarTokenId}; expires=${expires}; path=/`;

                                    let checkoutForm = jQuery('form.woocommerce-checkout');
                                    checkoutForm.find('#wtpg-token-status').val('3756');
                                    checkoutForm.submit();

                                    setMakePaymentButtonLoading(false);
                                    message.success('Transaction Successful');
                                    handleClose();
                                } else {
                                    message.error('Error Completing Transaction');
                                    setMakePaymentButtonLoading(false);
                                }
                            }

                            if (selectedTokenId) {
                                console.log('Selected Token: ', selectedToken, selectedTokenId )
                                let transferred;

                                if (selectedTokenId === defaultToken.id || ! swapToken ) {
                                    transferred = await transferFungibleToken(
                                        myAccountId,
                                        TokenId.fromString(selectedTokenId.toString()),
                                        ethers.parseUnits(selectedTokenAmount, selectedToken.decimals)
                                    );
                                } else if (defaultToken.id === 'hbar') {
                                    console.log('Swapping Token to HBAR....................');
                                    transferred = await swapFungibleTokenWithHBARAndTransferToStore(
                                        myAccountId,
                                        TokenId.fromString(selectedTokenId.toString()),
                                        ethers.parseUnits(selectedTokenAmount, selectedToken.decimals)
                                    );
                                } else {
                                    console.log('Swapping Token to Default Token....................');
                                    transferred = await swapFungibleTokenWithDefaultTokenAndTransferToStore(
                                        myAccountId,
                                        TokenId.fromString(selectedTokenId.toString()),
                                        ethers.parseUnits(selectedTokenAmount, selectedToken.decimals)
                                    );
                                }

                                if (transferred) {
                                    document.cookie = `payment_hash=${transferred}; expires=${expires}; path=/`;
                                    document.cookie = `payment_amount=${selectedTokenAmount.toString()}; expires=${expires}; path=/`;
                                    document.cookie = `payment_token_name=${selectedToken?.name}; expires=${expires}; path=/`;
                                    document.cookie = `payment_token_id=${selectedToken?.id}; expires=${expires}; path=/`;

                                    let checkoutForm = jQuery('form.woocommerce-checkout');
                                    checkoutForm.find('#wtpg-token-status').val('3756');
                                    checkoutForm.submit();

                                    setMakePaymentButtonLoading(false);
                                    message.success('Transaction Successful');
                                    handleClose();
                                } else {
                                    message.error('Error Completing Transaction');
                                    setMakePaymentButtonLoading(false);
                                }
                            }
                        }}
                    >
                        {makePaymentButtonLoading ? 'Processing...' : 'Make Payment'}
                    </Button>
                )}
                {current > 0 && (
                    <Button style={{ margin: '0 8px' }} onClick={() => prev()}>
                        Previous
                    </Button>
                )}
            </div>
        </Modal>
    );
}

export function PopupProvider() {
    const [open, setOpen] = useState(true);

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen);
    };

    return (
        <WalletConnectContextProvider>
            <PaymentPopup open={open} handleClose={handleToggle} />
        </WalletConnectContextProvider>
    );
}