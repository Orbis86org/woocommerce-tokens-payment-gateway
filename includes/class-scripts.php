<?php
/**
 * Helper class to handle global registering of scripts and styles.
 *
 * @package WooCommerce_Tokens_Payment_Gateway
 * @subpackage Scripts
 * @since 1.0.0
 */

namespace WooCommerce_Tokens_Payment_Gateway;


use WooCommerce_Tokens_Payment_Gateway\Traits\Singleton;

// Exit if accessed directly
defined( 'ABSPATH' ) || exit;

/**
 * WooCommerce Tokens Payment Gateway helper class to handle global registering of scripts and styles.
 *
 * @since 1.0.0
 */
class Scripts {

	use Singleton;

	/**
	 * Runs when the instantiation first occurs.
	 *
	 * @return void
	 * @since 1.0.0
	 */
	public function init() {

		add_action( 'init', array( $this, 'register_default_scripts' ) );
		add_action( 'init', array( $this, 'register_default_styles' ) );

		add_action( 'wp_head', array( $this, 'enqueue_default_frontend_styles' ) );
		add_action( 'wp_head', array( $this, 'enqueue_default_frontend_scripts' ) );

		add_action( 'admin_init', array( $this, 'enqueue_default_admin_styles' ) );
		add_action( 'admin_init', array( $this, 'enqueue_default_admin_scripts' ) );


	} // end init;

	/**
	 * Registers the default WooCommerce Tokens Payment Gateway scripts.
	 *
	 * @return void
	 * @since 1.0.0
	 */
	public function register_default_scripts() {
		/*
		 * Add XDialog JS dependency
		 */
		$this->register_script(
			'woocommerce-tokens-payment-gateway-xdialog',
			woocommerce_tokens_payment_gateway_get_asset( 'xdialog.min.js', 'vendors/js' ),
			array(),
			true
		);

		/*
		 * Add HashConnect - Main JS
		 */
		$this->register_script(
			'woocommerce-tokens-payment-gateway-hashconnect-main',
			woocommerce_tokens_payment_gateway_get_asset( 'main.js', 'js/hashconnect' ),
			array('woocommerce-tokens-payment-gateway-hedera-token-service'),
			true
		);

		/*
		 * Add Hedera Token Service JS
		 */
		$this->register_script(
			'woocommerce-tokens-payment-gateway-hedera-token-service',
			woocommerce_tokens_payment_gateway_get_asset( 'hedera.js', 'js' ),
			array( 'jquery', 'woocommerce-tokens-payment-gateway-xdialog' ),
			true
		);


		/*
		 * Add Admin Page JS
		 */
		$this->register_script(
			'woocommerce-tokens-payment-gateway-admin',
			woocommerce_tokens_payment_gateway_get_asset( 'admin.js', 'js' ),
			array( 'jquery' ),
			true
		);

		/*
		 * Add Toastr JS Vendor File
		 */
		$this->register_script(
			'woocommerce-tokens-payment-gateway-toastr',
			woocommerce_tokens_payment_gateway_get_asset( 'toastr.min.js', 'vendors/js' ),
			array(),
			true
		);

		/*
		 * Add jQuery Repeater JS Vendor File
		 */
		$this->register_script(
			'woocommerce-tokens-payment-gateway-jquery-repeater',
			woocommerce_tokens_payment_gateway_get_asset( 'repeatable-fields.js', 'vendors/js/repeatable-fields' ),
			array('jquery', 'jquery-ui-sortable'),
			true
		);

		/*
		 * Add Price Formatter
		 */
		$this->register_script(
			'woocommerce-tokens-payment-gateway-price-formatter',
			woocommerce_tokens_payment_gateway_get_asset( 'price-formatter.js', 'js' ),
			array(),
			true
		);

		$this->register_script(
			'woocommerce-tokens-payment-gateway-default',
			woocommerce_tokens_payment_gateway_get_asset( 'default.js', 'js' ),
			array(),
			true
		);


	} // end register_script;

	/**
	 * Wrapper for the register scripts function.
	 *
	 * @param string $handle The script handle. Used to enqueue the script.
	 * @param string $src URL to the file.
	 * @param array $deps List of dependency scripts.
	 *
	 * @return void
	 * @since 1.0.0
	 *
	 */
	public function register_script( $handle, $src, $deps = array(), $in_footer = false ) {
		wp_register_script( $handle, $src, $deps, woocommerce_tokens_payment_gateway_get_version(), $in_footer );
	} // end register_style;

