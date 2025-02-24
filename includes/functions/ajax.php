<?php
/**
 * AJAX Functions
 */

/**
 * Transfer Token
 */
add_action( 'wp_ajax_wctg_transfer_token', 'wp_ajax_wctg_transfer_token_callback' );
add_action( 'wp_ajax_nopriv_wctg_transfer_token', 'wp_ajax_wctg_transfer_token_callback' );
function wp_ajax_wctg_transfer_token_callback() {
	if ( ! wp_verify_nonce( $_REQUEST['nonce'], "transfer-tokens" ) ) {
		// exit( "You are not authorized to do that." );
	}

	/*
	 * Request Parameters
	 */
	$nodejs_server_url          = woocommerce_tokens_payment_gateway_get_server_url();
	$endpoint                   = $nodejs_server_url . '/transfer-tokens';
	$nodejs_server_bearer_token = woocommerce_tokens_payment_gateway_get_bearer_token();
	$token_receiver_account = woocommerce_tokens_payment_gateway_get_store_id();

	$body = array(
		'token_id'       => $_POST['token_id'],
		'token_amount'   => $_POST['token_amount'],
		'sender_account' => $_POST['sender_account'],
		'decimals'       => $_POST['decimals'],
		'memo'           => $_POST['memo'],
		'receiver_account' => $token_receiver_account,
	);

	$body = wp_json_encode( $body );

	$options = [
		'body'      => $body,
		'headers'   => [
			'Content-Type'  => 'application/json',
			'Authorization' => 'Bearer ' . $nodejs_server_bearer_token
		],
		'sslverify' => false,
		'timeout' => 60
	];

	$response = wp_remote_post( $endpoint, $options );
	if ( ! is_wp_error( $response ) ) {
		$body = wp_remote_retrieve_body( $response );

		wp_send_json_success( $body );
	}

	wp_send_json_error( 'An error occurred.' );

	wp_die(); //Required to end ajax request
}



/**
 * Transfer Token and NFTs
 */
add_action( 'wp_ajax_wctg_transfer_token_and_nfts', 'wp_ajax_wctg_transfer_token_and_nfts_callback' );
add_action( 'wp_ajax_nopriv_wctg_transfer_token_and_nfts', 'wp_ajax_wctg_transfer_token_and_nfts_callback' );
function wp_ajax_wctg_transfer_token_and_nfts_callback() {
	if ( ! wp_verify_nonce( $_REQUEST['nonce'], "transfer-tokens-and-nfts" ) ) {
		// exit( "You are not authorized to do that." );
	}

	/*
	 * Request Parameters
	 */
	$nodejs_server_url          = woocommerce_tokens_payment_gateway_get_server_url();
	$endpoint                   = $nodejs_server_url . '/transfer-token-and-nfts';
	$nodejs_server_bearer_token = woocommerce_tokens_payment_gateway_get_bearer_token();
	$token_receiver_account = woocommerce_tokens_payment_gateway_get_store_id();

	/*
	 * Submit NFTs as array of objects
	 */
	$nfts = array();
	foreach ( $_POST['nfts'] as $nft ){
		$nfts[] = json_decode( html_entity_decode( stripslashes ( $nft ) ) );
	}

	$body = array(
		'token_id'       => $_POST['token_id'],
		'token_amount'   => $_POST['token_amount'],
		'sender_account' => $_POST['sender_account'],
		'decimals'       => $_POST['decimals'],
		'memo'           => $_POST['memo'],
		'nfts'           => $nfts,
		'receiver_account' => $token_receiver_account,
	);

	$body = wp_json_encode( $body );

	$options = [
		'body'      => $body,
		'headers'   => [
			'Content-Type'  => 'application/json',
			'Authorization' => 'Bearer ' . $nodejs_server_bearer_token
		],
		'sslverify' => false,
		'timeout' => 60
	];

	$response = wp_remote_post( $endpoint, $options );
	if ( ! is_wp_error( $response ) ) {
		$body = wp_remote_retrieve_body( $response );

		wp_send_json_success( $body );
	}

	wp_send_json_error( 'An error occurred.' );

	wp_die(); //Required to end ajax request
}

