/**
 * Wallet Verification JS
 *
 * Tutorials:
 * 1. https://docs.infura.io/infura/tutorials/ethereum/retrieve-and-display-erc-721-and-erc-1155-tokens
 * 2. https://community.infura.io/t/web3-js-how-to-retrieve-and-display-an-nft-erc-721-erc-1155/5346
 */
const NFT_MEMBERSHIPS_INFURA_API_KEY = 'fd50d393a84b402a9cd162da98c383eb';
const NFT_MEMBERSHIPS_RPC_URL = 'https://mainnet.infura.io/v3/fd50d393a84b402a9cd162da98c383eb';
const nft_memberships_ajax_url = web3_connection_js_object.ajax_url;

/**
 * Setup Web3 object
 */
const web3 = new Web3( NFT_MEMBERSHIPS_RPC_URL );

if (typeof window.ethereum !== 'undefined') {
    console.log('MetaMask is installed!');
}

const ethEnabled = async () => {
    if (window.ethereum) {
        let accounts = await window.ethereum.request({method: 'eth_requestAccounts'});
        window.web3 = new Web3(window.ethereum);
        console.log('enabled');
        console.log(accounts[0])

        // Save address to user meta via ajax
        let add_owner_nonce = web3_connection_js_object.add_owner_nonce;
        jQuery.ajax({
            type: "post",
            dataType: "json",
            url: nft_memberships_ajax_url,
            data: {
                action: 'nft_memberships_add_owner_address',
                nonce: add_owner_nonce,
                owner_address: accounts[0],
            },
            success: function (data) {
                console.log('Success')
                jQuery('#enableEthereumButton').html('<button type="button" class="btn btn-outline-success">Success...</button>')
                location.reload();

            },
            error: function (error) {
                console.log('Error');
                jQuery('#enableEthereumButton').html('<button type="button" class="btn btn-outline-danger">Error...</button>')
                location.reload();
            }
        });

        return true;
    }
    console.log('disabled');
    return false;
}

/**
 * Get Address from MetaMask
 */
const ethereumButton = document.querySelector('#enableMetaMaskButton');
if( ethereumButton !== null ){
    ethereumButton.addEventListener('click', () => {
        jQuery('#enableEthereumButton').html('<button class="btn btn-primary" type="button" disabled>\n' +
            '  <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>\n' +
            '  Loading...\n' +
            '</button>');
        ethEnabled().then(r => console.log('done'));
    });

}

/**
 * Get Address from Form
 */
jQuery("#wallet-address-submit").click(function(){
    jQuery(this).attr('disabled', 'disabled');
    jQuery('#wallet-address-submit').html('<button class="btn btn-primary" type="button" disabled>\n' +
        '  <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>\n' +
        '  Loading...\n' +
        '</button>');

    // Get value from input
    let wallet_address = jQuery('#wallet_address').val();
    console.log(wallet_address);

    // Save address to user meta via ajax
    let add_owner_nonce = web3_connection_js_object.add_owner_nonce;
    jQuery.ajax({
        type: "post",
        dataType: "json",
        url: nft_memberships_ajax_url,
        data: {
            action: 'nft_memberships_add_owner_address',
            nonce: add_owner_nonce,
            owner_address: wallet_address,
        },
        success: function (data) {
            console.log('Success')
            jQuery('#enableEthereumButtonForm').html('<button type="button" class="btn btn-outline-success">Success...</button>')
            location.reload();

        },
        error: function (error) {
            console.log('Error');
            jQuery('#enableEthereumButtonForm').html('<button type="button" class="btn btn-outline-danger">Error...</button>')
            location.reload();
        }
    });


})

/**
 * Reset Wallet
 */
jQuery("#resetAddressButton").click(function(){
    console.log('clicked');

    jQuery(this).attr('disabled', 'disabled');
    jQuery('#resetAddressButton').html('<button class="btn btn-outline-danger" type="button" disabled>\n' +
        '  <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>\n' +
        '  Loading...\n' +
        '</button>');

    jQuery.ajax({
        type: "post",
        dataType: "json",
        url: nft_memberships_ajax_url,
        data: {
            action: 'nft_memberships_reset_owner_address',
        },
        success: function (data) {
            console.log('Success')
            jQuery('#resetAddressButton').html('<button type="button" class="btn btn-outline-success">Success...</button>')
            location.reload();

        },
        error: function (error) {
            console.log('Error');
            jQuery('#resetAddressButton').html('<button type="button" class="btn btn-outline-danger">Error...</button>')
            location.reload();
        }
    });


})

/**
 * Subscribe
 */
jQuery(".subscribe-nft-membership").click(function( e ){
    e.preventDefault();

    let element = this;

    let membership_id = jQuery(this).data( 'membership-id' );

    jQuery(this).attr('disabled', 'disabled');
    jQuery(this).html('<button type="button" class="w-100 btn btn-lg btn-outline-primary text-center"><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>\n' +
        '  Loading...\n' +
        '</button>'
    );

    let subscribe_user_nonce = web3_connection_js_object.subscribe_user_nonce;

    jQuery.ajax({
        type: "post",
        dataType: "json",
        url: nft_memberships_ajax_url,
        data: {
            action: 'nft_memberships_subscribe_user',
            nonce: subscribe_user_nonce,
            membership_id: membership_id
        },
        success: function (data) {
            if( true === data.success ){
                jQuery(element).html('<button type="button" class="w-100 btn btn-lg btn-outline-success text-center">\n' +
                    '  Success...\n' +
                    '</button>');
                location.reload();
            } else {
                jQuery(element).html('<button type="button" class="w-100 btn btn-lg btn-outline-danger text-center">\n' +
                    '  Error...\n' +
                    '</button>');
            }

        },
        error: function (error) {
            jQuery(element).html('<button type="button" class="w-100 btn btn-lg btn-outline-danger text-center">\n' +
                '  Error...\n' +
                '</button>');
        }
    });


})

