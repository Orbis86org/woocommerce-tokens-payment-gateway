<?php
/**
 * WooCommerce Tokens Payment Gateway main class
 */

namespace WooCommerce_Tokens_Payment_Gateway;

use WooCommerce_Tokens_Payment_Gateway\Admin\Widgets;
use WooCommerce_Tokens_Payment_Gateway\Gateway\Gateway;
use WooCommerce_Tokens_Payment_Gateway\Traits\Singleton;

class WooCommerce_Tokens_Payment_Gateway {
	use Singleton;

	/**
	 * Helper Class
	 */
	public $helper;

	/**
	 * The unique identifier of this plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string $plugin_name The string used to uniquely identify this plugin.
	 */
	protected $plugin_name;
	/**
	 * The current version of the plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string $version The current version of the plugin.
	 */
	protected $version;

	/**
	 * Class Initializer
	 */
	public function init() {

		if ( defined( 'WOOCOMMERCE_TOKENS_PAYMENT_GATEWAY_VERSION' ) ) {
			$this->version = WOOCOMMERCE_TOKENS_PAYMENT_GATEWAY_VERSION;
		} else {
			$this->version = '0.0.1';
		}
		$this->plugin_name = 'woocommerce-tokens-payment-gateway';

		/*
         * Loads the Helper class.
         */
		$this->helper = Helper::get_instance();
		/*
		 * Load Scripts
		 */
		Scripts::get_instance();

		/*
		 * Helper Functions
		 */
		require_once $this->helper->path( 'includes/functions/helper.php' );

		/*
		 * Load dependencies need to run the plugin
		 */
		add_action( 'plugins_loaded', array( $this, 'load_dependencies' ) );

		/*
		 * Load Admin Pages
		 */
		add_action( 'wp_loaded', array( $this, 'load_admin_pages' ), 40, 1 );

		/*
		 * Load Shortcodes
		 */
		\WooCommerce_Tokens_Payment_Gateway\Frontend\Shortcodes::get_instance();

		/*
		 * Load Gateway Class
		 */
		add_action( 'plugins_loaded', array( $this, 'load_gateway' ), 10, 1 );

		/*
		 * Load Widgets
		 */
		Widgets::get_instance();

	}


	/**
	 * Load all components required by this plugin
	 */
	public function load_dependencies() {

		/*
		 * Load Admin Notices
		 */
		Admin_Notices::get_instance();

	}

	/**
	 * Load admin pages
	 */
	public function load_admin_pages() {

	}

	/**
	 * Load Gateway Class
	 */
	public function load_gateway() {

		if( class_exists( '\WooCommerce_Tokens_Payment_Gateway\Gateway\Gateway' )){
			Gateway::get_instance();
		}

	}

	/**
	 * The name of the plugin used to uniquely identify it within the context of
	 * WordPress and to define internationalization functionality.
	 *
	 * @return    string    The name of the plugin.
	 * @since     1.0.0
	 */
	public function get_plugin_name(): string {
		return $this->plugin_name;
	}

	/**
	 * Retrieve the version number of the plugin.
	 *
	 * @return    string    The version number of the plugin.
	 * @since     1.0.0
	 */
	public function get_version(): string {
		return $this->version;
	}
}