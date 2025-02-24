<?php
/**
 * Shortcodes Class
 */

namespace WooCommerce_Tokens_Payment_Gateway\Frontend;

// Exit if accessed directly
defined( 'ABSPATH' ) || exit;

use WooCommerce_Tokens_Payment_Gateway\Traits\Singleton;


class Shortcodes {
	use Singleton;

	public function init() {
		// Add shortcode
		add_shortcode( 'wctg-wallet-connect', array( $this, 'connect_wallet_shortcode' ) );
	}

	public function connect_wallet_shortcode( array $atts = array() ) {
		return '<div id="wctg-wallet-connect"></div>';
	}

}