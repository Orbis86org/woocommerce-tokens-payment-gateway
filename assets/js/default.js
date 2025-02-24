jQuery(document).ready(function($) {
	// Function to update the button based on the selected gateway
	function updateOrderButton() {
		// Check if 'tokens-gateway' is selected
		if ($('input[name="payment_method"]:checked').val() === 'tokens-gateway') {
			// Add the ID 'renderButton' to the Place Order button
			$('#place_order').attr('id', 'renderButton');
		} else {
			// Remove 'renderButton' ID if a different gateway is selected
			$('#renderButton').attr('id', 'place_order');
		}
	}

	// Call the function on page load to set the initial state
	updateOrderButton();

	// Call the function whenever a payment method is selected
	$('form.checkout').on('change', 'input[name="payment_method"]', function() {
		updateOrderButton();
	});
});
