<?php
/**
 * Helper functions
 */


use WooCommerce_Tokens_Payment_Gateway\Helper;

$helper = Helper::get_instance();

/*
 * AJAX functions
 */
require_once $helper->path( 'includes/functions/ajax.php' );

/**
 * Alias function to be used on the templates
 *
 * @param string $view Template to be got.
 * @param array $args Arguments to be parsed and made available inside the template file.
 * @param string|false $default_view View to be used if the view passed is not found. Used as fallback.
 *
 * @return void
 */
function woocommerce_tokens_payment_gateway_get_template( $view, $args = array(), $path = 'views', $default_view = false ) {
	woocommerce_tokens_payment_gateway()->helper->render( $view, $args, $path, $default_view );
} // end woocommerce_tokens_payment_gateway_get_template;

/**
 * Get license key
 *
 * @return mixed|null
 */
function woocommerce_tokens_payment_gateway_get_license_key() {
	$license_details = get_network_option( get_current_network_id(), 'woocommerce_tokens_payment_gateway_license' );
	if ( false != $license_details ) {
		return $license_details['key'];
	}

	return null;
}


/**
 * Returns the URL for assets inside the assets' folder.
 *
 * @param string $asset Asset file name with the extension.
 * @param string $assets_dir Assets sub-directory. Defaults to 'img'.
 * @param string $base_dir Base dir. Defaults to 'assets'.
 *
 * @return string
 * @since 1.0.0
 *
 */
function woocommerce_tokens_payment_gateway_get_asset( $asset, $assets_dir = 'img', $base_dir = 'assets' ) {
	return woocommerce_tokens_payment_gateway()->helper->get_asset( $asset, $assets_dir, $base_dir );
} // end woocommerce_tokens_payment_gateway_get_asset;

/**
 * Returns the WooCommerce Tokens Payment Gateway version.
 *
 * @return string
 * @since 1.0.0
 */
function woocommerce_tokens_payment_gateway_get_version() {
	return woocommerce_tokens_payment_gateway()->get_version();
} // end woocommerce_tokens_payment_gateway_get_version;

/**
 * Check if plugin license is active
 * @return bool
 */
function woocommerce_tokens_payment_gateway_is_license_active() {

	$license_details = get_network_option( get_current_network_id(), 'woocommerce_tokens_payment_gateway_license' );

	if ( false != $license_details ) {
		if ( 'Active' == $license_details['status'] ) {
			return true;
		}
	}

	return false;
}

/**
 * Gets the status of a license key
 *
 * @return false|string
 */
function woocommerce_tokens_payment_gateway_get_license_status() {
	$license_details = get_network_option( get_current_network_id(), 'woocommerce_tokens_payment_gateway_license' );

	if ( false != $license_details ) {
		return ucfirst( $license_details['status'] );
	}

	return false;
}

/**
 * Get NodeJS Bearer Token
 *
 * @return false|mixed
 */
function woocommerce_tokens_payment_gateway_get_bearer_token(){
	// Gateway settings
	$gateway_settings = get_option( 'woocommerce_tokens-gateway_settings', false );
	if( ! $gateway_settings || '' == $gateway_settings || ( is_array( $gateway_settings ) && ! array_key_exists( 'nodejs_server_bearer_token', $gateway_settings ) ) ){
		return  false;
	}

	// Get encypted bearer token
	return $gateway_settings['nodejs_server_bearer_token'];
}

/**
 * Get the store id
 *
 * @return false|mixed
 */
function woocommerce_tokens_payment_gateway_get_store_id(){
	// Gateway settings
	$gateway_settings = get_option( 'woocommerce_tokens-gateway_settings', false );
	if( ! $gateway_settings || '' == $gateway_settings || ( is_array( $gateway_settings ) && ! array_key_exists( 'hedera_account_id', $gateway_settings ) ) ){
		return  false;
	}

	return $gateway_settings['hedera_account_id'];
}

/**
 * Get the store's ID private key
 *
 * @return false|mixed
 */
