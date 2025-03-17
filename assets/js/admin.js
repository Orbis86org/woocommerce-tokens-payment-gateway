/**
 * Admin JS - applied to WooCommerce Tokens Payment Gateway admin settings page
 */

jQuery(document).ready(function($) {
	// Cache the checkbox and dropdowns
	const $testnet_checkbox = $('#woocommerce_tokens-gateway_testnet');
	const $supported_tokens_select = $('#woocommerce_tokens-gateway_tokens');
	const $default_token_select = $('#woocommerce_tokens-gateway_default_token');

	// Function to update token dropdowns
	function update_token_dropdowns(network) {
		$.ajax({
			url: wctg_admin_params.ajax_url,
			type: 'POST',
			data: {
				action: 'wctg_get_supported_tokens',
				nonce: wctg_admin_params.nonce,
				network: network,
			},
			success: function(response) {
				if (response.success) {
					const tokens = response.data.tokens;

					// Clear existing options
					$supported_tokens_select.empty();
					$default_token_select.empty();

					// Add new options to Supported Tokens (multiselect)
					$.each(tokens, function(value, label) {
						const $option = $('<option></option>')
							.attr('value', value)
							.text(label);
						$supported_tokens_select.append($option);
					});

					// Add new options to Default Token (select)
					$default_token_select.append('<option value="">Select token</option>');
					$.each(tokens, function(value, label) {
						const $option = $('<option></option>')
							.attr('value', value)
							.text(label);
						$default_token_select.append($option);
					});

					// Reinitialize WooCommerce enhanced select
					$supported_tokens_select.trigger('change');
					$default_token_select.trigger('change');
				}
			},
			error: function() {
				console.error('Failed to fetch tokens');
			}
		});
	}

	// Initial load based on checkbox state
	const initial_network = $testnet_checkbox.is(':checked') ? 'testnet' : 'mainnet';
	// update_token_dropdowns(initial_network);

	// Update tokens when the Testnet checkbox changes
	$testnet_checkbox.on('change', function() {
		console.log('Changed');
		const network = $(this).is(':checked') ? 'testnet' : 'mainnet';
		update_token_dropdowns(network);
	});
});