/**
 * Transfer HBAR
 */
add_action( 'wp_ajax_wctg_transfer_hbar', 'wp_ajax_wctg_transfer_hbar_callback' );
add_action( 'wp_ajax_nopriv_wctg_transfer_hbar', 'wp_ajax_wctg_transfer_hbar_callback' );
function wp_ajax_wctg_transfer_hbar_callback() {

	/*
	 * Request Parameters
	 */
	$nodejs_server_url          = woocommerce_tokens_payment_gateway_get_server_url();
	$endpoint                   = $nodejs_server_url . '/transfer-hbar';
	$nodejs_server_bearer_token = woocommerce_tokens_payment_gateway_get_bearer_token();
	$token_receiver_account = woocommerce_tokens_payment_gateway_get_store_id();

	$body = array(
		'hbar_amount'    => $_POST['hbar_amount'],
		'sender_account' => $_POST['sender_account'],
		'memo'           => $_POST['memo'],
		'receiver_account' => $token_receiver_account,
	);

	$body = wp_json_encode( $body );

	$options = [
		'body'      => $body,
		'headers'   => [
			'Content-Type'  => 'application/json',
			'Authorization' => 'Bearer ' . $nodejs_server_bearer_token
		],
		'sslverify' => false,
		'timeout' => 60
	];

	$response = wp_remote_post( $endpoint, $options );
	if ( ! is_wp_error( $response ) ) {
		$body = wp_remote_retrieve_body( $response );

		wp_send_json_success( $body );
	}

	wp_send_json_error( 'An error occurred.' );

	wp_die(); //Required to end ajax request
}

/**
 * Transfer HBAR and NFTs
 */
add_action( 'wp_ajax_wctg_transfer_hbar_and_nfts', 'wp_ajax_wctg_transfer_hbar_and_nfts_callback' );
add_action( 'wp_ajax_nopriv_wctg_transfer_hbar_and_nfts', 'wp_ajax_wctg_transfer_hbar_and_nfts_callback' );
function wp_ajax_wctg_transfer_hbar_and_nfts_callback() {

	/*
	 * Request Parameters
	 */
	$nodejs_server_url          = woocommerce_tokens_payment_gateway_get_server_url();
	$endpoint                   = $nodejs_server_url . '/transfer-hbar-and-nfts';
	$nodejs_server_bearer_token = woocommerce_tokens_payment_gateway_get_bearer_token();
	$token_receiver_account = woocommerce_tokens_payment_gateway_get_store_id();

	/*
	 * Submit NFTs as array of objects
	 */
	$nfts = array();
	foreach ( $_POST['nfts'] as $nft ){
		$nfts[] = json_decode( html_entity_decode( stripslashes ( $nft ) ) );
	}

	$body = array(
		'hbar_amount'    => $_POST['hbar_amount'],
		'sender_account' => $_POST['sender_account'],
		'memo'           => $_POST['memo'],
		'nfts'           => $nfts,
		'receiver_account' => $token_receiver_account,
	);

	$body = wp_json_encode( $body );

	$options = [
		'body'      => $body,
		'headers'   => [
			'Content-Type'  => 'application/json',
			'Authorization' => 'Bearer ' . $nodejs_server_bearer_token
		],
		'sslverify' => false,
		'timeout' => 60
	];

	$response = wp_remote_post( $endpoint, $options );
	if ( ! is_wp_error( $response ) ) {
		$body = wp_remote_retrieve_body( $response );

		wp_send_json_success( $body );
	}

	wp_send_json_error( 'An error occurred.' );

	wp_die(); //Required to end ajax request
}

/**
 * Get HBAR balance
 */