function woocommerce_tokens_payment_gateway_get_store_id_private_key(){
	// Gateway settings
	$gateway_settings = get_option( 'woocommerce_tokens-gateway_settings', false );
	if( ! $gateway_settings || '' == $gateway_settings || ( is_array( $gateway_settings ) && ! array_key_exists( 'hedera_account_private_key', $gateway_settings ) ) ){
		return false;
	}

	return $gateway_settings['hedera_account_private_key'];
}

/**
 * Get NodeJS Server URL
 *
 * @return false|mixed
 */
function woocommerce_tokens_payment_gateway_get_server_url() {
	// Gateway settings
	$gateway_settings = get_option( 'woocommerce_tokens-gateway_settings', false );
	if ( ! $gateway_settings || '' == $gateway_settings || ( is_array( $gateway_settings ) && ! array_key_exists( 'nodejs_server_url', $gateway_settings ) ) ) {
		return false;
	}

	return $gateway_settings['nodejs_server_url'];
}


/**
 * Get the encryption iv from the database. If it does not exist, to generate a random one, save it to db and return it
 */
function woocommerce_tokens_payment_gateway_get_encryption_iv(){
	$encryption_iv = get_option( 'woocommerce_tokens_payment_gateway_get_encryption_iv', false );
	if( ! $encryption_iv || '' == $encryption_iv ){
		$encryption_iv = substr( sha1( time() ), 0, 16 );

		update_option( 'woocommerce_tokens_payment_gateway_get_encryption_iv', $encryption_iv );
	}

	return $encryption_iv;

}

/**
 * Get the encryption key from the database. If it does not exist, to generate a random one, save it to db and return it
 */
function woocommerce_tokens_payment_gateway_get_encryption_key(){
	$encryption_key = get_option( 'woocommerce_tokens_payment_gateway_get_encryption_key', false );
	if( ! $encryption_key || '' == $encryption_key ){
		$encryption_key = substr( sha1( time() ), 0, 16 );

		update_option( 'woocommerce_tokens_payment_gateway_get_encryption_key', $encryption_key );
	}

	return $encryption_key;
}

/**
 * Encrypt a string
 *
 * @param string $string
 * @param string $encryption_iv
 * @param string $encryption_key
 *
 * @return false|string
 */
function woocommerce_tokens_payment_gateway_encrypt_string( string $string, string $encryption_iv = '', string $encryption_key = '' ) {
	// Store the cipher method
	$ciphering_algo = "AES-128-CTR";

	// Non-NULL Initialization Vector for encryption
	if( '' == $encryption_iv ){
		$encryption_iv =  woocommerce_tokens_payment_gateway_get_encryption_iv();
	}

	// Encryption Key
	if( '' == $encryption_key ){
		$encryption_key =  woocommerce_tokens_payment_gateway_get_encryption_key();
	}

	// Use openssl_encrypt() function to encrypt the data
	$options = 0;
	return openssl_encrypt( $string, $ciphering_algo, $encryption_key, $options, $encryption_iv );
}

/**
 * Decrypt a string
 *
 * @param string $encrypted_string
 * @param string $decryption_iv
 * @param string $decryption_key
 *
 * @return false|string
 */
function woocommerce_tokens_payment_gateway_decrypt_string( string $encrypted_string, string $decryption_iv = '', string $decryption_key = '' ) {
	// Store the cipher method
	$ciphering_algo = "AES-128-CTR";

	// Non-NULL Initialization Vector for encryption
	if( '' == $decryption_iv ){
		$decryption_iv =  woocommerce_tokens_payment_gateway_get_encryption_iv();
	}

	// Encryption Key
	if( '' == $decryption_key ){
		$decryption_key =  woocommerce_tokens_payment_gateway_get_encryption_key();
	}

	// Use openssl_decrypt() function to decrypt the data
	$options = 0;
	return openssl_decrypt ($encrypted_string, $ciphering_algo, $decryption_key, $options, $decryption_iv );

}

