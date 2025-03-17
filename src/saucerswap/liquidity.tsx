import {
    AccountId,
    Client,
    ContractExecuteTransaction,
    ContractFunctionParameters,
    ContractId,
    EntityIdHelper,
    PrivateKey,
    TokenId,
    TransactionReceiptQuery,
} from '@hashgraph/sdk';
import axios from "axios";
import * as ethers from 'ethers';
import BigNumber from 'bignumber.js';

/**
 * Saucer Swap V1 Liquidity ABI is obtained from IUniswapV2Factory and not hashscan
 *
 * @link https://github.com/Uniswap/v2-core/blob/master/contracts/interfaces/IUniswapV2Factory.sol
 */
import {useEffect} from "react";
import {ContractFunctionParameterBuilder} from "./contractFunctionParameterBuilder";

/**
 * Hedera Parameters
 */
let network = 'testnet';
let hederaJsonRelayUrl = 'https://mainnet.hashio.io/api';
let mirrorNodeBaseUrl = 'https://mainnet.mirrornode.hedera.com';

let saucer_swap_v1_router_v3_contract_address = '0.0.3045981';

let hbar_token_id = '0.0.1456986';
let hbar_token_id_decimals = 6;
let sauce_token_id = '0.0.731861';
let sauce_token_id_decimals = 6;
let test_token_id = '0.0.4616000';
let test_token_id_decimals = 0;

let client = Client.forMainnet();
let MY_ACCOUNT_ID = '';
let MY_PRIVATE_KEY = '';


if( network === 'testnet' ){
    mirrorNodeBaseUrl = 'https://testnet.mirrornode.hedera.com';
    hederaJsonRelayUrl = 'https://testnet.hashio.io/api';

    saucer_swap_v1_router_v3_contract_address = '0.0.19264';

    hbar_token_id = '0.0.15058';
    sauce_token_id = '0.0.1183558'

    client = Client.forTestnet();
    MY_ACCOUNT_ID = AccountId.fromString( '0.0.2491584' );
    MY_PRIVATE_KEY = PrivateKey.fromString( '302e020100300506032b6570042204203c12b68de46c9e980adef66bb31a6b188b467f145c352faa6aa6ae2242b7c2de' );

    client.setOperator(
        MY_ACCOUNT_ID,
        MY_PRIVATE_KEY
    );
}

