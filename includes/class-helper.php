<?php
/**
 * WooCommerce Tokens Payment Gateway helper methods for including and rendering files, assets, etc
 *
 * @package WOOCOMMERCE_TOKENS_PAYMENT_GATEWAY
 * @subpackage Helper
 * @since 0.0.1
 */

namespace WooCommerce_Tokens_Payment_Gateway;

// Exit if accessed directly
use WooCommerce_Tokens_Payment_Gateway\Traits\Singleton;

defined( 'ABSPATH' ) || exit;

/**
 * WooCommerce Tokens Payment Gateway helper methods for including and rendering files, assets, etc
 *
 * @since 0.0.1
 */
class Helper {
	/**
	 * List of view types that are subject to view overriding
	 *
	 * @since 2.0.0
	 * @var array
	 */
	protected $replaceable_views = array(
		'forms',
	);

	use Singleton;


	/**
	 * Adds hooks to be added at the original instantiation.
	 *
	 * @since 0.0.1
	 */
	public function init() {
	} // end init;

	/**
	 * Returns the full path to the plugin folder
	 *
	 * @param string $dir Path relative to the plugin root you want to access.
	 *
	 * @return string
	 * @since 0.0.1
	 */
	public function path( $dir ) {

		return WOOCOMMERCE_TOKENS_PAYMENT_GATEWAY_PLUGIN_DIR . $dir;
	} // end path;

	/**
	 * Returns the URL to the plugin folder.
	 *
	 * @param string $dir Path relative to the plugin root you want to access.
	 *
	 * @return string
	 * @since 0.0.1
	 */
	public function url( $dir ) {

		return apply_filters( 'woocommerce_tokens_payment_gateway_user_accounts_url', WOOCOMMERCE_TOKENS_PAYMENT_GATEWAY_PLUGIN_URL . $dir );
	} // end url;

	/**
	 * Shorthand for url('assets/img'). Returns the URL for assets inside the assets folder.
	 *
	 * @param string $asset Asset file name with the extention.
	 * @param string $assets_dir Assets sub-directory. Defaults to 'img'.
	 * @param string $base_dir Base dir. Defaults to 'assets'.
	 *
	 * @return string
	 * @since 0.0.1
	 */
	public function get_asset( $asset, $assets_dir = 'img', $base_dir = 'assets' ) {
		return $this->url( "$base_dir/$assets_dir/$asset" );
	} // end get_asset;


	/**
	 * Get the value of a slugfied network option
	 *
	 * @param string $option_name Option name.
	 * @param mixed $default The default value.
	 *
	 * @return mixed
	 * @since 0.0.1
	 */
	public function get_option( $option_name = 'settings', $default = array() ) {

		$option_value = get_network_option( null, $this->slugfy( $option_name ), $default );

		return apply_filters( 'woocommerce_tokens_payment_gateway_get_option', $option_value, $option_name, $default );
	} // end get_option;

	/**
	 * Save slugfied network option
	 *
	 * @param string $option_name The option name to save.
	 * @param mixed $value The new value of the option.
	 *
	 * @return boolean
	 * @since 0.0.1
	 */
	public function save_option( $value, $option_name = 'settings' ) {

		return update_network_option( null, $this->slugfy( $option_name ), $value );
	} // end save_option;

	/**
	 * Delete slugfied network option
	 *
	 * @param string $option_name The option name to delete.
	 *
	 * @return boolean
	 * @since 0.0.1
	 */
	public function delete_option( $option_name ) {

		return delete_network_option( null, $this->slugfy( $option_name ) );
	} // end delete_option;

	/**
	 * This function return 'slugfied' options terms to be used as options ids.
	 *
	 * @param string $term Returns a string based on the term and this plugin slug.
	 *
	 * @return string
	 * @since 0.0.1
	 */
	public function slugfy( $term ) {

		return "wp-email-manager_$term";
	} // end slugfy;

	/**
	 * Renders a view file from the view folder.
	 *
	 * @param string $view View file to render. Do not include the .php extension.
	 * @param boolean $vars Key => Value pairs to be made available as local variables inside the view scope.
	 * @param string $path Path of view file
	 * @param string|false $default_view View to be used if the view passed is not found. Used as fallback.
	 *
	 * @return void
	 * @since 0.0.1
	 */
	public function render( $view, $vars = false, $path = 'views', $default_view = false ) {
		/**
		 * Allow plugin developers to add extra variable to the render context globally.
		 *
		 * @param array $vars Array containing variables passed by the render call.
		 * @param string $view Name of the view to be rendered.
		 * @param string $default_view Name of the fallback_view
		 *
		 * @return array
		 * @since 0.0.1
		 */
		$vars = apply_filters( 'woocommerce_tokens_payment_gateway_render_vars', $vars, $view, $default_view );


		$template = $this->path( "$path/$view.php" );

		// Make passed variables available
		if ( is_array( $vars ) ) {
			extract( $vars ); // phpcs:ignore
		} // end if;

		/**
		 * Allows developers to add additional folders to the replaceable list.
		 *
		 * Be careful, as allowing additional folders might cause
		 * out-of-date copies to be loaded instead of the WP Ultimo versions.
		 *
		 * @param array $replaceable_views List of allowed folders.
		 *
		 * @return array
		 * @since 0.0.1
		 */
		$replaceable_views = apply_filters( 'woocommerce_tokens_payment_gateway_view_override_replaceable_views', $this->replaceable_views );

		/*
		 * Only allow templating for emails and signup for now
		 */
		if ( preg_match( '/(' . implode( '|', $replaceable_views ) . ')\w+/', $view ) ) {
			$template = apply_filters( 'woocommerce_tokens_payment_gateway_view_override', $template, $view, $default_view );
		} // end if;

		if ( ! file_exists( $template ) && $default_view ) {
			$template = $this->path( "views/$default_view.php" );
		} // end if;

		// Load our view
		include $template;
	} // end render;

} // end class Helper;