/**
 * Unsubscribe
 */
jQuery(".unsubscribe-nft-membership").click(function( e ){
    e.preventDefault();

    let membership_id = jQuery(this).data( 'membership-id' );

    let element = this;

    jQuery(this).attr('disabled', 'disabled');
    jQuery(this).html('<button type="button" class="w-100 btn btn-lg btn-outline-primary text-center btn-sm"><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>\n' +
        '  Loading...\n' +
        '</button>'
    );

    let unsubscribe_user_nonce = web3_connection_js_object.unsubscribe_user_nonce;

    jQuery.ajax({
        type: "post",
        dataType: "json",
        url: nft_memberships_ajax_url,
        data: {
            action: 'nft_memberships_unsubscribe_user',
            nonce: unsubscribe_user_nonce,
            membership_id: membership_id
        },
        success: function (data) {
            if( true === data.success ){
                jQuery(element).html('<button type="button" class="w-100 btn btn-lg btn-outline-success text-center btn-sm">\n' +
                    '  Success...\n' +
                    '</button>');
                location.reload();
            } else {
                jQuery(element).html('<button type="button" class="w-100 btn btn-lg btn-outline-danger text-center btn-sm">\n' +
                    '  Error...\n' +
                    '</button>');
            }

        },
        error: function (error) {
            jQuery(element).html('<button type="button" class="w-100 btn btn-lg btn-outline-danger text-center btn-sm">\n' +
                '  Error...\n' +
                '</button>');
        }
    });


})

/**
 * Get Hedera Account ID from Form
 */
jQuery("#hedera-id-submit").click(function(){
    jQuery(this).attr('disabled', 'disabled');
    jQuery('#hedera-id-submit').html('<button class="btn btn-primary" type="button" disabled>\n' +
        '  <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>\n' +
        '  Loading...\n' +
        '</button>');

    // Get value from input
    let account_id = jQuery('#hedera_account_id').val();
    console.log(account_id);

    // Save address to user meta via ajax
    let add_account_nonce = web3_connection_js_object.add_account_nonce;
    jQuery.ajax({
        type: "post",
        dataType: "json",
        url: nft_memberships_ajax_url,
        data: {
            action: 'nft_memberships_add_account_id',
            nonce: add_account_nonce,
            account_id: account_id,
        },
        success: function (data) {
            console.log('Success')
            jQuery('#hederaAccountForm').html('<button type="button" class="btn btn-outline-success">Success...</button>')
            location.reload();

        },
        error: function (error) {
            console.log('Error');
            jQuery('#hederaAccountForm').html('<button type="button" class="btn btn-outline-danger">Error...</button>')
            location.reload();
        }
    });


})

/**
 * Reset Wallet
 */
jQuery("#resetAccountButton").click(function(){
    jQuery(this).attr('disabled', 'disabled');
    jQuery('#resetAccountButton').html('<button class="btn btn-outline-danger" type="button" disabled>\n' +
        '  <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>\n' +
        '  Loading...\n' +
        '</button>');

    jQuery.ajax({
        type: "post",
        dataType: "json",
        url: nft_memberships_ajax_url,
        data: {
            action: 'nft_memberships_reset_account_id',
        },
        success: function (data) {
            console.log('Success')
            jQuery('#resetAccountButton').html('<button type="button" class="btn btn-outline-success">Success...</button>')
            location.reload();

        },
        error: function (error) {
            console.log('Error');
            jQuery('#resetAccountButton').html('<button type="button" class="btn btn-outline-danger">Error...</button>')
            location.reload();
        }
    });


})

/**
 * HashpackConnect AJAX
 */
function hashpack_connect_ajax( pairing_data )
{
    console.log( pairing_data );
    jQuery('#hashpack-connect-btn').html('<button type="button" class="btn btn-outline-info">Loading...</button>')

    // Get value from input
    let account_id = pairing_data.accountIds[0];
    console.log(account_id);

    // Save address to user meta via ajax
    let add_account_nonce = web3_connection_js_object.add_account_nonce;
    jQuery.ajax({
        type: "post",
        dataType: "json",
        url: nft_memberships_ajax_url,
        data: {
            action: 'nft_memberships_add_account_id',
            nonce: add_account_nonce,
            account_id: account_id,
        },
        success: function (data) {
            console.log('Success')
            jQuery('#hashpack-connect-btn').html('<button type="button" class="btn btn-outline-success">Success...</button>');
            location.reload();

        },
        error: function (error) {
            console.log('Error');
            jQuery('#hashpack-connect-btn').html('<button type="button" class="btn btn-outline-danger">Error...</button>')
            location.reload();
        }
    });

}