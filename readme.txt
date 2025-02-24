After building the production code, replace the following in the main.js file

 to_hbar_amount: 1,
            from_hbar_amount: -1,
            toAcc: "0.0.3183101",

with 

to_hbar_amount: web3_connection_js_object.hedera_to_token_amount,
            from_hbar_amount: web3_connection_js_object.hedera_from_token_amount,
            toAcc: web3_connection_js_object.hedera_account_id,


In the 'buildTransaction()' function after the above code, add the following to after the 'if (res.success && ...' code:

handle_hashpack_response( responseData );

After adding above, comment out the following to hide the success overlay
_this.HashconnectService.showResultOverlay(responseData)

For Test network:
Change
let initData = yield _this.hashconnect.init(_this.appMetadata, "testnet", false); in main.js line 17599
to
let initData = yield _this.hashconnect.init(_this.appMetadata, "testnet", true);

or

In main.js file around line 17647 inside function 'requestAccountInfo()', change from
'mainnet'
to
'testnet'

Set the app details in main.js from line 17584

For Custom Tokens
===================
After building the production code, replace the following in the main.js file

tokenTransfers: [{
          tokenId: "0.0.3084461",
          accountId: "",
          amount: 1
        }],

with

 tokenTransfers: [
             // Deduct from treasury account
             {
               tokenId: web3_connection_js_object.hedera_token_id,
               accountId: web3_connection_js_object.hedera_token_treasury_account_id,
               amount: web3_connection_js_object.hedera_from_token_amount,
             },
             // Send deducted amount to account receiving token
             {
                 tokenId: web3_connection_js_object.hedera_token_id,
                 accountId: web3_connection_js_object.hedera_account_id,
                 amount: web3_connection_js_object.hedera_to_token_amount,
             }
         ],