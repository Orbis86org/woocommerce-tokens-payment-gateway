/**
 * ###########################################################################################
 * Hedera Token Service JS
 *
 * @link https://rudrastyh.com/woocommerce/payment-gateway-plugin.html
 * ###########################################################################################
 */
// Create dialog div
let dialog_body = '<div style="text-align: center"> ';

// Check if WooCommerce NFTs is supported
if( wctg_main_object.compatible_plugins.includes( "woocommerce_nfts" ) && wctg_main_object.woocommerce_nfts_single_transaction === 'yes' ){
    if( wctg_main_object.supported_tokens.includes( "hbar" ) ){
        dialog_body = dialog_body + '<button id="wctg-pay-with-hbar" class="et_pb_module et_pb_button" onclick="wctg_request_hbar_payment_and_transfer_nfts();" style="cursor: pointer">Pay with HBAR</button>';
    }

    if( wctg_main_object.supported_tokens.includes( "hbar" ) && wctg_main_object.supported_tokens.includes( "hedera_tokens" ) ){
        dialog_body = dialog_body + '<span> OR </span>';
    }

    if( wctg_main_object.supported_tokens.includes( "hedera_tokens" ) ){
        dialog_body = dialog_body + '<button id="wctg-pay-with-token" class="et_pb_module et_pb_button" onclick="wctg_request_token_payment_and_transfer_nfts();" style="cursor: pointer">Pay with Token</button>';
    }
} else {
    if( wctg_main_object.supported_tokens.includes( "hbar" ) ){
        dialog_body = dialog_body + '<button id="wctg-pay-with-hbar" class="et_pb_module et_pb_button" onclick="wctg_request_hbar_payment();" style="cursor: pointer">Pay with HBAR</button>';
    }

    if( wctg_main_object.supported_tokens.includes( "hbar" ) && wctg_main_object.supported_tokens.includes( "hedera_tokens" ) ){
        dialog_body = dialog_body + '<span> OR </span>';
    }

    if( wctg_main_object.supported_tokens.includes( "hedera_tokens" ) ){
        dialog_body = dialog_body + '<button id="wctg-pay-with-token" class="et_pb_module et_pb_button" onclick="wctg_request_token_payment();" style="cursor: pointer">Pay with Token</button>';
    }
}

// Close dialog div
dialog_body = dialog_body + '</div>';

let dialog = xdialog.create(
    {
        title: 'Place Order',
        body: dialog_body,
        buttons: ['cancel'],
        afterhide: function () {
            console.log('Dialog hidden');
            // Reset button texts
            jQuery( "#wctg-pay-with-hbar").text('Pay with HBAR').removeAttr('disabled');
            jQuery( "#wctg-pay-with-token").text('Pay with Token').removeAttr('disabled');
        },
        oncancel: function () {
            console.log('Dialog cancelled');
            // Reset button texts
            jQuery( "#wctg-pay-with-hbar").text('Pay with HBAR').removeAttr('disabled');
            jQuery( "#wctg-pay-with-token").text('Pay with Token').removeAttr('disabled');
        },
        ondestroy: function () {
            // Reset button texts
            jQuery( "#wctg-pay-with-hbar").text('Pay with HBAR').removeAttr('disabled');
            jQuery( "#wctg-pay-with-token").text('Pay with Token').removeAttr('disabled');

            return false; // Prevent the dialog from being destroyed
        }
    }
);

// Assign checkout form to variable
var checkout_form = jQuery( 'form.woocommerce-checkout' );

// Run when our payment gateway is chosen
jQuery(function(){
    jQuery( 'body' )
        .on( 'updated_checkout', function() {
            usingGateway();

            jQuery('input[name="payment_method"]').change(function(){
                console.log("payment method changed");
                usingGateway();

            });
        });
});

// Detect if we are using our gateway
function usingGateway(){
    console.log(jQuery("input[name='payment_method']:checked").val());
    if(jQuery('form[name="checkout"] input[name="payment_method"]:checked').val() == 'tokens-gateway'){
        console.log('using our gateway')
        WCTG_JS.hashconnect_setup();
        checkout_form.on( 'checkout_place_order', tokenRequest );
    } else {
        console.log('not using our gateway')
        checkout_form.off( 'checkout_place_order', tokenRequest );
    }
}

// Run if our gateway is selected
jQuery(function($){

    if(jQuery('form[name="checkout"] input[name="payment_method"]:checked').val() == 'tokens-gateway' ) {
        //WCTG_JS.hashconnect_setup();
        //checkout_form.on( 'checkout_place_order', tokenRequest );
    }

});

// Run if payment is successful
var successCallback = function(data) {
    // Reset button texts
    jQuery( "#wctg-pay-with-hbar").text('Pay with HBAR');
    jQuery( "#wctg-pay-with-token").text('Pay with Token');
    dialog.hide();

    // Add value to hidden input
    checkout_form.find('#wtpg-token-status').val( '3756' );

    // deactivate the tokenRequest function event
    checkout_form.off( 'checkout_place_order', tokenRequest );

    // Disable our prompt payment popup
    dialog = null;

    // submit the form now
    console.log( 'Submitting form' );
    checkout_form.submit();

};

