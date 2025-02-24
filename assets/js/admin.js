/**
 * Admin JS - applied to WooCommerce Tokens Payment Gateway admin settings page
 */

jQuery('#woocommerce_tokens-gateway_tokens').on('select2:select', function (e) {
    var data = e.params.data;
    console.log(data);
});

/**
 * Trigger change in selected tokens
 */
jQuery(document).ready(function(){
    let selected_values = jQuery("#woocommerce_tokens-gateway_tokens").select2('data');
    selected_values.each( function (){
        // ERC20

    });
});

let show_erc20_fields = function (){

};