/**
 * Admin JS - applied to WooCommerce Tokens Payment Gateway admin settings page
 */
jQuery(document).ready(function($) {
	const $testnet_checkbox = $('#woocommerce_tokens-gateway_testnet');
	const $supported_tokens_select = $('#woocommerce_tokens-gateway_tokens');
	const $default_token_select = $('#woocommerce_tokens-gateway_default_token');
	const $saucerswap_api_key_input = $('#woocommerce_tokens-gateway_saucerswap_api_key');

	//  Create and append the overlay
	const $overlay = $('<div id="wctg-overlay-message">Setup your SaucerSwap API key first to proceed</div>').css({
		position: 'absolute',
		background: 'rgba(255, 255, 255, 0.85)',
		width: '100%',
		height: '100%',
		top: 0,
		left: 0,
		display: 'flex',
		'justify-content': 'center',
		'align-items': 'center',
		color: '#a00',
		'font-weight': 'bold',
		'z-index': 999,
		'text-align': 'center',
		'font-size': '16px',
		'padding': '2em'
	});

	// Function to check API key and update UI
	function handleApiKeyDependency(saved = false) {
		const apiKey = $saucerswap_api_key_input.val().trim();
		const isSaved = wctg_admin_params.api_key_saved;

		if (!isSaved) {
			$supported_tokens_select.prop('disabled', true);
			$default_token_select.prop('disabled', true);

			if ($('#wctg-overlay-message').length === 0) {
				const $parentWrapper = $supported_tokens_select.closest('tr');
				$parentWrapper.css('position', 'relative').append($overlay.clone());
			}
		} else {
			$supported_tokens_select.prop('disabled', false);
			$default_token_select.prop('disabled', false);
			$('#wctg-overlay-message').remove();
		}
	}


	// Run once on load
	handleApiKeyDependency( true );

	// Update on API key change
	$saucerswap_api_key_input.on('input', function() {
		handleApiKeyDependency();
	});

	// Token loading based on network
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

					$supported_tokens_select.empty();
					$default_token_select.empty();

					$.each(tokens, function(value, label) {
						const $option = $('<option></option>').attr('value', value).text(label);
						$supported_tokens_select.append($option);
					});

					$default_token_select.append('<option value="">Select token</option>');
					$.each(tokens, function(value, label) {
						const $option = $('<option></option>').attr('value', value).text(label);
						$default_token_select.append($option);
					});

					$supported_tokens_select.trigger('change');
					$default_token_select.trigger('change');
				}
			},
			error: function() {
				console.error('Failed to fetch tokens');
			}
		});
	}

	// Update on testnet checkbox toggle
	$testnet_checkbox.on('change', function() {
		const network = $(this).is(':checked') ? 'testnet' : 'mainnet';
		update_token_dropdowns(network);
	});

});
