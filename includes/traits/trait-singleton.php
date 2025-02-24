<?php
/**
 * Singleton Trait
 *
 * @package WooCommerce_Tokens_Payment_Gateway
 * @subpackage Singleton
 * @since 0.0.1
 */

namespace WooCommerce_Tokens_Payment_Gateway\Traits;

trait Singleton {

	/**
	 * Makes sure we are only using one instance of the class
	 *
	 * @var object
	 */
	public static $instance;

	/**
	 * Returns the instance of WooCommerce_Tokens_Payment_Gateway
	 *
	 * @return object
	 */
	public static function get_instance() {

		if ( ! static::$instance instanceof static ) {
			static::$instance = new static();

			static::$instance->init();
		} // end if;

		return static::$instance;
	} // end get_instance;

	/**
	 * Runs only once, at the first instantiation of the Singleton.
	 *
	 * @return void
	 * @since 0.0.1
	 */
	public function init() {
	} // end init;
} // end trait Singleton;
