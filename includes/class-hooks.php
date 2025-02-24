<?php
/**
 * WooCommerce Tokens Payment Gateway User Accounts activation and deactivation hooks
 *
 * Also allows running functions attached to specified hooks
 *
 * @package WooCommerce_Tokens_Payment_Gateway
 * @subpackage Hooks
 * @since 0.0.1
 */

namespace WooCommerce_Tokens_Payment_Gateway;

use WooCommerce_Tokens_Payment_Gateway\Traits\Singleton;

// Exit if accessed directly
defined( 'ABSPATH' ) || exit;

class Hooks {

	use Singleton;

	/**
	 * Constructor.
	 */
	public function __construct() {
	} // end __construct;

	/**
	 * Register the activation and deactivation hooks
	 *
	 * @return void
	 * @since 0.0.1
	 */
	public function init() {

		/**
		 * Runs on WooCommerce Tokens Payment Gateway activation
		 */
		register_activation_hook( WOOCOMMERCE_TOKENS_PAYMENT_GATEWAY_PLUGIN_FILE, array( $this, 'on_activation' ) );

		/**
		 * Runs on WooCommerce Tokens Payment Gateway deactivation
		 */
		register_deactivation_hook( WOOCOMMERCE_TOKENS_PAYMENT_GATEWAY_PLUGIN_FILE, array( $this, 'on_deactivation' ) );

		/**
		 * Runs the activation hook.
		 */
		add_action( 'plugins_loaded', array( $this, 'on_activation_do' ), 1 );

	} // end init;

	/**
	 *  Runs when WooCommerce Tokens Payment Gateway - User Accounts Addon is activated
	 *
	 * @since 0.0.1 It now uses hook-based approach, it is up to each sub-class to attach their own routines.
	 * @since 0.0.1
	 */
	public static function on_activation() {
		if ( ! function_exists( 'is_plugin_active_for_network' ) ) {
			require_once( ABSPATH . 'wp-admin/includes/plugin.php' );
		}


	} // end on_activation;

	/**
	 * Runs whenever the activation flag is set.
	 *
	 * @return void
	 * @since 0.0.1
	 */
	public static function on_activation_do() {

		if ( get_network_option( null, 'woocommerce_tokens_payment_gateway_activation' ) === 'yes' ) {
			// Removes the flag
			delete_network_option( null, 'woocommerce_tokens_payment_gateway_activation' );

			/**
			 * Let other parts of the plugin attach their routines for activation
			 *
			 * @return void
			 * @since 0.0.1
			 */
			do_action( 'woocommerce_tokens_payment_gateway_activation' );
		} // end if;
	} // end on_activation_do;

	/**
	 * Runs when WooCommerce Tokens Payment Gateway is deactivated
	 *
	 * @since 0.0.1 It now uses hook-based approach, it is up to each sub-class to attach their own routines.
	 * @since 0.0.1
	 */
	public static function on_deactivation() {
		if ( ! function_exists( 'is_plugin_active_for_network' ) ) {
			require_once( ABSPATH . 'wp-admin/includes/plugin.php' );
		}


		/**
		 * Let other parts of the plugin attach their routines for deactivation
		 *
		 * @return void
		 * @since 0.0.1
		 */
		do_action( 'woocommerce_tokens_payment_gateway_deactivation' );
	} // end on_deactivation;

} // end class Hooks;
