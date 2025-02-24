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

import * as ethers from 'ethers'; //V6
//import { ethers } from "ethers";
import {AccountId, ContractId, EntityIdHelper, Hbar, TokenId,} from '@hashgraph/sdk';
import {Button, Flex, message, Modal, Select, Spin, Steps, Typography} from 'antd';
import QuoterV2Abi from './QuoterV2.json';

import axios from "axios";
import {
    ContractFunctionParameterBuilder
} from "../../../../../metamask/src/services/wallets/contractFunctionParameterBuilder";
import ConnectWallet from "../ConnectWallet";
import {WalletConnectContext, WalletConnectContextProvider} from "../contexts/WalletConnectContext";
import {useWalletInterface} from "../services/wallets/useWalletInterface";
import eventBus from "../eventBus";

const { Text } = Typography;

export function PaymentPopup({open, handleClose}) {

    /**
     * MAINNET AND TESTNET VARIABLES
     *
     * https://docs.saucerswap.finance/developer/contract-deployments
     */
    let MY_ACCOUNT_ID = null;


    let quoter_v2_contract_address = null;
    let swap_v2_contract_address = null;
    let whbar_helper_contract_address = null;

    let usdc_token_id = null;
    let whbar_token_id = null;
    let whbar_token_id_2 = null;
    let sauce_token_id = null;
    let hchf_token_id = null;
    let hbar_token_id = null;

    let saucer_swap_api_url = null;
    let network = window.wtpg_price_formatter_params.network;
    if( network == 'mainnet' ){
        MY_ACCOUNT_ID = AccountId.fromString(window.wtpg_price_formatter_params.hedera_account_id );

        quoter_v2_contract_address = '0.0.3949424';
        swap_v2_contract_address = '0.0.3949434';
        whbar_helper_contract_address = '0.0.5808826';

        usdc_token_id = '0.0.456858';
        whbar_token_id = '0.0.1456986';
        sauce_token_id = '0.0.731861'

        hbar_token_id = '0.0.1456986';

        saucer_swap_api_url = 'https://api.saucerswap.finance';
    } else {
        MY_ACCOUNT_ID = AccountId.fromString(window.wtpg_price_formatter_params.hedera_account_id);

        quoter_v2_contract_address = '0.0.1390002';
        swap_v2_contract_address = '0.0.1414040';

        usdc_token_id = '0.0.5449';
        whbar_token_id = '0.0.15058';
        whbar_token_id_2 = '0.0.4371931';
        sauce_token_id = '0.0.1183558';
        hchf_token_id = '0.0.4360532';
        hbar_token_id = '0.0.15058';
        whbar_helper_contract_address = '0.0.4371947';

        saucer_swap_api_url = 'https://test-api.saucerswap.finance';

    }

    /*
     * Order Total
     */
    let order_total = window.wtpg_price_formatter_params.total;
    let supported_tokens = window.wtpg_price_formatter_params.tokens;

    /**
     * Hedera Variables and Functions
     */
    // Convert Hedera Account to EVM address
    const convertAccountIdToEVMAddress = (  account_id ) => {
        const { shard, realm, num } = EntityIdHelper.fromString( account_id );

        return '0x' + EntityIdHelper.toSolidityAddress([shard, realm, num]);
    };


    /*
     * Get account balance
     */
    const get_account_hbar_balance = async (account_id_or_evm_address) => {
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");

        const requestOptions = {
            method: "GET",
            redirect: "follow"
        };


        let mirrorNodeBaseUrl = `https://${network}.mirrornode.hedera.com`;
        const url = `${mirrorNodeBaseUrl}/api/v1/accounts/${ account_id_or_evm_address }`;
        let fetch_response = await fetch(url, requestOptions); // Returns promise
        let balance_response = await (fetch_response.json());

        if( balance_response.balance && balance_response.balance.balance ){
            return Hbar.fromTinybars(balance_response.balance.balance).toString();
        }

        return false;

    }

    const get_account_token_balance = async ( token_id, account_id_or_evm_address ) => {
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");

        const requestOptions = {
            method: "GET",
            redirect: "follow"
        };


        let mirrorNodeBaseUrl = `https://${network}.mirrornode.hedera.com`;
        const url = `${mirrorNodeBaseUrl}/api/v1/accounts/${ account_id_or_evm_address }/tokens`;
        let fetch_response = await fetch(url, requestOptions); // Returns promise
        let balance_response = await (fetch_response.json());

        let balance = 0;
        if( balance_response?.tokens ){
            balance_response?.tokens?.forEach( function( item, index, array ){
                if( item.token_id == token_id ){
                    balance = item.balance / Math.pow(10, item.decimals );
                }
            });
        }

        if( balance > 0 ){
            return balance;
        }

        return false;
    }

    //const { isConnected, address } = useAccount();
    const { accountId: address, setAccountId, isConnected, setIsConnected } = useContext(WalletConnectContext);

    const { walletInterface } = useWalletInterface();
    // Transfer HBAR

    /**
     * Transfer HBAR
     *
     * @param toAddress
     * @param amount - In full HBAR amount
     */
    const transferHBAR = async( toAddress: AccountId, amount: number) => {
        return await walletInterface.transferHBAR( toAddress, amount ) // Transaction ID / Hash / Null


    }

    // Associate Token
    const associateToken = async(tokenId: TokenId) => {
        let result = await walletInterface.associateToken( tokenId )

        return result ? true : false;
    }

    // Transfer Token
    const transferFungibleToken = async ( address, tokenId: TokenId, amount: number) => {

        return await walletInterface.transferFungibleToken( address, tokenId, Number( amount ) ); // Transaction ID / Hash / Null

    }

    /**
     * Grant contract allowance
     *
     * @param tokenId // Contract's Token ID
     * @param spender_address
     * @param amount
     */
    const grantContractAllowance = async( tokenId: TokenId, spender_address, amount  ) => {
        let granted = await executeContractFunction(
            ContractId.fromString(tokenId.toString()),
            'approve',
            new ContractFunctionParameterBuilder()
                .addParam({
                    type: "address",
                    name: "address _spender",
                    value: spender_address
                })
                .addParam({
                    type: "uint256",
                    name: "amount",
                    value: amount
                }),
            -1
        );

        console.log('Granted: ', granted);
    }

   /**
     * Purpose: build contract execute transaction and send to hashconnect for signing and execution
     *
     * Returns: Promise<TransactionId | null>
     *
     * @param contractId
     * @param functionName
     * @param functionParameters
     * @param gasLimit
     */
    const executeContractFunction = async (contractId: ContractId, functionName: string, functionParameters: ContractFunctionParameterBuilder, gasLimit: number) => {
        const provider = getProvider();
        const signer = await provider.getSigner();
        const abi = [
            `function ${functionName}(${functionParameters.buildAbiFunctionParams()})`
        ];

        // create contract instance for the contract id
        // to call the function, use contract[functionName](...functionParameters, ethersOverrides)
        const contract = new ethers.Contract(`0x${contractId.toSolidityAddress()}`, abi, signer);
        try {
            const txResult = await contract[functionName](
                ...functionParameters.buildEthersParams(),
                {
                    gasLimit: gasLimit === -1 ? undefined : gasLimit
                }
            );

            const transaction_hash = txResult.hash;

            // Check if transaction was successful
            const myHeaders = new Headers();
            myHeaders.append("Content-Type", "application/json");

            const requestOptions = {
                method: "GET",
                redirect: "follow"
            };

            let mirrorNodeBaseUrl = `https://${network}.mirrornode.hedera.com`;
            const url = `${mirrorNodeBaseUrl}/api/v1/contracts/results/${ transaction_hash }`;
            let fetch_response = await fetch(url, requestOptions); // Returns promise
            let contract_response = await (fetch_response.json());

            return contract_response.result == 'SUCCESS';
        } catch (error: any) {
            console.warn(error.message ? error.message : error);
            return false;
        }
    }

    const [hbarOrderTotal, setHbarOrderTotal] = useState( 0 );

    /**
     * End Hedera Variables and Functions
     */

    /**
     * SaucerSwap Variables and Functions
     */

    const[ saucerSwapTokens, setSaucerSwapTokens] = useState([]);
    const[ fetchingSaucerSwapTokens, setFetchingSaucerSwapTokens ] = useState( true );
    useEffect(  () => {
         async function getTokens() {
             if( address ){
                 // Use Configured Tokens
                 let options = [];

                 for (const item of supported_tokens) {
                     // Check if it is hbar
                     const hbar_balance = await get_account_hbar_balance( address )
                     if( item.id === hbar_token_id ){
                         options.push({
                             id: item.id,
                             decimals: item.decimals,
                             value: item.id,
                             name: item.name,
                             label: (
                                 <Flex
                                     gap="small"
                                     style={{ alignItems: 'center', flexDirection: 'row'}}
                                     justify="space-between"
                                 >
                                     <Text>{item.name}</Text>
                                     <div>
                                         Balance: <Text type="secondary">{hbar_balance?.toString()}</Text>
                                     </div>
                                 </Flex>
                             ),
                             balance: hbar_balance
                         })

                         continue;
                     }

                     // Check if a swap contract exists
                     let token_contract = await getSwapTokenContract( whbar_token_id, item.id );
                     if( ! token_contract?.contract_id ){
                         continue;
                     }

                     const balance = await get_account_token_balance( item.id, address )
                     if( balance === false ){
                         continue;
                     }

                     options.push({
                         id: item.id,
                         decimals: item.decimals,
                         value: item.id,
                         name: item.name,
                         label: (
                             <Flex gap="small" style={{flexDirection: 'row', alignItems: 'center'}} justify="space-between">
                                 <Text>{item.name}</Text>
                                 <div>
                                     <Text>Balance: </Text><Text type="secondary">{balance?.toString()}</Text>
                                 </div>
                             </Flex>
                         ),
                         balance: balance
                     })
                 }

                 setSaucerSwapTokens(options)
                 setFetchingSaucerSwapTokens( false );

             }
             return;
         }

         getTokens();

    }, [ address ]);


    /**
     * Convert HEX string to Uint8Array
     * @param hexString
     */
    function hexToUint8Array(hexString: string) {
        // Remove any leading "0x" if present
        if (hexString.startsWith('0x')) {
            hexString = hexString.slice(2);
        }

        // Ensure the hex string has an even number of characters
        if (hexString.length % 2 !== 0) {
            throw new Error('Invalid hex string');
        }

        // Create a Uint8Array with half the length of the hex string
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
    function decimalToPaddedHex(decimal: number, length: number): string {
        let hexString = decimal.toString(16);
        while (hexString.length < length) {
            hexString = '0' + hexString;
        }
        return hexString;
    }

    /**
     * Get token swap fees from a specified contract
     *
     * @param poolContractId
     */
    async function getFeeTierJsonRpc(poolContractId):Promise<number> {

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

    async function getUSDCToHBARFeeTierJsonRpc(poolContractId:ContractId):Promise<number> {

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
        output_amount: string,
        output_token: string,
        output_token_decimals: number,
        input_token: string,
        swap_output_to_input_contract_id: string,
    ) => {
        //load ABI data containing QuoterV2 functions
        const abiInterfaces = new ethers.Interface( QuoterV2Abi );

        /*
         * Mainnet contract to transfer whbar to sauce has the ID 0.0.3951117
         *
         * These details can be obtained from https://api.saucerswap.finance/v2/pools/
         *
         * To get the fees for transferring from TokenA to TokenB, you need the contract ID from the link
         * above, then use the 'getFeeTierJsonRpc' function.
         */

        // Tokens
        let swap_output_to_input_contract = ContractId.fromString( swap_output_to_input_contract_id );
        let swap_output_to_input_contract_fee = await getFeeTierJsonRpc( swap_output_to_input_contract );

        const tokenIn =  TokenId.fromString( input_token ).toSolidityAddress();
        const tokenOut = TokenId.fromString( output_token ).toSolidityAddress();

        /*
         * The data passed to the 'path' parameter follows this format:
         * [token, fee, token, fee, token, ...],
         * but reversed (i.e. the first token in the array should be output token), with each 'token'
         * in the route being 20 bytes long and each 'fee' being 3 bytes long. Example, 0x000BB8 for a 0.30% fee.
         */
        //swap path
        const path:string[] = [];

        path.push( tokenOut );
        path.push( decimalToPaddedHex( swap_output_to_input_contract_fee, 6 ) ); // We use 6 as the length since the contract requires 6 characters
        path.push( tokenIn );


        //get encoded Uint8Array data for path hex
        const encodedPathData = hexToUint8Array(path.join(''));

        //quoteExactInput params
        let outputAmountInSmallestUnit = ethers.parseUnits( output_amount, output_token_decimals)
        const params = [encodedPathData, outputAmountInSmallestUnit];

        //Get encoded function data
        const encodedData = abiInterfaces.encodeFunctionData(abiInterfaces.getFunction('quoteExactOutput')!, params);


        const data = {
            'block': 'latest',
            'data': encodedData,
            'to': `0x${ContractId.fromString( quoter_v2_contract_address ).toSolidityAddress()}`,
        };

        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");

        const requestOptions = {
            method: "POST",
            headers: myHeaders,
            body: JSON.stringify( data ),
            redirect: "follow"
        };


        let mirrorNodeBaseUrl = `https://${network}.mirrornode.hedera.com`;
        const url = `${mirrorNodeBaseUrl}/api/v1/contracts/call`;
        let fetch_response = await fetch(url, requestOptions); // Returns promise
        let contract_response = await (fetch_response.json());

        const result = abiInterfaces.decodeFunctionResult('quoteExactOutput', contract_response?.result );

        return result.amountIn;

    }

    const getHbarInputQuoteFromExactUSDCOutputAmountV2 = async (
        output_amount: string,
    ) => {

        //load ABI data containing QuoterV2 functions
        const abiInterfaces = new ethers.Interface( QuoterV2Abi );

        /*
         * Mainnet contract to transfer USDC to SAUCE has the ID 0.0.3964804
         *
         * These details can be obtained from https://api.saucerswap.finance/v2/pools/
         *
         * To get the fees for transferring from TokenA to TokenB, you need the contract ID from the link
         * above, then use the 'getFeeTierJsonRpc' function.
         */

        // Tokens
        let swap_output_to_input_contract = ContractId.fromString( '0.0.3964804' );
        let swap_output_to_input_contract_fee = await getUSDCToHBARFeeTierJsonRpc( swap_output_to_input_contract );


        const tokenIn =  TokenId.fromString( '0.0.1456986' ).toSolidityAddress(); // 0.0.1456986 - WHBAR
        const tokenOut = TokenId.fromString( '0.0.456858' ).toSolidityAddress(); // 0.0.456858 - USDC

        /*
         * The data passed to the 'path' parameter follows this format:
         * [token, fee, token, fee, token, ...],
         * but reversed (i.e. the first token in the array should be output token), with each 'token'
         * in the route being 20 bytes long and each 'fee' being 3 bytes long. Example, 0x000BB8 for a 0.30% fee.
         */
        //swap path
        const path:string[] = [];

        path.push( tokenOut );
        path.push( decimalToPaddedHex( swap_output_to_input_contract_fee, 6 ) ); // We use 6 as the length since the contract requires 6 characters
        path.push( tokenIn );


        //get encoded Uint8Array data for path hex
        const encodedPathData = hexToUint8Array(path.join(''));

        //quoteExactInput params
        let outputAmountInSmallestUnit = ethers.parseUnits( output_amount, 6 ) // USDC which is the output, has 6 decimal places
        const params = [encodedPathData, outputAmountInSmallestUnit];

        //Get encoded function data
        const encodedData = abiInterfaces.encodeFunctionData(abiInterfaces.getFunction('quoteExactOutput')!, params);


        const data = {
            'block': 'latest',
            'data': encodedData,
            'to': `0x${ContractId.fromString( '0.0.3949424' ).toSolidityAddress()}`,
        };

        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");

        const requestOptions = {
            method: "POST",
            headers: myHeaders,
            body: JSON.stringify( data ),
            redirect: "follow"
        };


        let mirrorNodeBaseUrl = `https://mainnet.mirrornode.hedera.com`;
        const url = `${mirrorNodeBaseUrl}/api/v1/contracts/call`;
        let fetch_response = await fetch(url, requestOptions); // Returns promise
        let contract_response = await (fetch_response.json());

        const result = abiInterfaces.decodeFunctionResult('quoteExactOutput', contract_response?.result );

        return result.amountIn;

    }

    const getSwapTokenContract = async (
        token_a: string,
        token_b: string
    ) => {
        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `${saucer_swap_api_url}/v2/pools/`,
        };


        try{
            let response = await axios.request(config);
            let pools = JSON.stringify( response?.data );
            pools = JSON.parse( pools );

            /*
             * Search for the token combination
             */
            let contract_id = null;
            let token_a_id = token_a;
            let token_a_decimals = null;
            let token_b_id = token_b;
            let token_b_decimals = null;


            pools?.forEach( function( item, index, array ){
                if( item?.tokenA?.id === token_a && item?.tokenB?.id === token_b ){
                    contract_id = item.contractId;
                    token_a_decimals = item.tokenA.decimals;
                    token_b_decimals = item.tokenB.decimals;
                }

                if( item?.tokenB?.id === token_a && item?.tokenA?.id === token_b ){
                    contract_id = item.contractId;
                    token_a_decimals = item.tokenB.decimals;
                    token_b_decimals = item.tokenA.decimals;
                }

            } );

            return {
                "contract_id": contract_id,
                "token_a_id": token_a,
                "token_a_decimals": token_a_decimals,
                "token_b_id": token_b,
                "token_b_decimals": token_b_decimals,
            };

        } catch( error) {
            console.log(error);

            return null;
        }
    }

    const bytesFromHex = (hex: string) => Uint8Array.from(hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));

    useEffect(  () => {
        async function fetch() {

            /*
            console.log('CALLING swapExactTokensForHBAR')
            await swapExactTokensForHBAR(
                '10000',
                '0.0.1456986', //WHBAR
                6,
                '0.0.2661057' // '0.0.3951117' - mainnet // '0.0.2661057' - testnet
            );

             */

            /*

            console.log('CALLING unWrapHBARForWHBAR')
           await unWrapWHBARForHBAR(40);

            console.log('CALLING wrapHBARForWHBAR')
            await wrapHBARForWHBAR(10);

            console.log('CALLING swapTokensForTokens')
            await swapTokensForTokens('0.0.4395997')

            console.log('CALLING granting allowance');
            await grant_contract_allowance();

            console.log('CALLING swapExactHBARForTokens')
            await swapExactHBARForTokens( '0.0.2661057' );

            console.log('CALLING swapExactTokensForHBAR')
            await swapExactTokensForHBAR(
                '1',
                '0.0.1456986', //WHBAR
                6,
                '0.0.2661057' // '0.0.3951117' - mainnet // '0.0.2661057' - testnet
            );


            let contract = await getSwapTokenContract( whbar_token_id, sauce_token_id );

            let amount = await getInputQuoteFromExactOutputAmountV2(
                '100',
                whbar_token_id, //WHBAR
                6,
                sauce_token_id, //SAUCE
                contract.contract_id, // '0.0.3951117' - mainnet // '0.0.2661057' - testnet
            )

            console.log( 'Amount is: ', amount )
            */


            /*await getOutputQuoteFromExactInputAmountV2(
                '100000',
                '0.0.1456986', //WHBAR
                6,
                '0.0.731861', //SAUCE
                '0.0.3951117' // '0.0.3951117' - mainnet // '0.0.2661057' - testnet
            );

            await getInputQuoteFromExactOutputAmountV2(
                '100',
                '0.0.1456986', //WHBAR
                6,
                '0.0.731861', //SAUCE
                '0.0.3951117' // // '0.0.3951117' - mainnet // '0.0.2661057' - testnet
            )

            await getSwapTokenContract( '0.0.1456986', '0.0.731861' );

             */
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
    const [selectedTokenAmount, setSelectedTokenAmount] = useState( '0' );
    const [selectedTokenIsAssociated, setSelectedTokenIsAssociated ] = useState( false );
    const [paymentMethodSelected, setPaymentMethodSelected ] = useState( false );
    useEffect(  () => {
        async function fetch() {
            if( selectedTokenId ){
                // Check if token is associated
               // let is_associated = await token_is_associated( selectedTokenId, address );
               // setSelectedTokenIsAssociated( is_associated );
            }

        }

        fetch();

    }, [selectedTokenId]);

    const handleChange = async (value: string) => {
        /*
         * First get the HBAR equivalent from the Order Total which is in USD.
         *
         * Here, we convert the USD to USDC.
         *
         * Since SaucerSwap's Testnet Pools endpoint does not have USDC conversion contract, we get this
         * value from mainnet
         */
        let hbar_total = await getHbarInputQuoteFromExactUSDCOutputAmountV2( order_total );
        hbar_total = ethers.formatUnits( hbar_total, 8 ); // Returns string

        // If user has selected HBAR, no need to get quote. So proceed with payment
        if( value === hbar_token_id ){
            setHbarOrderTotal( hbar_total );
            setPaymentMethodSelected( true );

            setSelectedToken( null );

            return;
        }

        setHbarOrderTotal( 0);
        let selected_token = saucerSwapTokens?.find(token => token.id == value );
        setSelectedTokenId( selected_token?.id );

        let token_contract = await getSwapTokenContract( whbar_token_id, value );
        setSelectedToken( selected_token );

        /*
         * WHBAR has 8 decimals and another token may have more or less decimals. So we limit
         * the number of decimals of hbar to those of output token decimals. E.g. if converting to
         * sauce which has 6 decimals, we round hbar to 6 decimal places
         */
        hbar_total = Number( hbar_total ).toFixed( selected_token.decimals ); // Returns String

        let amount_in = await getInputQuoteFromExactOutputAmountV2(
            hbar_total.toString(),
            whbar_token_id, // WHBAR
            6,  // Output token decimals - WHBAR has 6 decimals
            value, //SAUCE or another token
            token_contract?.contract_id
        )


        setSelectedTokenAmount( ethers.formatUnits( Number( amount_in ), selected_token?.decimals ) );
        setSelectedTokenIsAssociated( true );
        setPaymentMethodSelected( true );

    };


    const [current, setCurrent] = useState(0);
    const next = () => {
        setCurrent(current + 1);
    };
    const prev = () => {
        setCurrent(current - 1);
    };

    useEffect(() => {
        // Listen to the event when the wallet is connected
        eventBus.on('walletConnected', (status) => {
            setIsConnected( status.connected )
            setAccountId( status.account_id );
        });

        // Cleanup listener on component unmount
        return () => {
            eventBus.removeListener('walletConnected', () => {});
        };
    }, []);


    const steps = [
        {
            title: 'Payment Token',
            content: <>
                { ! address && (
                    <>
                        <Text>Please connect your wallet to proceed.</Text>
                        <div
                            onClick={ function () {
                                // handleClose();
                            }}
                        >
                            <ConnectWallet/>
                        </div>
                    </>
                )}

                { address && (
                    <>
                        <Text>This field will only show the Hedera tokens that are linked to your wallet and accepted for payment by us.</Text>

                        <Select
                            style={{ width: '100%', marginTop: '20px' }}
                            defaultValue={ selectedTokenId }
                            placeholder="Select Payment Token"
                            onChange={handleChange}
                            options={ saucerSwapTokens }
                            notFoundContent={fetchingSaucerSwapTokens ? <Spin size="small" /> : null}
                        />


                        <Button style={{ display: 'none'}} onClick={ async function(){
                            // await associateToken( TokenId.fromString( whbar_token_id) );

                            // Approve Allowance
                            // await grantContractAllowance( TokenId.fromString('0.0.15058'), ContractId.fromString( whbar_helper_contract_address ).toSolidityAddress(), 1000 );
                        }
                        }>Test Button</Button>


                        { ! selectedTokenIsAssociated && selectedTokenId && (
                            <Button
                                type="primary"
                                onClick={ async function () {
                                    await associateToken( TokenId.fromString( selectedTokenId.toString() ) );
                                }}
                                style={{ marginTop: '20px', display: 'none'}}
                            >
                                Associate Token
                            </Button>
                        )}
                    </>
                ) }
            </>,
        },
        {
            title: 'Payment',
            content: <>
                You will pay { selectedToken ? selectedTokenAmount.toString() + ' ' + selectedToken?.name : '' } { hbarOrderTotal > 0 ? hbarOrderTotal + ' HBAR' : '' } <br/>
            </>,
        }
    ];


    const items = steps.map((item) => ({ key: item.title, title: item.title }));

    const[ makePaymentButtonLoading, setMakePaymentButtonLoading ] = useState( false );


    /**
     * End Form Variables and Functions
     */

    return (
        <>
            <Modal
                title="Pay Using HBAR or any Popular Hedera Token"
                open={ open }
                onOk={handleClose}
                onCancel={handleClose}
                footer={ null }
                zIndex={ 499 }
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
                            onClick={ function(){
                                next();

                                setMakePaymentButtonLoading( false )
                            }}
                            disabled={ ! paymentMethodSelected }
                        >
                            Next
                        </Button>
                    )}
                    {current === steps.length - 1 && (

                        <Button
                        type="primary"
                        loading={ makePaymentButtonLoading }
                        onClick={ async function () {
                            /**
                             * Set Cookie Values
                             */
                                // 1. Create a date object for 30 days from now
                            const date = new Date();
                            date.setTime(date.getTime() + (30 * 24 * 60 * 60 * 1000));
                            const expires = date.toUTCString();

                            document.cookie = `payer_account_id=${address}; expires=${expires}; path=/`;
                            document.cookie = `payment_network=${network}; expires=${expires}; path=/`;

                            setMakePaymentButtonLoading( true );
                            message.success('Please approve transaction.')

                            // Make HBAR Payment
                            if( hbarOrderTotal ){
                                let paid = await transferHBAR(
                                    MY_ACCOUNT_ID,
                                    hbarOrderTotal
                                );

                                if( paid ){
                                    document.cookie = `payment_hash=${paid}; expires=${expires}; path=/`;

                                    document.cookie = `payment_amount=${hbarOrderTotal}; expires=${expires}; path=/`;
                                    document.cookie = `payment_token_name=HBAR; expires=${expires}; path=/`;
                                    document.cookie = `payment_token_id=${hbar_token_id}; expires=${expires}; path=/`;

                                    /*
                                     * Update Checkout Form and Submit
                                     */
                                    // Assign checkout form to variable
                                    let checkout_form = jQuery( 'form.woocommerce-checkout' );
                                    // Add value to hidden input
                                    checkout_form.find('#wtpg-token-status').val( '3756' );
                                    checkout_form.submit();

                                    setMakePaymentButtonLoading( false );

                                    message.success('Transaction Successful');

                                    // Close modal
                                    handleClose();
                                } else {
                                    message.error('Error Completing Transaction');

                                    setMakePaymentButtonLoading( false );
                                }
                            }

                            // Make Token Payment
                            if( selectedTokenId ){
                                let transferred = await transferFungibleToken(
                                    convertAccountIdToEVMAddress( MY_ACCOUNT_ID ),
                                    TokenId.fromString( selectedTokenId.toString() ),
                                    ethers.parseUnits( selectedTokenAmount, selectedToken.decimals )
                                );


                                if( transferred ){
                                    document.cookie = `payment_hash=${transferred}; expires=${expires}; path=/`;

                                    document.cookie = `payment_amount=${selectedTokenAmount.toString()}; expires=${expires}; path=/`;
                                    document.cookie = `payment_token_name=${selectedToken?.name}; expires=${expires}; path=/`;
                                    document.cookie = `payment_token_id=${selectedToken?.id}; expires=${expires}; path=/`;

                                    /*
                                     * Update Checkout Form and Submit
                                     */
                                    // Assign checkout form to variable
                                    let checkout_form = jQuery( 'form.woocommerce-checkout' );
                                    // Add value to hidden input
                                    checkout_form.find('#wtpg-token-status').val( '3756' );
                                    checkout_form.submit();

                                    setMakePaymentButtonLoading( false );

                                    message.success('Transaction Successful');

                                    // Close modal
                                    handleClose();
                                } else {
                                    message.error('Error Completing Transaction');

                                    setMakePaymentButtonLoading( false );
                                }
                            }


                            // await transferFunds();
                           //  await transferHBAR( '0xEefF5430035dC60887318e48F31cCFfC215247Ac', 5 );

                            // Associate Token
                            // await associateToken( TokenId.fromString('0.0.15058') );
                        }}
                        >
                            { makePaymentButtonLoading ? 'Processing...' : 'Make Payment' }
                        </Button>
                    )}
                    {current > 0 && (
                        <Button style={{ margin: '0 8px' }} onClick={() => prev()}>
                            Previous
                        </Button>
                    )}
                </div>
            </Modal>
        </>
    )
}

export function PopupProvider() {
    const [open, setOpen] = useState(true );

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen);
    };

    return (
        <WalletConnectContextProvider>
            <PaymentPopup open={open} handleClose={handleToggle} />
        </WalletConnectContextProvider>

    );
}
