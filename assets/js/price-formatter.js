/**
 * Price Formatter
 *
 * It uses the WooCommerce Currency Settings
 */

/**
 * Format price
 *
 * @param price
 * @returns {boolean|*}
 */
window.wtpg_format_price = function(price) {
	if ( typeof wtpg_price_formatter_params === 'undefined' ) {
		return false;
	}

	return accounting.formatMoney( price, {
		symbol:    wtpg_price_formatter_params.currency_format_symbol,
		decimal:   wtpg_price_formatter_params.currency_format_decimal_sep,
		thousand:  wtpg_price_formatter_params.currency_format_thousand_sep,
		precision: wtpg_price_formatter_params.currency_format_num_decimals,
		format:    wtpg_price_formatter_params.currency_format
	});
}


/**
 * Get currency symbol
 *
 * @returns {boolean|*}
 */
window.wtpg_format_price_get_currency_symbol = function() {
	if ( typeof wtpg_price_formatter_params === 'undefined' ) {
		return false;
	}

	const formatted_price = window.wtpg_format_price(0);

	// Get text before 0
	return formatted_price.substring(0, formatted_price.indexOf("0"));
}