	/**
	 * Registers the default WooCommerce Tokens Payment Gateway styles.
	 *
	 * @return void
	 * @since 1.0.0
	 */
	public function register_default_styles() {
		/*
		 * Add Admin Page CSS
		 */
		$this->register_style(
			'woocommerce-tokens-payment-gateway-admin',
			woocommerce_tokens_payment_gateway_get_asset( 'admin.css', 'css' ),
			array(),
		);

		/*
		 * Add XDialog CSS
		 */
		$this->register_style(
			'woocommerce-tokens-payment-gateway-xdialog',
			woocommerce_tokens_payment_gateway_get_asset( 'xdialog.min.css', 'vendors/css' ),
			array(),
		);

		/*
		 * Add Toastr CSS Vendor File
		 */
		$this->register_style(
			'woocommerce-tokens-payment-gateway-toastr',
			woocommerce_tokens_payment_gateway_get_asset( 'toastr.min.css', 'vendor/css' ),
			array(),
		);


	} // end register_default_scripts;

	/**
	 * Wrapper for the register styles function.
	 *
	 * @param string $handle The script handle. Used to enqueue the script.
	 * @param string $src URL to the file.
	 * @param array $deps List of dependency scripts.
	 *
	 * @return void
	 * @since 1.0.0
	 *
	 */
	public function register_style( $handle, $src, $deps = array() ) {
		wp_register_style( $handle, $src, $deps, woocommerce_tokens_payment_gateway_get_version() );
	} // end register_default_styles;

	/**
	 * Loads the default admin styles.
	 *
	 * @return void
	 * @since 1.0.0
	 */
	public function enqueue_default_admin_styles() {
		wp_enqueue_style( 'woocommerce-tokens-payment-gateway-admin' );

	} // end enqueue_default_admin_styles;

	/**
	 * Loads the default frontend styles.
	 *
	 * @return void
	 * @since 1.0.0
	 */
	public function enqueue_default_frontend_styles() {

	}

	/**
	 * Loads the default frontend scripts.
	 *
	 * @return void
	 * @since 1.0.0
	 */
	public function enqueue_default_frontend_scripts() {
		if( ! defined('WOOCOMMERCE_TOKENS_PAYMENT_GATEWAY_PLUGIN_DIR') ){
			return;
		}

		/**
		 * WalletConnect and SaucerSwap JS
		 */
		$manifest_directory = WOOCOMMERCE_TOKENS_PAYMENT_GATEWAY_PLUGIN_DIR . '/build';
		$entry = 'src/index.tsx';
		$options = array(
			'handle' => 'woocommerce-tokens-payment-gateway-vite-build',

		);

		\Kucrut\Vite\enqueue_asset(
			$manifest_directory,
			$entry, // Add it as mentioned in the manifest file
			$options
		);

		/*
		 * Localize Script
		 */
		if (!function_exists('WC')) {
			return;
		}

		$gateway_id = 'tokens-gateway';
		$gateways = WC()->payment_gateways->get_available_payment_gateways();

		if (isset($gateways[$gateway_id])) {
			$gateway_settings = $gateways[$gateway_id]->settings;

			wp_localize_script('woocommerce-tokens-payment-gateway-vite-build', 'wctg_vars', array(
				'network' => $gateway_settings['testnet'] == 'yes' ? 'testnet' : 'mainnet',
				'wallet_connect_project_id' => $gateway_settings['wallet_connect_project_id'],
				'site_url' => get_site_url(),
				'site_name' => get_bloginfo( 'name' ),
			));
		}


	} // end enqueue_default_admin_scripts;

	/**
	 * Loads the default admin scripts.
	 *
	 * @return void
	 * @since 1.0.0
	 */
	public function enqueue_default_admin_scripts() {
		wp_enqueue_script( 'woocommerce-tokens-payment-gateway-admin' );
		wp_enqueue_script(
			'woocommerce-tokens-payment-gateway-admin-apex-charts',
			'https://cdn.jsdelivr.net/npm/apexcharts',
			array(),
			woocommerce_tokens_payment_gateway_get_version(),
			false
		);

		$this->enqueue_default_frontend_scripts();
	}

} // end class Scripts;