// Run if payment is not successful
var errorCallback = function(data) {
    dialog.hide();
};


// Request user for payment using HBAR or Token
var tokenRequest = function( event ) {
    console.log('inside tokenRequest');

    /*
     * Check if user has connected wallet before showing dialog
     */
    let sender_account = wctg_get_cookie( 'wc_nfts_account_id' );
    if( sender_account === '' ){
        toastr["warning"]("Please connect your wallet.");
    } else {
        dialog.show();

        return false;
    }


    // here will be a payment gateway function that process all the card data from your form,
    // maybe it will need your Publishable API key which is misha_params.publishableKey
    // and fires successCallback() on success and errorCallback on failure
    // return false;




};

/**
 * Request HBAR payment
 *
 * @returns {Promise<void>}
 */
async function wctg_request_hbar_payment() {
    jQuery( "#wctg-pay-with-hbar").text('Loading...').attr('disabled', 'disabled');

    /*
     * Get Sender Account
     */
    // Get from cookie if exists
    let sender_account = wctg_get_cookie( 'wc_nfts_account_id' );

    let transaction_status = await WCTG_JS.hashconnect_transfer_hbar(
        wctg_main_object.hedera_hbar_amount,
        sender_account,
        ''
    );

    handle_hashpack_response( transaction_status )
}

/**
 * Request HBAR Payment and Transfer NFTs in a Single Transaction
 *
 * @returns {Promise<void>}
 */
async function wctg_request_hbar_payment_and_transfer_nfts() {

    jQuery( "#wctg-pay-with-hbar").text('Loading...').attr('disabled', 'disabled');

    /*
     * Get Sender Account
     */
    // Get from cookie if exists
    let sender_account = wctg_get_cookie( 'wc_nfts_account_id' );
    let nft_receiver_account = sender_account;

    // Add sender account to NFT object
    wctg_main_object.nfts.forEach( function ( item, index, arr ) {
        item.nft_receiver_account = nft_receiver_account
    });

    let transaction_status = await WCTG_JS.hashconnect_transfer_hbar_and_nfts(
        wctg_main_object.hedera_hbar_amount,
        sender_account,
        wctg_main_object.nfts,
        ''
    );

    handle_hashpack_response( transaction_status )
}

/**
 * Request Token Payment
 *
 * @param token_id
 * @param token_amount
 * @param sender_account
 * @param decimals
 * @param memo
 * @returns {Promise<void>}
 */
async function wctg_request_token_payment() {
    jQuery( "#wctg-pay-with-token").text('Loading...').attr('disabled', 'disabled');

    /*
     * Get Sender Account
     */
    // Get from cookie if exists
    let sender_account = wctg_get_cookie( 'wc_nfts_account_id' );

    let transaction_status = await WCTG_JS.hashconnect_transfer_token(
        wctg_main_object.hedera_token_id,
        wctg_main_object.hedera_token_amount,
        sender_account,
        wctg_main_object.hedera_token_decimals,
        ''
    );

    handle_hashpack_response( transaction_status )
}

/**
 * Request Token Payment and Transfer NFTs in a Single Transaction
 *
 * @param token_id
 * @param token_amount
 * @param sender_account
 * @param decimals
 * @param memo
 * @returns {Promise<void>}
 */
async function wctg_request_token_payment_and_transfer_nfts() {
    jQuery( "#wctg-pay-with-token").text('Loading...').attr('disabled', 'disabled');

    /*
     * Get Sender Account
     */
    // Get from cookie if exists
    let sender_account = wctg_get_cookie( 'wc_nfts_account_id' );
    let nft_receiver_account = sender_account;

    // Add sender account to NFT object
    wctg_main_object.nfts.forEach( function ( item, index, arr ) {
        item.nft_receiver_account = nft_receiver_account
    });

    let transaction_status = await WCTG_JS.hashconnect_transfer_token_and_nfts(
        wctg_main_object.hedera_token_id,
        wctg_main_object.hedera_token_amount,
        sender_account,
        wctg_main_object.nfts,
        wctg_main_object.hedera_token_decimals,
        ''
    );

    handle_hashpack_response( transaction_status )
}

/**
 * Handle Hashpack Response
 *
 * @param transaction_status
 */
var handle_hashpack_response = function ( transaction_status ) {

    if( transaction_status === true ){
        console.log( 'Transaction successful' );
        successCallback( transaction_status );
    } else {
        console.log( 'Transaction NOT successful' );
        errorCallback( transaction_status );
    }
}

// Change url
jQuery(document).ready(function(){
    // window.history.pushState(web3_connection_js_object.checkout_url, web3_connection_js_object.checkout_title, web3_connection_js_object.checkout_url );
});

/*
 * Get value of a cookie
 *
 * @param cname
 * @returns {string}
 */
function wctg_get_cookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}


