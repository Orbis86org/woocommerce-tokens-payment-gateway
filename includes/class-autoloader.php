<?php
/**
 * WooCommerce Tokens Payment Gateway custom Autoloader.
 *
 * @package WOOCOMMERCE_TOKENS_PAYMENT_GATEWAY
 * @subpackage Autoloader
 * @since 0.0.1
 */

namespace WooCommerce_Tokens_Payment_Gateway;

use Pablo_Pacheco\WP_Namespace_Autoloader\WP_Namespace_Autoloader;

// Exit if accessed directly
defined( 'ABSPATH' ) || exit;

/**
 * Auto-loads class files inside the inc folder.
 *
 * @since 0.0.1
 */
class Autoloader {

	/**
	 * Makes sure we are only using one instance of the class
	 *
	 * @var object
	 */
	public static $instance;

	/**
	 * Static-only class.
	 */
	private function __construct() {
	} // end __construct;

	/**
	 * Initializes our custom autoloader
	 *
	 * @return void
	 * @since 0.0.1
	 */
	public static function init() {

		if ( ! static::$instance instanceof static ) {
			static::$instance = new WP_Namespace_Autoloader( array(
				'directory'            => dirname( dirname( __FILE__ ) ),
				'namespace_prefix'     => 'WooCommerce_Tokens_Payment_Gateway',
				'classes_dir'          => 'includes',
				'lowercase'            => array( 'file', 'folders' ),
				'underscore_to_hyphen' => array( 'file', 'folders' ),
				'debug'                => Autoloader::is_debug(),
			) );

			static::$instance->init();
		} // end if;
	} // end init;

	/**
	 * Checks for unit tests and WOOCOMMERCE_TOKENS_PAYMENT_GATEWAY_DEBUG.
	 *
	 * @return boolean
	 * @since 0.0.1
	 */
	public static function is_debug() {
		return false;
	} // end is_debug;
} // end class Autoloader;