export default function Liquidity() {

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

    /**
     * Convert Hedera Account to EVM address
     *
     * @param account_id
     */
    const convertAccountIdToEVMAddress = (  account_id ) => {
        const { shard, realm, num } = EntityIdHelper.fromString( account_id );

        return '0x' + EntityIdHelper.toSolidityAddress([shard, realm, num]);
    };

    /**
     * Pool Creation Fee
     *
     * The current fee for creating V1 liquidity pools is $50 USD, paid in HBAR.
     * The exchange rate information is used to accurately determine the equivalent value in HBAR.
     *
     * The pairCreateFee() function will return the current fee expressed in Tinycent (US).
     *
     * The current fee for creating V1 liquidity pools is $50 USD, paid in HBAR.
     * The exchange rate information is used to accurately determine the equivalent value in HBAR.
     *
     * @link https://docs.saucerswap.finance/v/developer/saucerswap-v1/liquidity-operations/pool-creation-fee
     */
    const getPoolCreationFee = async () => {
        /**
         * We comment out this part since I can't find the contract's ABI at this time
         * Since we know the fee is constant right now (USD 50), we convert it directly
         * to HBAR
         *
        //Set one of Hedera's JSON RPC Relay as the provider
        const provider = new ethers.JsonRpcProvider(hederaJsonRelayUrl, '', {
            batchMaxCount: 1, //workaround for V6
        });

        //load ABI data containing Factory's pairCreateFee function
        const interfaces = new ethers.Interface(abi);

        //get pool creation fee in tinycent
        const factoryContract = new ethers.Contract(factoryEvmAddress, interfaces.fragments, provider);
        const result = await factoryContract.pairCreateFee();
        const tinycent = Number(result); //amount in tinycent (US)*/

        const tinycent = Number( '5000' );

        //get the current exchange rate via REST API
        const url = `${mirrorNodeBaseUrl}/api/v1/network/exchangerate`;
        const response = await axios.get(url);
        const currentRate = response.data.current_rate;
        const centEquivalent = Number(currentRate.cent_equivalent);
        const hbarEquivalent = Number(currentRate.hbar_equivalent);
        const centToHbarRatio = centEquivalent/hbarEquivalent;

        //calculate the fee in terms of HBAR
        const tinybar = BigNumber(tinycent / centToHbarRatio).decimalPlaces(0);
        const poolCreateFeeInHbar = tinybar;
        console.log(`Pool creation fee: ${poolCreateFeeInHbar.toString()}`);

        return poolCreateFeeInHbar;
    }

    /**
     * Creating a New Token/Token Liquidity Pool
     *
     * @link https://docs.saucerswap.finance/v/developer/saucerswap-v1/liquidity-operations/create-a-new-pool#creating-a-new-token-token-liquidity-pool
     */
    const createNewTokenTokenLiquidityPool = async (
        tokenAEvmAddress,
        tokenBEvmAddress,
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin,
        toEvmAddress
        ) => {
        try {
            //Client pre-checks:
            // - Max auto-association increased by one
            // - Router contract has spender allowance for the input tokens

            const params = new ContractFunctionParameters();
            params.addAddress( tokenAEvmAddress ); //address tokenA
            params.addAddress( tokenBEvmAddress ); //address tokenB
            params.addUint256( amountADesired ); //uint amountADesired - in smallest unit
            params.addUint256(amountBDesired); //uint amountBDesired - in smallest unit
            params.addUint256(amountAMin); //uint amountAMin - in smallest unit
            params.addUint256(amountBMin); //uint amountBMin - in smallest unit
            params.addAddress(toEvmAddress); //address to
            params.addUint256( Math.floor(Date.now() / 1000) + 1000 ); //uint deadline - Unix seconds - from 1970

            const poolCreationFeeHbar = await getPoolCreationFee();

            const response = await new ContractExecuteTransaction()
                .setPayableAmount(poolCreationFeeHbar)
                .setContractId( saucer_swap_v1_router_v3_contract_address )
                /**
                 * If you get INSUFFICIENT_GAS error, it means that your gas limit for the transaction is
                 * too low so the transaction run out of gas before it's done with the execution.
                 *
                 * @link https://stackoverflow.com/questions/75767756/why-i-get-insufficient-gas-when-i-try-to-deploy-a-smart-contract-on-hedera
                 */
                .setGas( 100000000 )
                .setFunction('addLiquidityNewPool', params)
                .execute(client);

            console.log('Response: ', response );

            const transaction_receipt = await new TransactionReceiptQuery()
                .setTransactionId(response?.transactionId)
                .execute(client);

            console.log( 'Transaction Receipt: ', transaction_receipt );

            const record = await response.getRecord(client);
            const result = record.contractFunctionResult!;
            const values = result.getResult(['uint', 'uint', 'uint']);
            const amountA = values[0]; //uint amountA - in its smallest unit
            const amountB = values[1]; //uint amountB - in its smallest unit
            const liquidity = values[2]; //uint liquidity

            console.log('Amount A: ', amountA)
            console.log('Amount B: ', amountB)
            console.log('Liquidity: ', liquidity)

            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Creating a New HBAR/Token Liquidity Pool
     *
     * @link https://docs.saucerswap.finance/v/developer/saucerswap-v1/liquidity-operations/create-a-new-pool#creating-a-new-hbar-token-liquidity-pool
     *
     * @param tokenEvmAddress // EVM address of the token to pair with HBAR
     * @param amountTokenDesired // The maximum token amount in its smallest unit
     * @param amountTokenMin // The minimum token amount in its smallest unit
     * @param amountHBARMin // The minimum HBAR amount in its smallest unit (tinybar)
     * @param toAddress // EVM address to receive the new liquidity tokens
     */
    const createNewHBARTokenLiquidityPool = async (
        tokenEvmAddress,
        amountTokenDesired,
        amountTokenMin,
        amountHBARMin,
        toAddress
    ) => {
        //Client pre-checks:
        // - Max auto-association increased by one
        // - Router contract has spender allowance for the input token

        const params = new ContractFunctionParameters();
        params.addAddress( tokenEvmAddress ); //address token
        params.addUint256(amountTokenDesired); //uint amountTokenDesired  - in smallest unit
        params.addUint256(amountTokenMin); //uint amountTokenMin  - in smallest unit
        params.addUint256(amountHBARMin); //uint amountETHMin  - in smallest unit
        params.addAddress(toAddress); //address to
        params.addUint256( Math.floor(Date.now() / 1000) + 1000 ); //uint deadline - Unix seconds - from 1970

        const poolCreationFeeHbar = await getPoolCreationFee();
        const inputHbarAndPoolCreationFeeHbar = poolCreationFeeHbar + ethers.formatUnits( amountHBARMin, 6 )

        const response = await new ContractExecuteTransaction()
            .setPayableAmount(inputHbarAndPoolCreationFeeHbar) //input hbar + pool creation fee
            .setContractId( saucer_swap_v1_router_v3_contract_address )
            /**
             * If you get INSUFFICIENT_GAS error, it means that your gas limit for the transaction is
             * too low so the transaction run out of gas before it's done with the execution.
             *
             * @link https://stackoverflow.com/questions/75767756/why-i-get-insufficient-gas-when-i-try-to-deploy-a-smart-contract-on-hedera
             */
            .setGas( 100000000 )
            .setFunction('addLiquidityETHNewPool', params)
            .execute(client);

        console.log( 'Response: ', response );

        const record = await response.getRecord(client);
        const result = record.contractFunctionResult!;
        const values = result.getResult(['uint','uint','uint']);
        const amountToken = values[0]; //uint amountToken
        const amountHBAR = values[1]; //uint amountETH
        const liquidity = values[2]; //uint liquidity

        console.log('Amount Token: ', amountToken)
        console.log('Amount HBAR: ', amountHBAR)
        console.log('Liquidity: ', liquidity)

        return true;
    }

    useEffect(  () => {
        async function fetch() {
            // await getPoolCreationFee();

            /*
            await createNewTokenTokenLiquidityPool(
                convertAccountIdToEVMAddress( hbar_token_id ),
                convertAccountIdToEVMAddress( test_token_id ),
                Number( ethers.parseUnits( '10000', hbar_token_id_decimals ) ),
                Number( ethers.parseUnits( '10000',  test_token_id_decimals ) ),
                100,
                100,
                convertAccountIdToEVMAddress( MY_ACCOUNT_ID )
            )*/

            /*
            await createNewHBARTokenLiquidityPool(
                convertAccountIdToEVMAddress( sauce_token_id ),
                Number( ethers.parseUnits( '10000',  sauce_token_id_decimals ) ), // Desired Tokens
                Number( ethers.parseUnits( '10000',  test_token_id_decimals ) ), // Min Tokens
                Number( ethers.parseUnits( '10000',  hbar_token_id_decimals ) ), // Min HBAR
                convertAccountIdToEVMAddress( MY_ACCOUNT_ID ) // EVM address to receive the new liquidity tokens
            );*/

        }

        fetch();
    }, [ ]);
}