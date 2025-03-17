<?php
/**
 * The main gateway class
 *
 * @see https://woocommerce.com/document/payment-gateway-api/
 * @see https://woocommerce.com/document/wc_api-the-woocommerce-api-callback/
 */

namespace WooCommerce_Tokens_Payment_Gateway\Gateway;

use Automattic\WooCommerce\Admin\Overrides\Order;
use WC_Order;
use WC_Payment_Gateway;
use WooCommerce_Tokens_Payment_Gateway\Traits\Singleton;
use WP_Error;

if ( ! class_exists( 'WC_Payment_Gateway' ) ) {
	return;
}

class Gateway extends WC_Payment_Gateway {

	use Singleton;

	/**
	 * Class Constructor
	 */
	public function __construct() {
		// Check if this payment gateway is enabled
		$this->enabled = $this->is_enabled();

		// Unique ID for the gateway
		$this->id = 'tokens-gateway';

		// Indicates if payment fields should show on checkout (for direct integration)
		$this->has_fields = true;

		// Title and description for the payment method on the admin page
		$this->method_title = 'WooCommerce Tokens Payment Gateway';
		$this->title = $this->get_option( 'title', 'Web3 Tokens Payment' );
		$this->method_description = 'Accept WooCommerce payments using HBAR or Hedera Tokens';

		// Supported features (simple payments with refunds)
		$this->supports = [
			'products',
			//'refunds', // Disabled for now
		];

		// Initialize settings fields and load settings
		$this->init_form_fields();
		$this->init_settings();

		// Register hooks
		$this->register_hooks();
	}

	/**
	 * Register all necessary WordPress hooks
	 */
	private function register_hooks() {
		// Add the gateway to WooCommerce gateways list
		add_filter( 'woocommerce_payment_gateways', [ $this, 'add_gateway_to_woocommerce_gateway_list' ], 10, 1 );

		// Save settings hook
		add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, [ $this, 'process_admin_options' ] );

		// API callback handler
		add_action( 'woocommerce_api_' . $this->id, [ $this, 'webhook' ] );

		// Payment instructions on checkout
		add_action( 'woocommerce_checkout_order_review', [ $this, 'woocommerce_payment_instructions' ] );

		// Enqueue scripts
		add_action( 'wp_enqueue_scripts', [ $this, 'payment_scripts' ] );

		// Customize 'Place Order' button HTML
		add_filter( 'woocommerce_order_button_html', [ $this, 'hedera_customize_order_button_html' ] );

		// Add custom currencies and symbols
		add_filter( 'woocommerce_currencies', [ $this, 'add_custom_currencies' ] );
		add_filter( 'woocommerce_currency_symbol', [ $this, 'add_custom_currency_symbols' ], 10, 2 );


		// Add admin scripts for dynamic settings
		add_action( 'admin_enqueue_scripts', [ $this, 'admin_scripts' ] );