add_action( 'wp_ajax_wctg_get_hbar_balance', 'wp_ajax_wctg_get_hbar_balance_callback' );
add_action( 'wp_ajax_nopriv_wctg_get_hbar_balance', 'wp_ajax_wctg_get_hbar_balance_callback' );
function wp_ajax_wctg_get_hbar_balance_callback() {

	/*
	 * Request Parameters
	 */
	$nodejs_server_url          = woocommerce_tokens_payment_gateway_get_server_url();
	$endpoint                   = $nodejs_server_url . '/hbar-balance';
	$nodejs_server_bearer_token = woocommerce_tokens_payment_gateway_get_bearer_token();


	$body = array(
		'account_id' => $_POST['account_id']
	);

	$body = wp_json_encode( $body );

	$options = [
		'body'      => $body,
		'headers'   => [
			'Content-Type'  => 'application/json',
			'Authorization' => 'Bearer ' . $nodejs_server_bearer_token
		],
		'sslverify' => false,
		'timeout' => 60
	];

	$response = wp_remote_post( $endpoint, $options );
	if ( ! is_wp_error( $response ) ) {
		$body = wp_remote_retrieve_body( $response );

		wp_send_json_success( $body );

		wp_die(); //Required to end ajax request
	}

	if( is_wp_error( $response ) ){
		wp_send_json_error( $response->get_error_messages() );

		wp_die(); //Required to end ajax request
	}

	wp_send_json_error( 'An error occurred.' );

	wp_die(); //Required to end ajax request
}

/**
 * Get Account Info
 */
add_action( 'wp_ajax_wctg_get_account_info', 'wp_ajax_wctg_get_account_info_callback' );
add_action( 'wp_ajax_nopriv_wctg_get_account_info', 'wp_ajax_wctg_get_account_info_callback' );
function wp_ajax_wctg_get_account_info_callback() {

	/*
	 * Request Parameters
	 */
	$nodejs_server_url          = woocommerce_tokens_payment_gateway_get_server_url();
	$endpoint                   = $nodejs_server_url . '/hbar-balance';
	$nodejs_server_bearer_token = woocommerce_tokens_payment_gateway_get_bearer_token();


	$body = array(
		'account_id' => $_POST['account_id']
	);

	$body = wp_json_encode( $body );

	$options = [
		'body'      => $body,
		'headers'   => [
			'Content-Type'  => 'application/json',
			'Authorization' => 'Bearer ' . $nodejs_server_bearer_token
		],
		'sslverify' => false,
		'timeout' => 60
	];

	$response = wp_remote_post( $endpoint, $options );
	if ( ! is_wp_error( $response ) ) {
		$body = wp_remote_retrieve_body( $response );

		wp_send_json_success( $body );

		wp_die(); //Required to end ajax request
	}

	wp_send_json_error( 'An error occurred.' );

	wp_die(); //Required to end ajax request
}

/**
 * Swap Tokens For HBAR
 */
add_action( 'wp_ajax_wctg_swap_tokens_for_hbar', 'wp_ajax_wctg_swap_tokens_for_hbar_callback' );
add_action( 'wp_ajax_nopriv_wctg_swap_tokens_for_hbar', 'wp_ajax_wctg_swap_tokens_for_hbar_callback' );
function wp_ajax_wctg_swap_tokens_for_hbar_callback() {

	/*
	 * Request Parameters
	 */
	$nodejs_server_url          = woocommerce_tokens_payment_gateway_get_server_url();
	$endpoint                   = $nodejs_server_url . '/swap-tokens-for-hbar';
	$nodejs_server_bearer_token = woocommerce_tokens_payment_gateway_get_bearer_token();


	$body = array(
		'account_id' => woocommerce_tokens_payment_gateway_get_store_id(),
		'input_token_amount' => $_POST['input_token_amount'],
		'input_token_id' => $_POST['input_token_id'],
		'input_token_decimals' => $_POST['input_token_decimals']
	);

	$body = wp_json_encode( $body );

	$options = [
		'body'      => $body,
		'headers'   => [
			'Content-Type'  => 'application/json',
			'Authorization' => 'Bearer ' . $nodejs_server_bearer_token
		],
		'sslverify' => false,
		'timeout' => 60
	];

	$response = wp_remote_post( $endpoint, $options );
	if ( ! is_wp_error( $response ) ) {
		$body = wp_remote_retrieve_body( $response );

		wp_send_json_success( $body );

		wp_die(); //Required to end ajax request
	}

	wp_send_json_error( 'An error occurred.' );

	wp_die(); //Required to end ajax request
}
