<?php
/**
 * Plugin Name:       WooCommerce Tokens Payment Gateway
 * Plugin URI:        https://orbis86.com
 * Description:       WooCommerce Tokens Payment Gateway enables customers to pay with Hedera tokens, or Ether or any ERC20 or ERC223 token on your WooCommerce store.
 * Version:           0.0.1
 * Author:            Orbis86
 * Author URI:        https://orbis86.com
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       woocommerce-tokens-payment-gateway
 * Domain Path:       /languages
 * Network:           false
 * Requires WP:        5.4
 * Requires PHP:       7.4
 * Tested up to:       6.3.1
 */

use WooCommerce_Tokens_Payment_Gateway\WooCommerce_Tokens_Payment_Gateway;

if ( ! defined( 'WPINC' ) ) {
	exit;
}

if ( ! defined( 'WOOCOMMERCE_TOKENS_PAYMENT_GATEWAY_PLUGIN_FILE' ) ) {
	define( 'WOOCOMMERCE_TOKENS_PAYMENT_GATEWAY_PLUGIN_FILE', __FILE__ );
} // end if;


/**
 * Currently plugin version.
 * Start at version 0.0.1 and use SemVer - https://semver.org
 * Rename this for your plugin and update it as you release new versions.
 */
define( 'WOOCOMMERCE_TOKENS_PAYMENT_GATEWAY_VERSION', '0.0.1' );

/**
 * Require core file dependencies
 */
require_once __DIR__ . '/constants.php';

require_once __DIR__ . '/includes/class-autoloader.php';

require_once __DIR__ . '/dependencies/autoload.php';

require_once __DIR__ . '/includes/traits/trait-singleton.php';

//Add custom links under the plugin's row
add_filter( 'network_admin_plugin_action_links_' . plugin_basename( __FILE__ ), 'woocommerce_tokens_payment_gateway_plugin_links' );
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'woocommerce_tokens_payment_gateway_plugin_links' );
function woocommerce_tokens_payment_gateway_plugin_links( $links ) {
	// $links[] = '<a href="https://orbis86.com" target="_blank" rel="noopener">' . __('Documentation') . '</a>';
	return $links;
}


/**
 * Setup autoloader
 */
\WooCommerce_Tokens_Payment_Gateway\Autoloader::init();

/**
 * Setup activation/deactivation hooks
 */
\WooCommerce_Tokens_Payment_Gateway\Hooks::get_instance();

/**
 * Setup Filters
 */
\WooCommerce_Tokens_Payment_Gateway\Filters::get_instance();

/**
 * Initializes the WooCommerce Tokens Payment Gateway class
 *
 * This function returns the WooCommerce_Tokens_Payment_Gateway class singleton, and
 * should be used to avoid declaring globals.
 *
 * @return object
 * @since 0.0.1
 */
function woocommerce_tokens_payment_gateway() {
	return WooCommerce_Tokens_Payment_Gateway::get_instance();
} // end WooCommerce_Tokens_Payment_Gateway;

/* Initialize the plugin */
woocommerce_tokens_payment_gateway();