		// AJAX handler for fetching tokens
		add_action( 'wp_ajax_wctg_get_supported_tokens', [ $this, 'ajax_get_supported_tokens' ] );

	}

	/**
	 * Class initializer
	 */
	public function init() {
		add_action( 'woocommerce_thankyou_tokens-gateway', [ $this, 'show_transaction_details' ], 20 );
		add_action( 'add_meta_boxes', [ $this, 'add_wctg_order_meta_box' ], 10, 2 );
	}


	/**
	 * Check if the gateway is enabled
	 *
	 * @return string
	 */
	public function is_enabled(): string {
		return $this->get_option( 'enabled', 'no' );
	}

	/**
	 * Add the gateway to WooCommerce gateways list
	 *
	 * @param array $methods
	 *
	 * @return array
	 */
	public function add_gateway_to_woocommerce_gateway_list( $methods ) {
		$methods[] = __CLASS__;

		return $methods;
	}

	/**
	 * Enqueue admin scripts for dynamic settings
	 *
	 * @param string $hook
	 */
	public function admin_scripts( $hook ) {
		// Only load on WooCommerce settings pages
		if ( 'woocommerce_page_wc-settings' !== $hook || ! isset( $_GET['section'] ) || $_GET['section'] !== $this->id ) {
			return;
		}

		wp_enqueue_script( 'woocommerce-tokens-payment-gateway-admin' );

		wp_localize_script(
			'woocommerce-tokens-payment-gateway-admin',
			'wctg_admin_params',
			[
				'ajax_url' => admin_url( 'admin-ajax.php' ),
				'nonce'    => wp_create_nonce( 'wctg_get_supported_tokens' ),
			]
		);
	}

	/**
	 * AJAX handler to fetch supported tokens based on network
	 */
	public function ajax_get_supported_tokens() {
		check_ajax_referer( 'wctg_get_supported_tokens', 'nonce' );

		$network = isset( $_POST['network'] ) && $_POST['network'] === 'testnet' ? 'testnet' : 'mainnet';
		$tokens = $this->get_supported_tokens( $network );

		wp_send_json_success( [
			'tokens' => $tokens,
		] );
	}

	/**
	 * Define settings fields
	 */
	public function init_form_fields() {
		$is_testnet = 'yes' === $this->get_option( 'testnet', 'yes' );
		$network = $is_testnet ? 'testnet' : 'mainnet';

		// Basic settings fields
		$this->form_fields = [
			'enabled' => [
				'title'   => __( 'Enable / Disable', 'woocommerce-tokens-payment-gateway' ),
				'type'    => 'checkbox',
				'label'   => __( 'Enable Tokens Payment', 'woocommerce-tokens-payment-gateway' ),
				'default' => $this->get_option( 'enabled', 'no' ),
			],
			'basic_settings' => [
				'title'       => __( 'Basic settings', 'ether-and-erc20-tokens-woocommerce-payment-gateway' ),
				'type'        => 'title',
				'description' => '',
			],
			'title' => [
				'title'       => __( 'Title', 'woocommerce-tokens-payment-gateway' ),
				'type'        => 'text',
				'description' => __( 'This controls the title which the user sees during checkout.', 'woocommerce-tokens-payment-gateway' ),
				'default'     => $this->get_option( 'title', 'Web3 Tokens Payment' ),
				'desc_tip'    => true,
			],
			'description' => [
				'title'   => __( 'Customer Message', 'woocommerce-tokens-payment-gateway' ),
				'type'    => 'textarea',
				'default' => $this->get_option( 'description', '' ),
			],
			'testnet' => [
				'title'   => __( 'Enable Testnet', 'woocommerce-tokens-payment-gateway' ),
				'type'    => 'checkbox',
				'label'   => __( 'Enable Testnet Network', 'woocommerce-tokens-payment-gateway' ),
				'default' => $this->get_option( 'testnet', 'yes' ),
			],
			'wallet_connect_project_id' => [
				'title'       => __( 'WalletConnect Project ID', 'woocommerce-tokens-payment-gateway' ),
				'type'        => 'text',
				'description' => __( 'This project ID is used to authenticate with WalletConnect.', 'woocommerce-tokens-payment-gateway' ),
				'desc_tip'    => true,
				'default'     => $this->get_option( 'wallet_connect_project_id' ),
			],
			'hedera_account_id' => [
				'title'       => __( "Store's Hedera Account ID", 'woocommerce-tokens-payment-gateway' ),
				'type'        => 'text',
				'description' => __( 'This account ID is used to receive payments.', 'woocommerce-tokens-payment-gateway' ),
				'desc_tip'    => true,
				'default'     => $this->get_option( 'hedera_account_id' ),
			],
		];

		// Add plugin compatibility settings if applicable
		$this->form_fields = array_merge( $this->form_fields, $this->get_plugin_compatibility_settings() );

		// Add token settings
		$this->form_fields = array_merge( $this->form_fields, $this->get_token_settings( $network ) );
	}

	/**
	 * Get plugin compatibility settings
	 *
	 * @return array
	 */
	private function get_plugin_compatibility_settings() {
		$settings = [];
		include_once ABSPATH . 'wp-admin/includes/plugin.php';

		if ( ! is_plugin_active( 'woocommerce-nfts/woocommerce-nfts.php' ) ) {
			return $settings;
		}

		$settings['compatibility_settings'] = [
			'title'       => __( 'Plugin Compatibility', 'woocommerce-tokens-payment-gateway' ),
			'type'        => 'title',
			'description' => '',
		];

		$settings['compatible_plugins'] = [
			'title'             => __( 'Supported Plugins', 'woocommerce-tokens-payment-gateway' ),
			'type'              => 'multiselect',
			'description'       => __( 'Which plugins should WooCommerce Tokens Payment Gateway integrate with?', 'woocommerce-tokens-payment-gateway' ),
			'desc_tip'          => true,
			'class'             => 'wc-enhanced-select',
			'css'               => 'width: 400px;',
			'default'           => '',
			'custom_attributes' => [
				'data-placeholder' => __( 'Select plugins', 'woocommerce-tokens-payment-gateway' ),
				'multiple'         => 'multiple',
			],
			'options' => [
				'woocommerce_nfts' => 'WooCommerce NFTs',
			],
		];

		$settings['woocommerce_nfts_single_transaction'] = [
			'title'   => __( 'WooCommerce NFTs Single Transaction', 'woocommerce-tokens-payment-gateway' ),
			'type'    => 'checkbox',
			'label'   => __( 'Enable receiving payment and sending NFTs in a single transaction', 'woocommerce-tokens-payment-gateway' ),
			'default' => $this->get_option( 'woocommerce_nfts_single_transaction', 'no' ),
		];

		return $settings;
	}

	/**
	 * Get token settings
	 *
	 * @param string $network
	 *
	 * @return array
	 */
	private function get_token_settings( $network ) {
		$supported_tokens = $this->get_supported_tokens( $network );

		return [
			'token_settings' => [
				'title'       => __( 'Token Settings', 'woocommerce-tokens-payment-gateway' ),
				'type'        => 'title',
				'description' => '',
			],
			'tokens' => [
				'title'             => __( 'Supported Tokens', 'woocommerce-tokens-payment-gateway' ),
				'type'              => 'multiselect',
				'description'       => __( 'From which Web3 tokens should you receive payment? Ensure that you have associated your wallet with these tokens.', 'woocommerce-tokens-payment-gateway' ),
				'desc_tip'          => true,
				'class'             => 'wc-enhanced-select',
				'css'               => 'width: 400px;',
				'default'           => '',
				'custom_attributes' => [
					'data-placeholder' => __( 'Select Supported Tokens', 'woocommerce-tokens-payment-gateway' ),
					'multiple'         => 'multiple',
				],
				'options' => $supported_tokens,
			],
			'default_token' => [
				'title'             => __( 'Default Token', 'woocommerce-tokens-payment-gateway' ),
				'type'              => 'select',
				'description'       => __( 'Select the default token supported by SaucerSwap that all Hedera tokens will be converted to.', 'woocommerce-tokens-payment-gateway' ),
				'desc_tip'          => true,
				'class'             => 'wc-enhanced-select',
				'css'               => 'width: 400px;',
				'default'           => '',
				'custom_attributes' => [
					'data-placeholder' => __( 'Select token', 'woocommerce-tokens-payment-gateway' ),
				],
				'options' => $supported_tokens,
			],
			'token_swap' => [
				'title'   => __( 'Swap Tokens', 'woocommerce-tokens-payment-gateway' ),
				'type'    => 'checkbox',
				'label'   => __( 'Convert customer payments made with any supported Hedera token into the default token during the payment process.', 'woocommerce-tokens-payment-gateway' ),
				'default' => $this->get_option( 'token_swap', 'yes' ),
			],
		];
	}

	/**
	 * Load settings fields defined in init_form_fields()
	 */
	public function init_settings() {
		parent::init_settings();
	}

	/**
	 * Render the payment fields on checkout
	 */
	public function payment_fields() {
		$description = $this->get_option( 'description', '' );
		?>
            <p><?php echo esc_attr( $description ); ?><br/>
                <div id="payment-container"></div>
                <input id="wtpg-token-status" name="wtpg_token_status" type="hidden" autocomplete="off" value="0"/>
            </p>
		<?php
	}

	/**
	 * Customize 'Place Order' button HTML
	 *
	 * @param string $button
	 *
	 * @return string
	 */
	public function hedera_customize_order_button_html( $button ) {
		if ( 'yes' !== $this->enabled ) {
			return $button;
		}

		return '<button id="renderButton" class="button">Make Payment</button>';
	}

	/**
	 * Convert cart totals to HBAR amounts
	 *
	 * @param int $cart_totals
	 *
	 * @return float
	 */
	public function convert_cart_amount_to_hbar_amount( int $cart_totals ) {
		$conversion_rate = $this->get_option( 'hedera_hbar_conversion_manual_rate', 1 );

		return $cart_totals * $conversion_rate;
	}

	/**
	 * Convert cart totals to Hedera token amounts
	 *
	 * @param int $cart_totals
	 *
	 * @return float
	 */
	public function convert_cart_amount_to_token_amount( int $cart_totals ) {
		$conversion_rate = $this->get_option( 'hedera_token_conversion_manual_rate', 1 );

		return $cart_totals * $conversion_rate;
	}

	/**
	 * Display instructions before payment gateway options
	 */
	public function woocommerce_payment_instructions() {
		// Placeholder for instructions if needed
	}

	/**
	 * Enqueue custom scripts and styles for payment processing
	 */
	public function payment_scripts() {
		if ( ! is_cart() && ! is_checkout() || 'no' === $this->enabled ) {
			return;
		}

		$is_testnet = 'yes' === $this->get_option( 'testnet', 'no' );
		$network = $is_testnet ? 'testnet' : 'mainnet';

		$options = $this->get_token_options( $network );
		$default_token = $this->get_default_token_details( $network );
        $swap_token = $this->get_option('token_swap', 'yes' );

		wp_enqueue_script( 'jquery', '', [], false, [ 'in_footer' => false ] );
		wp_enqueue_script( 'woocommerce-tokens-payment-gateway-default' );
		wp_enqueue_script( 'woocommerce-tokens-payment-gateway-price-formatter' );
		wp_localize_script(
			'woocommerce-tokens-payment-gateway-price-formatter',
			'wtpg_price_formatter_params',
			[
				'total'             => WC()->cart->total,
				'default_token'     => $default_token,
				'tokens'            => $options,
				'network'           => $network,
				'hedera_account_id' => $this->get_option( 'hedera_account_id', false ),
				'ajax_url'          => admin_url( 'admin-ajax.php' ),
                'swap_token'        => $swap_token,
			]
		);
	}

	/**
	 * Get token options for script localization
	 *
	 * @param string $network
	 *
	 * @return array
	 */
	private function get_token_options( $network ) {
		$supported_tokens = $this->get_option( 'tokens', [] );
		$options = [];

		foreach ( $supported_tokens as $supported_token ) {
			$token_details = $this->get_token_details( $supported_token, $network );
			if ( ! $token_details ) {
				continue;
			}

			$options[] = [
				'id'        => $token_details['id'],
				'name'      => $token_details['name'],
				'decimals'  => $token_details['decimals'],
				'priceUsd'  => $token_details['priceUsd'],
				'price'     => $token_details['price'],
			];
		}

		return $options;
	}

	/**
	 * Get default token details for script localization
	 *
	 * @param string $network
	 *
	 * @return array|null
	 */
	private function get_default_token_details( $network ) {
		$default_token_id = $this->get_option( 'default_token', false );
		return $default_token_id ? $this->get_token_details( $default_token_id, $network ) : null;
	}

	/**
	 * Validates the payment fields created in payment_fields()
	 *
	 * @return bool
	 */
	public function validate_fields() {
		return true;
	}

	/**
	 * Handles payment and processes the order
	 *
	 * @param int $order_id
	 *
	 * @return array|null
	 */
	public function process_payment( $order_id ) {
		global $woocommerce;
		$order = new WC_Order( $order_id );

		// Check if payment is completed
		$completed = isset( $_POST['wtpg_token_status'] ) && $_POST['wtpg_token_status'] == 3756;
		if ( ! $completed ) {
			wc_add_notice( __( 'Payment error: Could not complete payment.', 'woocommerce-tokens-payment-gateway' ), 'error' );
			return null;
		}

		// Mark order as complete and clear cart
		$order->payment_complete();
		$woocommerce->cart->empty_cart();

		return [
			'result'   => 'success',
			'redirect' => $this->get_return_url( $order ),
		];
	}

	/**
	 * Process a refund
	 *
	 * @param int    $order_id The order ID
	 * @param float  $amount   The amount to refund
	 * @param string $reason   Reason for the refund
	 *
	 * @return bool|WP_Error True if successful, otherwise a WP_Error object
	 */
	public function process_refund( $order_id, $amount = null, $reason = '' ): WP_Error|bool {
		$order = wc_get_order( $order_id );
		$order_data = $this->get_order_payment_data( $order_id );

		// Prepare refund request to NodeJS server
		$endpoint = woocommerce_tokens_payment_gateway_get_server_url() . '/refund-tokens';
		$body = wp_json_encode( [
			'token_id'                  => $order_data['payment_token_id'],
			'token_amount'              => $order_data['payment_amount'],
			'sender_account'            => woocommerce_tokens_payment_gateway_get_store_id(),
			'sender_account_private_key' => woocommerce_tokens_payment_gateway_get_store_id_private_key(),
			'memo'                      => "Refund for $order_id",
			'receiver_account'          => $order_data['payer_account_id'],
			'network'                   => $order_data['payment_network'],
		] );

		$options = [
			'body'      => $body,
			'headers'   => [
				'Content-Type'  => 'application/json',
				'Authorization' => 'Bearer ' . woocommerce_tokens_payment_gateway_get_bearer_token(),
			],
			'sslverify' => false,
			'timeout'   => 60,
		];

		$response = wp_remote_post( $endpoint, $options );
		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'refund_error', __( 'Refund failed.', 'woocommerce-tokens-payment-gateway' ) );
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( ! isset( $body['success'] ) || ! $body['success'] ) {
			return new WP_Error( 'refund_error', __( 'Refund failed.', 'woocommerce-tokens-payment-gateway' ) );
		}

		// Add refund note to order
		$order->add_order_note( sprintf(
			__( 'Refund of %s processed. Reason: %s', 'woocommerce-tokens-payment-gateway' ),
			wc_price( $amount ),
			$reason
		) );

		return true;
	}

	/**
	 * Get payment-related order data
	 *
	 * @param int $order_id
	 *
	 * @return array
	 */
	private function get_order_payment_data( $order_id ) {
		return [
			'payer_account_id'   => get_post_meta( $order_id, 'wctg_payer_account_id', true ),
			'payment_amount'     => get_post_meta( $order_id, 'wctg_payment_amount', true ),
			'payment_hash'       => get_post_meta( $order_id, 'wctg_payment_hash', true ),
			'payment_token_name' => get_post_meta( $order_id, 'wctg_payment_token_name', true ),
			'payment_token_id'   => get_post_meta( $order_id, 'wctg_payment_token_id', true ),
			'payment_network'    => get_post_meta( $order_id, 'wctg_payment_network', true ),
		];
	}

	/**
	 * Save settings
	 *
	 * @return bool|void
	 */
	public function process_admin_options() {
		parent::process_admin_options();
	}

	/**
	 * Output the admin options table
	 */
	public function admin_options() {
		?>
        <table class="form-table">
			<?php echo $this->generate_settings_html( $this->get_form_fields(), false ); ?>
        </table>
		<?php
	}

	/**
	 * API callback handler
	 *
	 * @see https://github.com/hashgraph/hedera-sdk-js/blob/develop/examples/transfer-tokens.js
	 * @see https://github.com/hashgraph/hedera-sdk-js/blob/develop/examples/get-exchangerates.js
	 */
	public function webhook() {
		$order_id = $_GET['order_id'] ?? null;
		if ( ! $order_id ) {
			return;
		}

		$order = wc_get_order( $order_id );
		$order->payment_complete();
	}

	/**
	 * Add custom currencies
	 *
	 * @param array $currencies
	 *
	 * @return array
	 */
	public function add_custom_currencies( $currencies ) {
		if ( 'yes' !== $this->enabled ) {
			return $currencies;
		}

		$currencies['hbar'] = __( 'HBAR', 'woocommerce' );

		$hedera_token = $this->get_hedera_token_data();
		if ( $hedera_token['is_added'] ) {
			$currencies['hedera_token'] = $hedera_token['name'];
		}

		return $currencies;
	}

	/**
	 * Add custom currency symbols
	 *
	 * @param string $currency_symbol
	 * @param string $currency
	 *
	 * @return string
	 */
	public function add_custom_currency_symbols( $currency_symbol, $currency ) {
		if ( 'yes' !== $this->enabled ) {
			return $currency_symbol;
		}

		switch ( $currency ) {
			case 'hbar':
				return 'ℏ';
			case 'hedera_token':
				$hedera_token = $this->get_hedera_token_data();
				return $hedera_token['is_added'] ? $hedera_token['symbol'] : $currency_symbol;
		}

		return $currency_symbol;
	}

	/**
	 * Get Hedera token data for currencies
	 *
	 * @return array
	 */
	private function get_hedera_token_data() {
		return [
			'name'      => $this->get_option( 'hedera_token_name', '' ),
			'id'        => $this->get_option( 'hedera_token_id', '' ),
			'symbol'    => $this->get_option( 'hedera_token_symbol', '' ),
			'is_added'  => 'yes' === $this->get_option( 'hedera_token_added_to_currencies', 'no' ) &&
			               ! empty( $this->get_option( 'hedera_token_name', '' ) ) &&
			               ! empty( $this->get_option( 'hedera_token_id', '' ) ) &&
			               ! empty( $this->get_option( 'hedera_token_symbol', '' ) ),
		];
	}

	/**
	 * Show custom details on thank you page
	 *
	 * @param int $order_id
	 */
	public function show_transaction_details( $order_id ) {
		$order = wc_get_order( $order_id );
		$this->update_order_meta( $order );

		$order_data = $this->get_order_payment_data( $order_id );
		$network = $order_data['payment_network'];
		?>
        <h3>Hedera Transaction Details</h3>
        <table class="shop_table shop_table_responsive additional_info">
            <tbody>
            <tr>
                <td><strong>Payer Account</strong></td>
                <td><?php echo esc_html( $order_data['payer_account_id'] ); ?></td>
            </tr>
            <tr>
                <td><strong>Payment Amount</strong></td>
                <td><?php echo esc_html( $order_data['payment_amount'] . ' ' . $order_data['payment_token_name'] ); ?></td>
            </tr>
            <tr>
                <td><strong>Hedera Network</strong></td>
                <td><?php echo esc_html( ucfirst( $network ) ); ?></td>
            </tr>
            <tr>
                <td><strong>Payment Token</strong></td>
                <td><?php echo strtolower( $order_data['payment_token_name'] ) === 'hbar' ? esc_html( $order_data['payment_token_name'] ) : esc_html( $order_data['payment_token_name'] . ' (' . $order_data['payment_token_id'] . ')' ); ?></td>
            </tr>
            <tr>
                <td><strong>Transaction Hash</strong></td>
                <td><a href="https://hashscan.io/<?php echo esc_attr( $network ); ?>/transaction/<?php echo esc_attr( $order_data['payment_hash'] ); ?>" target="_blank"><?php echo esc_html( $order_data['payment_hash'] ); ?></a></td>
            </tr>
            </tbody>
        </table>
		<?php
	}

	/**
	 * Update order meta with transaction details
	 *
	 * @param WC_Order $order
	 */
	private function update_order_meta( $order ) {
		if ( ! $order ) {
			return;
		}

		$meta_data = [
			'wctg_payer_account_id'   => $_COOKIE['payer_account_id'] ?? '',
			'wctg_payment_amount'     => $_COOKIE['payment_amount'] ?? '',
			'wctg_payment_token_name' => $_COOKIE['payment_token_name'] ?? '',
			'wctg_payment_token_id'   => $_COOKIE['payment_token_id'] ?? '',
			'wctg_payment_hash'       => $_COOKIE['payment_hash'] ?? '',
			'wctg_payment_network'    => $_COOKIE['payment_network'] ?? '',
		];

		foreach ( $meta_data as $key => $value ) {
			$order->add_meta_data( $key, $value );
		}

		$order->save();
	}

	/**
	 * Add payment details metabox
	 *
	 * @param string $post_type
	 * @param mixed  $post
	 */
	public function add_wctg_order_meta_box( $post_type, $post ) {
		if ( ! $post instanceof Order || 'tokens-gateway' !== $post->get_payment_method() ) {
			return;
		}

		add_meta_box(
			'wctg_order_meta_box',
			'Payment Details',
			[ $this, 'display_wctg_order_meta_box' ],
			'woocommerce_page_wc-orders',
			'advanced',
			'default'
		);
	}

	/**
	 * Display payment details metabox
	 *
	 * @param Order $post
	 */
	public function display_wctg_order_meta_box( $post ) {
		$order_data = $this->get_order_payment_data( $post->get_id() );
		$payment_hash_link = sprintf(
			'<a href="https://hashscan.io/%s/transaction/%s" target="_blank">%s</a>',
			esc_attr( $order_data['payment_network'] ),
			esc_attr( $order_data['payment_hash'] ),
			esc_html( $order_data['payment_hash'] )
		);

		?>
        <div class="wctg_order_meta_box">
            <table style="width:100%; text-align:left;">
                <tr><th>Title</th><th>Value</th></tr>
                <tr><td>Payer Account ID</td><td><?php echo esc_html( $order_data['payer_account_id'] ); ?></td></tr>
                <tr><td>Payment Amount</td><td><?php echo esc_html( $order_data['payment_amount'] ); ?></td></tr>
                <tr><td>Payment Network</td><td><?php echo esc_html( ucfirst( $order_data['payment_network'] ) ); ?></td></tr>
                <tr><td>Payment Hash</td><td><?php echo $payment_hash_link; ?></td></tr>
                <tr><td>Payment Token</td><td><?php echo esc_html( $order_data['payment_token_name'] . ' (' . $order_data['payment_token_id'] . ')' ); ?></td></tr>
            </table>
            <br><br>
            <div id="swap-container"></div>
            <!--<button id="wctg-swap-token-btn" class="button button-primary">Swap Token</button>-->
        </div>
		<?php
	}

	/**
	 * Get supported tokens from SaucerSwap API
	 *
	 * @param string $network
	 * @param bool   $formatted
	 *
	 * @return array
	 */
	public function get_supported_tokens( $network = 'mainnet', $formatted = true ) {
		$transient_key = 'wctg_supported_tokens_' . $network;
		$cached_tokens = get_transient( $transient_key );
		if ( $cached_tokens ) {
			//return $cached_tokens;
		}

		// Fetch tokens from SaucerSwap API
		$endpoint = $network === 'testnet' ? 'https://test-api.saucerswap.finance/tokens' : 'https://api.saucerswap.finance/tokens';
		$response = wp_remote_get( $endpoint );
		if ( is_wp_error( $response ) || ! wp_remote_retrieve_body( $response ) ) {
			return [];
		}

		$tokens = json_decode( wp_remote_retrieve_body( $response ), true );
		$tokens = array_merge( [ 'hbar' => 'HBAR' ], $tokens );
		set_transient( $transient_key, $tokens, 86400 );

		if ( ! $formatted ) {
			return $tokens;
		}

		$supported_tokens = [];
		foreach ( $tokens as $token ) {
			if ( ! is_array( $token ) && strtolower( $token ) === 'hbar' ) {
				$supported_tokens['hbar'] = 'HBAR (' . ucfirst( $network ) . ')';
				continue;
			}

			$supported_tokens[ $token['id'] ] = $token['name'] . ' (' . $token['id'] . ' - ' . ucfirst( $network ) . ')';
		}

		return $supported_tokens;
	}

	/**
	 * Get token details by ID
	 *
	 * @param string $token_id
	 * @param string $network
	 *
	 * @return array|null
	 */
	public function get_token_details( $token_id, $network = 'mainnet' ) {
		$supported_tokens = $this->get_supported_tokens( $network, false );
		if ( empty( $supported_tokens ) ) {
			return null;
		}

		foreach ( $supported_tokens as $token ) {
			if ( ! is_array( $token ) && strtolower( $token_id ) === 'hbar' && strtolower( $token ) === 'hbar' ) {
				return [
					'id'       => 'hbar',
					'name'     => 'HBAR',
					'decimals' => 8,
					'priceUsd' => 0,
					'price'    => 1,
				];
			}

			if ( ! is_array( $token ) || $token_id !== $token['id'] ) {
				continue;
			}

			return $token;
		}

		return null;
	}
}