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

if ( class_exists( 'WC_Payment_Gateway' ) ) {
	class Gateway extends WC_Payment_Gateway {

		use Singleton;

		/**
		 * Class Constructor
		 */
		public function __construct() {

			/*
			 * Check if this payment gateway is enabled
			 */
			$this->enabled = $this->is_enabled();

			/*
			 * Unique ID for your gateway
			 */
			$this->id = "tokens-gateway";

			/*
			 * Can be set to true if you want payment fields to show on the checkout (if doing a direct integration).
			 *
			 * If you are creating an advanced, direct gateway (i.e., one that takes payment on the actual checkout page),
			 * there are additional steps involved. First, you need to set has_fields to true in the gateway constructor:
			 */
			$this->has_fields = true;

			/*
			 * Title of the payment method shown on the admin page.
			 */
			$this->method_title = 'WooCommerce Tokens Payment Gateway';
			$this->title = $this->get_option( 'title', 'Web3 Tokens Payment' );

			/*
			 * Description for the payment method shown on the admin page.
			 */
			$this->method_description = "Accept WooCommerce payments using HBAR or Hedera Tokens";

			/**
			 * Gateways can support subscriptions, refunds, saved payment methods etc.
			 *
			 * We will deal with simple payments
			 */
			$this->supports = array(
				'products',
                'refunds'
			);

			/*
			 * Define Settings Fields
			 */
			$this->init_form_fields();

			/*
			 * Load Settings Fields defined in init_form_fields()
			 */
			$this->init_settings();

			/*
			 * Add our gateway to WooCommerce Gateways list
			 */
			add_filter( 'woocommerce_payment_gateways', array( $this, 'add_gateway_to_woocommerce_gateway_list' ), 10, 1 );

			/*
			 * Add a save hook for our settings
			 */
			add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'process_admin_options' ) );

			/*
			 * API Callback Handler
			 */
			add_action( 'woocommerce_api_' . $this->id, array( $this, 'webhook' ) );

			/*
			 * Payment Instructions
			 */
			add_action('woocommerce_checkout_order_review', array( $this, 'woocommerce_payment_instructions'));

			/*
			 * Enqueue Scripts
			 */
			add_action( 'wp_enqueue_scripts', array( $this, 'payment_scripts' ) );

			/*
			 * Customize 'Place Order' html
			 */
			add_filter( 'woocommerce_order_button_html', array( $this, 'hedera_customize_order_button_html' ) );

			/*
			 * Add custom currencies
			 */
			add_filter( 'woocommerce_currencies', array( $this, 'add_custom_currencies' ) );

			/*
			 * Add custom currency symbols
			 */
			add_filter('woocommerce_currency_symbol', array( $this, 'add_custom_currency_symbols' ), 10, 2 );

		}

		/**
		 * Class initializer
		 */
		public function init() {
			add_action( 'woocommerce_thankyou_tokens-gateway', array( $this, 'show_transaction_details'), 20 );

			// Add metabox to the WooCommerce order edit screen
			add_action('add_meta_boxes', array( $this, 'add_wctg_order_meta_box'), 10, 2);
		}

		/*
		 * Check if the gateway is enabled
		 */
		public function is_enabled(): string {
			return $this->get_option( 'enabled', 'no' );
		}

		/**
		 * Add our gateway to WooCommerce Gateways list
		 *
		 * @param $methods
		 *
		 * @return mixed
		 */
		public function add_gateway_to_woocommerce_gateway_list( $methods ) {
			$methods[] = \WooCommerce_Tokens_Payment_Gateway\Gateway\Gateway::class;

			return $methods;
		}

		/**
		 * Define Settings Fields
		 */
		public function init_form_fields() {
			/*
			 * Get existing settings if they exist
			 */
			// Check if enabled
			$enabled = $this->get_option( 'enabled', 'no' );

			// Title
			$title = $this->get_option( 'title', 'Web3 Tokens Payment' );

			// Description
			$description = $this->get_option( 'description', '' );

			// Wallet Address
			$wallet_address = $this->get_option( 'wallet_address' );

            // Testnet
			$testnet = $this->get_option( 'testnet', 'no' );

			// Hedera Account ID
			$hedera_account_id = $this->get_option( 'hedera_account_id' );

			// Hedera Account Private Key
			$hedera_account_private_key = $this->get_option( 'hedera_account_private_key' );


			// Wallet Connect Project ID
			$wallet_connect_project_id = $this->get_option( 'wallet_connect_project_id' );

			// NodeJS Server URL
			$nodejs_server_url = $this->get_option( 'nodejs_server_url' );

			// NodeJS Server Bearer Token
			$nodejs_server_bearer_token = $this->get_option( 'nodejs_server_bearer_token' );

			// Woocommerce NFTs Single Transaction enabled
			$woocommerce_nfts_single_transaction = $this->get_option( 'woocommerce_nfts_single_transaction', 'no' );

			/*
			 * Basic Gateway Fields
			 */
			$this->form_fields = array(
				'enabled' => array(
					'title'   => __( 'Enable / Disable', 'woocommerce-tokens-payment-gateway' ),
					'type'    => 'checkbox',
					'label'   => __( 'Enable Tokens Payment Payment', 'woocommerce-tokens-payment-gateway' ),
					'default' => $enabled
				),

				'basic_settings' => array(
					'title'       => __( 'Basic settings', 'ether-and-erc20-tokens-woocommerce-payment-gateway' ),
					'type'        => 'title',
					'description' => '',
				),

				'title' => array(
					'title'       => __( 'Title', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'text',
					'description' => __( 'This controls the title which the user sees during checkout.', 'woocommerce-tokens-payment-gateway' ),
					'default'     => $title,
					'desc_tip'    => true,
				),

				'description' => array(
					'title'   => __( 'Customer Message', 'woocommerce-tokens-payment-gateway' ),
					'type'    => 'textarea',
					'default' => $description
				),

				'testnet' => array(
					'title'   => __( 'Enable Testnet', 'woocommerce-tokens-payment-gateway' ),
					'type'    => 'checkbox',
					'label'   => __( 'Enable Testnet Network', 'woocommerce-tokens-payment-gateway' ),
					'default' => $testnet
				),

				/*'wallet_address' => array(
					'title'       => __( 'Store Wallet Address', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'text',
					'description' => __( 'This address is used to receive payments.', 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'default' => $wallet_address
				),*/

				'wallet_connect_project_id' => array(
					'title'       => __( 'WalletConnect Project ID', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'text',
					'description' => __( 'This project ID is used to authenticate with WalletConnect.', 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'default' => $wallet_connect_project_id
				),


				'hedera_account_id' => array(
					'title'       => __( 'Store\'s Hedera Account ID', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'text',
					'description' => __( 'This account ID is used to receive payments.', 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'default' => $hedera_account_id
				),

				 'hedera_account_private_key' => array(
					'title'       => __( 'Store\'s Hedera Account\'s Private Key. This is required when processing refunds.', 'woocommerce-tokens-payment-gateway' ),
					'type'        => '',
					'description' => '',
					'desc_tip'    => false,
					'default' => $hedera_account_private_key
				),

				'nodejs_server_url' => array(
					'title'       => __( 'Store\'s NodeJS Server URL', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'text',
					'description' => __( 'Enter the store\'s NodeJS server URL, including the port e.g. https://example.com:3000', 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => false,
					'default' => $nodejs_server_url
				),

				'nodejs_server_bearer_token' => array(
					'title'       => __( 'NodeJS Server Bearer Token', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'password',
					'description' => __( 'This bearer token will be used to authenticate requests to the NodeJS server', 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => false,
					'default' => $nodejs_server_bearer_token
				),
			);

			/*
			 * Plugin Compatibility Settings
			 */
			$plugin_compatibility_settings = array();
			// Check if compatible plugins are active
			include_once ABSPATH . 'wp-admin/includes/plugin.php';
			if( is_plugin_active( 'woocommerce-nfts/woocommerce-nfts.php' ) ){
				$plugin_compatibility_settings[ 'compatibility_settings' ] = array(
					'title'       => __( 'Plugin Compatibility', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'title',
					'description' => '',
				);

				$plugin_compatibility_settings[ 'compatible_plugins' ] = array(
					'title'       => __( 'Supported Plugins', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'multiselect',
					'description' => __( 'Which plugins should WooCommere Tokens Payment Gateway integrate with?', 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'class'             => 'wc-enhanced-select',
					'css'               => 'width: 400px;',
					'default'           => '',
					'custom_attributes' => array(
						'data-placeholder' => __( 'Select plugins', 'woocommerce-tokens-payment-gateway' ),
						'multiple' => 'multiple'
					),
					'options' => array(
						'woocommerce_nfts' => 'WooCommerce NFTs'
					)
				);

				$plugin_compatibility_settings[ 'woocommerce_nfts_single_transaction' ] = array(
					'title'   => __( 'WooCommerce NFTs Single Transaction', 'woocommerce-tokens-payment-gateway' ),
					'type'    => 'checkbox',
					'label'   => __( 'Enable receiving payment and sending NFTs in a single transaction', 'woocommerce-tokens-payment-gateway' ),
					'default' => $woocommerce_nfts_single_transaction
				);

			}

			/*
			 * Token Settings
			 */
			$token_settings = array(
				'token_settings' => array(
					'title'       => __( 'Token Settings', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'title',
					'description' => '',
				),

				'tokens' => array(
					'title'       => __( 'Supported Tokens', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'multiselect',
					'description' => __( 'From which Web3 tokens should you receive payment.', 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'class'             => 'wc-enhanced-select',
					'css'               => 'width: 400px;',
					'default'           => '',
					'custom_attributes' => array(
						'data-placeholder' => __( 'Select some tokens', 'woocommerce-tokens-payment-gateway' ),
						'multiple' => 'multiple'
					),
					'options' => array(
						//'erc20' => 'ERC20 Token',
						//'erc223' => 'ERC223 Token',
						//'erc777' => 'ERC777 Token',
						'hbar' => 'HBAR',
                        'usdc' => 'USDC',
                        'sauce' => 'SAUCE',
                        'hchf' => 'HCHF'
					)
				),
			);

			/*
			 * ERC20 Default Values & Fields
			 */
			// ERC20 Default Values
			$erc20_token_symbol = $this->get_option( 'erc20_token_symbol', '' );
			$erc20_token_contract_address = $this->get_option( 'erc20_token_contract_address', '' );
			$erc20_token_conversion_manual_rate = $this->get_option( 'erc20_token_conversion_manual_rate', '' );

			// ERC20 Fields
			$erc20_token_fields = array(
				'erc20_token_settings' => array(
					'title'       => __( 'ERC20 Token Settings', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'title',
					'description' => '',
					'class' => 'show_if_erc20',
				),

				'erc20_token_symbol' => array(
					'title'       => __( 'ERC20 Token Symbol', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'text',
					'description' => __( "Enter the ERC20's symbol.", 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'default' => $erc20_token_symbol,
					'class' => 'show_if_erc20',
				),

				'erc20_token_contract_address' => array(
					'title'       => __( 'ERC20 Token Contract Address', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'text',
					'description' => __( "Enter the ERC20's contract address.", 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'default' => $erc20_token_contract_address,
					'class' => 'show_if_erc20',
				),

				'erc20_token_conversion_rate_source' => array(
					'title'       => __( 'ERC20 Token Conversion Rate Source', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'select',
					'description' => __( "Enter the ERC20's contract address.", 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'custom_attributes' => array(
						'data-placeholder' => __( 'Select a rate source', 'woocommerce-tokens-payment-gateway' ),
					),
					'options' => array(
						'manual' => 'Manual',
						'coinmarketcap.com' => 'Coinmarketcap.com',
						'livecoin.net' => 'Livecoin.net',
						'coinbase.com' => 'Coinbase.com'
					),
					'class' => 'show_if_erc20',
				),

				'erc20_token_conversion_manual_rate' => array(
					'title'       => __( 'ERC20 Token Manual Conversion Rate', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'number',
					'description' => __( "Enter the ERC20's manual conversion rate.", 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'default' => $erc20_token_conversion_manual_rate,
					'class' => 'show_if_erc20 show_if_erc20_manual_conversion',
				),

			);

			/*
			 * ERC223 Default Values & Fields
			 */
			// ERC223 Default Values
			$erc223_token_symbol = $this->get_option( 'erc223_token_symbol', '' );
			$erc223_token_contract_address = $this->get_option( 'erc223_token_contract_address', '' );
			$erc223_token_conversion_manual_rate = $this->get_option( 'erc223_token_conversion_manual_rate', '' );

			// ERC223 Fields
			$erc223_token_fields = array(
				'erc223_token_settings' => array(
					'title'       => __( 'ERC223 Token Settings', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'title',
					'description' => '',
					'class' => 'show_if_erc223',
				),

				'erc223_token_symbol' => array(
					'title'       => __( 'ERC223 Token Symbol', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'text',
					'description' => __( "Enter the ERC223's symbol.", 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'default' => $erc223_token_symbol,
					'class' => 'show_if_erc223',
				),

				'erc223_token_contract_address' => array(
					'title'       => __( 'ERC223 Token Contract Address', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'text',
					'description' => __( "Enter the ERC223's contract address.", 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'default' => $erc223_token_contract_address,
					'class' => 'show_if_erc223',
				),

				'erc223_token_conversion_rate_source' => array(
					'title'       => __( 'ERC223 Token Conversion Rate Source', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'select',
					'description' => __( "Enter the ERC223's contract address.", 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'custom_attributes' => array(
						'data-placeholder' => __( 'Select a rate source', 'woocommerce-tokens-payment-gateway' ),
					),
					'options' => array(
						'manual' => 'Manual',
						'coinmarketcap.com' => 'Coinmarketcap.com',
						'livecoin.net' => 'Livecoin.net',
						'coinbase.com' => 'Coinbase.com'
					),
					'class' => 'show_if_erc223',
				),

				'erc223_token_conversion_manual_rate' => array(
					'title'       => __( 'ERC223 Token Manual Conversion Rate', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'number',
					'description' => __( "Enter the ERC223's manual conversion rate.", 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'default' => $erc223_token_conversion_manual_rate,
					'class' => 'show_if_erc223 show_if_erc223_manual_conversion',
				),

			);

			/*
			 * ERC777 Default Values & Fields
			 */
			// ERC777 Default Values
			$erc777_token_symbol = $this->get_option( 'erc777_token_symbol', '' );
			$erc777_token_contract_address = $this->get_option( 'erc777_token_contract_address', '' );
			$erc777_token_conversion_manual_rate = $this->get_option( 'erc777_token_conversion_manual_rate', '' );

			// ERC777 Fields
			$erc777_token_fields = array(
				'erc777_token_settings' => array(
					'title'       => __( 'ERC777 Token Settings', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'title',
					'description' => '',
					'class' => 'show_if_erc777',
				),

				'erc777_token_symbol' => array(
					'title'       => __( 'ERC777 Token Symbol', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'text',
					'description' => __( "Enter the ERC777's symbol.", 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'default' => $erc777_token_symbol,
					'class' => 'show_if_erc777',
				),

				'erc777_token_contract_address' => array(
					'title'       => __( 'ERC777 Token Contract Address', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'text',
					'description' => __( "Enter the ERC777's contract address.", 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'default' => $erc777_token_contract_address,
					'class' => 'show_if_erc777',
				),

				'erc777_token_conversion_rate_source' => array(
					'title'       => __( 'ERC777 Token Conversion Rate Source', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'select',
					'description' => __( "Enter the ERC777's contract address.", 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'custom_attributes' => array(
						'data-placeholder' => __( 'Select a rate source', 'woocommerce-tokens-payment-gateway' ),
					),
					'options' => array(
						'manual' => 'Manual',
						'coinmarketcap.com' => 'Coinmarketcap.com',
						'livecoin.net' => 'Livecoin.net',
						'coinbase.com' => 'Coinbase.com'
					),
					'class' => 'show_if_erc777',
				),

				'erc777_token_conversion_manual_rate' => array(
					'title'       => __( 'ERC777 Token Manual Conversion Rate', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'number',
					'description' => __( "Enter the ERC777's manual conversion rate.", 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'default' => $erc777_token_conversion_manual_rate,
					'class' => 'show_if_erc777 show_if_erc777_manual_conversion',
				),

			);

			/*
			 * Hedera HBAR Default Values & Fields
			 */
			// Hedera Default Values
			$hedera_hbar_conversion_manual_rate = $this->get_option( 'hedera_hbar_conversion_manual_rate', '' );

			// Hedera HBAR Fields
			$hedera_hbar_fields = array(
				'hedera_hbar_settings' => array(
					'title'       => __( 'Hedera HBAR Settings', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'title',
					'description' => '',
					'class' => 'show_if_hedera',
				),

				'hedera_hbar_conversion_rate_source' => array(
					'title'       => __( 'Hedera HBAR Conversion Rate Source', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'select',
					'description' => __( "Enter the HBAR's conversion rate source.", 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'custom_attributes' => array(
						'data-placeholder' => __( 'Select a rate source', 'woocommerce-tokens-payment-gateway' ),
					),
					'options' => array(
						'manual' => 'Manual',
						//'coinmarketcap.com' => 'Coinmarketcap.com',
						//'livecoin.net' => 'Livecoin.net',
						//'coinbase.com' => 'Coinbase.com'
					),
					'class' => 'show_if_hedera',
				),

				'hedera_hbar_conversion_manual_rate' => array(
					'title'       => __( 'Hedera HBAR Manual Conversion Rate', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'number',
					'description' => __( "Enter the Hedera's manual conversion rate.", 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'default' => $hedera_hbar_conversion_manual_rate,
					'class' => 'show_if_hedera show_if_hedera_manual_conversion',
					'custom_attributes' => array(
						'wrapper_class' => 'show_if_hedera show_if_hedera_manual_conversion',
						'step' => 0.00001
					),
				),

			);

			/*
			 * Hedera Token Default Values & Fields
			 */
			// Hedera Default Values
			$hedera_token_name = $this->get_option( 'hedera_token_name', '' );
			$hedera_token_id = $this->get_option( 'hedera_token_id', '' );
			$hedera_token_symbol = $this->get_option( 'hedera_token_symbol', '' );
			$hedera_token_added_to_currencies = $this->get_option( 'hedera_token_added_to_currencies', 'no' );
			$hedera_token_decimals = $this->get_option( 'hedera_token_decimals', 0 );
			$hedera_token_conversion_manual_rate = $this->get_option( 'hedera_token_conversion_manual_rate', '' );

			// Hedera Token Fields
			$hedera_token_fields = array(
				'hedera_token_settings' => array(
					'title'       => __( 'Hedera Token Settings', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'title',
					'description' => '',
					'class' => 'show_if_hedera',
				),

				'hedera_token_name' => array(
					'title'       => __( 'Hedera Token Name', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'text',
					'description' => __( "Enter the Hedera token's name.", 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'default' => $hedera_token_name,
					'class' => 'show_if_hedera',
				),

				'hedera_token_id' => array(
					'title'       => __( 'Hedera Token ID', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'text',
					'description' => __( "Enter the Hedera token's ID.", 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'default' => $hedera_token_id,
					'class' => 'show_if_hedera',
				),

				'hedera_token_network' => array(
					'title'       => __( 'Hedera Token Network', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'select',
					'description' => __( "Enter the Hedera token's network.", 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'custom_attributes' => array(
						'data-placeholder' => __( 'Select Hedera network', 'woocommerce-tokens-payment-gateway' ),
					),
					'options' => array(
						'mainnet' => 'Mainnet',
						'previewnet' => 'Previewnet',
						'testnet' => 'Testnet',
					),
					'class' => 'show_if_hedera',
				),

				'hedera_token_symbol' => array(
					'title'       => __( 'Hedera Token Symbol', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'text',
					'description' => __( "Enter the Hedera token's Symbol.", 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'default' => $hedera_token_symbol,
					'class' => 'show_if_hedera',
				),

				'hedera_token_added_to_currencies' => array(
					'title'   => __( 'Enable / Disable', 'woocommerce-tokens-payment-gateway' ),
					'type'    => 'checkbox',
					'label'   => __( 'Add this token to WooCommerce Currencies', 'woocommerce-tokens-payment-gateway' ),
					'description' => __( "Should this token be added to WooCommerce as a custom currency?.", 'woocommerce-tokens-payment-gateway' ),
					'default' => $hedera_token_added_to_currencies
				),

				'hedera_token_decimals' => array(
					'title'       => __( 'Hedera Token Decimals', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'number',
					'description' => __( "Enter the maximum decimals allowed for this token.", 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'default' => $hedera_token_decimals,
					'class' => 'show_if_hedera',
					'custom_attributes' => array(
						'wrapper_class' => 'show_if_hedera ',
						'step' => 1
					),
				),

				'hedera_token_conversion_rate_source' => array(
					'title'       => __( 'Hedera Token Conversion Rate Source', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'select',
					'description' => __( "Enter the Hedera's contract address.", 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'custom_attributes' => array(
						'data-placeholder' => __( 'Select a rate source', 'woocommerce-tokens-payment-gateway' ),
					),
					'options' => array(
						'manual' => 'Manual',
						//'coinmarketcap.com' => 'Coinmarketcap.com',
						//'livecoin.net' => 'Livecoin.net',
						//'coinbase.com' => 'Coinbase.com'
					),
					'class' => 'show_if_hedera',
				),

				'hedera_token_conversion_manual_rate' => array(
					'title'       => __( 'Hedera Token Manual Conversion Rate', 'woocommerce-tokens-payment-gateway' ),
					'type'        => 'number',
					'description' => __( "Enter the Hedera's manual conversion rate.", 'woocommerce-tokens-payment-gateway' ),
					'desc_tip'    => true,
					'default' => $hedera_token_conversion_manual_rate,
					'class' => 'show_if_hedera show_if_hedera_manual_conversion',
					'custom_attributes' => array(
						'wrapper_class' => 'show_if_hedera show_if_hedera_manual_conversion',
						'step' => 0.00001
					),
				),

			);

			// Add Token Fields
			$this->form_fields = array_merge( $this->form_fields, $plugin_compatibility_settings, $token_settings );

		}

		/**
		 * Load Settings Fields defined in init_form_fields()
		 */
		public function init_settings() {
			parent::init_settings(); // TODO: Change the autogenerated stub
		}

		/**
		 * This tells the checkout to output a ‘payment_box’ containing your direct payment form that you define below.
		 */
		public function payment_fields() {

			// Title
			$title = $this->get_option( 'title', 'Web3 Tokens Payment' );

			// Description
			$description = $this->get_option( 'description', '' );

			// Hedera Account ID
			$hedera_account_id = $this->get_option( 'hedera_account_id' );

			echo '<p>' . esc_attr( $description ) . '<br/>';

            /*
             * Payment Container used by React
             */
			echo '<div id="payment-container"></div>';
			echo '<input id="wtpg-token-status" name="wtpg_token_status" type="hidden" autocomplete="off" value="0"/>';


			return;

			$supported_tokens = $this->get_option( 'tokens' );



			foreach ( $supported_tokens as $supported_token ){
				// HBAR
				if( $supported_token == 'hbar' ){
					echo 'HBAR Amount:</strong> ' . $this->convert_cart_amount_to_hbar_amount( WC()->cart->total ) . '<br/>';
				}

				// Tokens
				if( $supported_token == 'hedera_tokens' ){
					echo 'Token Amount:</strong> ' . $this->convert_cart_amount_to_token_amount( WC()->cart->total ) . '<br/>';
				}

                // echo 'Make payment using HBAR or any popular Hedera Token';

			}

			echo '</p>';

			echo '<input id="wtpg-token-status" name="wtpg_token_status" type="hidden" autocomplete="off" value="0"/>';


			/*
			 * WalletConnect Container
			 */
			// echo '<div id="wallet-connect-container"></div>';
			echo '<div id="payment-container"></div>';
			// echo '<a id="renderButton" class="button" href="#payment-container">Make Payment</a>';

		}

		/**
		 * Customize 'Place Order' html
		 */
		public function hedera_customize_order_button_html( $button ){
			if ( 'yes' === $this->enabled ) {
				return '<button id="renderButton" class="button">Make Payment</button>';
			}

            return $button;
		}

		/**
		 * Convert Cart Totals to HBAR Amounts
		 *
		 * @param int $cart_totals
		 *
		 * @return float
		 */
		public function convert_cart_amount_to_hbar_amount( int $cart_totals ){

			$conversion_rate = $this->get_option( 'hedera_hbar_conversion_manual_rate', 1 );

			return $cart_totals * $conversion_rate;
		}

		/**
		 * Convert Cart Totals to Hedera Token Amounts
		 *
		 * @param int $cart_totals
		 *
		 * @return float
		 */
		public function convert_cart_amount_to_token_amount( int $cart_totals ){

			$conversion_rate = $this->get_option( 'hedera_token_conversion_manual_rate', 1 );

			return ( $cart_totals * $conversion_rate ) ;
		}

		/**
		 * Display instructions before payment gateway options
		 */
		public function woocommerce_payment_instructions(){
			// echo 'You will use two different payment gateways.';
		}

		/**
		 * Custom CSS and JS, in most cases required only when you decided to go with a custom payment form
		 */
		public function payment_scripts() {
			// we need JavaScript to process a token only on cart/checkout pages, right?
			if ( ! is_cart() && ! is_checkout() ) {
				return;
			}

			// if our payment gateway is disabled, we do not have to enqueue JS too
			if ( 'no' === $this->enabled ) {
				return;
			}

			$is_testnet = 'yes' === $this->get_option( 'testnet', 'no' );
			$supported_tokens = woocommerce_tokens_payment_gateway_get_supported_token_ids( $is_testnet, $this->get_option( 'tokens', array() ) );

			wp_enqueue_script( 'jquery', '', array(), false, array('in_footer' => false ) );
			wp_enqueue_script( 'woocommerce-tokens-payment-gateway-default' );
			wp_enqueue_script( 'woocommerce-tokens-payment-gateway-price-formatter' );
			wp_localize_script(
				'woocommerce-tokens-payment-gateway-price-formatter',
				'wtpg_price_formatter_params',
				array(
					'total' => WC()->cart->total,
                    'tokens' => $supported_tokens,
					'network' => $is_testnet ? 'testnet' : 'mainnet',
					'hedera_account_id' => $this->get_option( 'hedera_account_id', false ),
					'hedera_private_key' =>  $this->get_option( 'hedera_account_private_key' ),
                    'ajax_url' => admin_url( 'admin-ajax.php' ),
				)
			);

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
		 * Handles payment and processing the order.
		 *
		 * Process_payment also tells WC where to redirect the user, and this is done with a returned array.
		 *
		 * @param int $order_id
		 *
		 * @return array|null
		 */
		public function process_payment( $order_id ) {

			global $woocommerce;
			$order = new WC_Order( $order_id );

			/*
			 * Check if payment is completed
			 */
			$completed = isset( $_POST['wtpg_token_status' ] ) && $_POST['wtpg_token_status' ] == 3756;
			if ( ! $completed ) {
				$error_message = 'Could not complete payment.';

				wc_add_notice( __( 'Payment error: ', 'woocommerce-tokens-payment-gateway' ) . $error_message, 'error' );

				return null;
			}

			// Mark as complete
			$order->payment_complete();

			// Remove cart
			$woocommerce->cart->empty_cart();

			// Return thank you redirect
			return array(
				'result'   => 'success',
				'redirect' => $this->get_return_url( $order )
			);
		}

		/**
		 * Process a refund.
		 *
		 * @param int    $order_id The order ID.
		 * @param float  $amount The amount to refund.
		 * @param string $reason (Optional) Reason for the refund.
		 *
		 * @return bool|WP_Error True if the refund was successful, otherwise a WP_Error object.
		 */
		public function process_refund( $order_id, $amount = null, $reason = '' ): WP_Error|bool {
            $order = wc_get_order( $order_id );

            $payer_account_id = get_post_meta( $order_id, 'wctg_payer_account_id', true );
			$payment_amount = get_post_meta( $order_id, 'wctg_payment_amount', true );
			$payment_hash = get_post_meta( $order_id, 'wctg_payment_hash', true );
			$payment_token_name = get_post_meta( $order_id, 'wctg_payment_token_name', true );
			$payment_token_id = get_post_meta( $order_id, 'wctg_payment_token_id', true );
			$payment_network = get_post_meta( $order_id, 'wctg_payment_network', true );



			// Example: Call your payment provider's refund API here.
			// This is a placeholder. Replace with your actual refund logic.
			$refund_successful = true; // Assume refund is successful for this example.

			/*
             * Request Parameters
             */
			$nodejs_server_url          = woocommerce_tokens_payment_gateway_get_server_url();
			$endpoint                   = $nodejs_server_url . '/refund-tokens';
			$nodejs_server_bearer_token = woocommerce_tokens_payment_gateway_get_bearer_token();
			$token_sender_account = woocommerce_tokens_payment_gateway_get_store_id();
			$token_sender_private_key = woocommerce_tokens_payment_gateway_get_store_id_private_key();

			$body = array(
				'token_id'       => $payment_token_id,
				'token_amount'   => $payment_amount,
				'sender_account' => $token_sender_account,
				'sender_account_private_key' => $token_sender_private_key,
				'memo'           => 'Refund for ' . $order_id,
				'receiver_account' => $payer_account_id,
                'network' => $payment_network
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

				$body = json_decode( $body, true );

                if ( $body['success'] ) {
	                // Add an order note for the refund
	                $order->add_order_note( sprintf(
		                __( 'Refund of %s processed. Reason: %s', 'woocommerce-tokens-payment-gateway' ),
		                wc_price( $amount ),
		                $reason
	                ) );
	                return true;
                }
			}

			return new WP_Error( 'refund_error', __( 'Refund failed.', 'woocommerce-tokens-payment-gateway' ) );
		}

		/**
		 * Save Settings
		 *
		 * @return bool|void
		 */
		public function process_admin_options() {
			parent::process_admin_options(); // TODO: Change the autogenerated stub
		}


		/**
		 * Output the admin options table.
		 */
		public function admin_options() {
			echo '<table class="form-table">' . $this->generate_settings_html( $this->get_form_fields(), false ) . '</table>'; // WPCS: XSS ok.

			// Load the token repeater fields
			// woocommerce_tokens_payment_gateway_get_template('admin/settings/token-settings');
		}

		/**
		 * API Callback Handler
		 *
		 * @see https://github.com/hashgraph/hedera-sdk-js/blob/develop/examples/transfer-tokens.js
		 * @see https://github.com/hashgraph/hedera-sdk-js/blob/develop/examples/get-exchangerates.js
		 */
		public function webhook() {
			$order_id = $_GET['order_id'] ?? null;

			if ( $order_id ) {

				$order = wc_get_order( $order_id );
				$order->payment_complete();

			}
		}

		/**
		 * Add custom currencies
		 *
		 * @param $currencies
		 *
		 * @return mixed
		 */
		public function add_custom_currencies( $currencies ){
			if( 'yes' == $this->enabled ){
				// Add HBAR
				$currencies['hbar'] = __( 'HBAR', 'woocommerce' );

				// Add Hedera Token
				$hedera_token_name = $this->get_option( 'hedera_token_name', '' );
				$hedera_token_id = $this->get_option( 'hedera_token_id', '' );
				$hedera_token_symbol = $this->get_option( 'hedera_token_symbol', '' );
				$hedera_token_added_to_currencies = $this->get_option( 'hedera_token_added_to_currencies', 'no' );

				if( '' != $hedera_token_name && '' != $hedera_token_id && '' != $hedera_token_symbol && 'yes' == $hedera_token_added_to_currencies ){
					$currencies['hedera_token'] = $hedera_token_name;
				}
			}

			return $currencies;
		}

		/**
		 * Add custom currency symbols
		 *
		 * @param $currency_symbol
		 * @param $currency
		 *
		 * @return mixed|string
		 */
		function add_custom_currency_symbols( $currency_symbol, $currency ) {
			if( 'yes' == $this->enabled ){
				$hedera_token_name = $this->get_option( 'hedera_token_name', '' );
				$hedera_token_id = $this->get_option( 'hedera_token_id', '' );
				$hedera_token_symbol = $this->get_option( 'hedera_token_symbol', '' );
				$hedera_token_added_to_currencies = $this->get_option( 'hedera_token_added_to_currencies', 'no' );

				switch( $currency ) {
					case 'hbar':
						$currency_symbol = 'ℏ';
						break;

					case 'hedera_token':
						if( '' != $hedera_token_name && '' != $hedera_token_id && '' != $hedera_token_symbol && 'yes' == $hedera_token_added_to_currencies ){
							$currency_symbol = $hedera_token_symbol;
						}

						break;
				}
			}

			return $currency_symbol;
		}

		/**
		 * Show custom details on thank you page
		 */
		function show_transaction_details( $order_id ){
			/**
			 * Update Order Meta
			 */
			$order = wc_get_order( $order_id );
			if( $order ){
				$order->add_meta_data('wctg_payer_account_id', $_COOKIE['payer_account_id'] );
				$order->add_meta_data('wctg_payment_amount', $_COOKIE['payment_amount'] );
				$order->add_meta_data('wctg_payment_token_name', $_COOKIE['payment_token_name'] );
				$order->add_meta_data('wctg_payment_token_id', $_COOKIE['payment_token_id'] );
				$order->add_meta_data('wctg_payment_hash', $_COOKIE['payment_hash'] );
				$order->add_meta_data('wctg_payment_network', $_COOKIE['payment_network'] );

				$order->save();
			}

			$network = $_COOKIE['payment_network'];

			$payer_account_id = get_post_meta( $order_id, 'wctg_payer_account_id', true );
			$payment_amount = get_post_meta( $order_id, 'wctg_payment_amount', true );
			$payment_hash = get_post_meta( $order_id, 'wctg_payment_hash', true );
			$payment_token_name = get_post_meta( $order_id, 'wctg_payment_token_name', true );
			$payment_token_id = get_post_meta( $order_id, 'wctg_payment_token_id', true );
			$payment_network = get_post_meta( $order_id, 'wctg_payment_network', true );

			?>
			<h3>Hedera Transaction Details</h3>
			<table class="shop_table shop_table_responsive additional_info">
				<tbody>
                <tr>
                    <td><strong><?php echo 'Payer Account'; ?></strong></td>
                    <td><?php echo $payer_account_id ?></td>
                </tr>

				<tr>
					<td><strong><?php echo 'Payment Amount'; ?></strong></td>
					<td><?php echo $payment_amount . ' '  . $payment_token_name; ?></td>
				</tr>

                <tr>
                    <td><strong><?php echo 'Hedera Network'; ?></strong></td>
                    <td><?php echo ucfirst( $payment_network ); ?></td>
                </tr>

				<tr>
					<td><strong><?php echo 'Payment Token'; ?></strong></td>
					<td><?php echo strtolower( $payment_token_name ) == 'hbar' ? $payment_token_name : $payment_token_name . ' (' . $payment_token_id . ')'; ?></td>
				</tr>

				<tr>
					<td><strong><?php echo 'Transaction Hash'; ?></strong></td>
					<td><a href="https://hashscan.io/<?php echo $network; ?>/transaction/<?php echo $_COOKIE['payment_hash']; ?>" target="_blank"><?php echo $_COOKIE['payment_hash']; ?> </a></td>
				</tr>
				</tbody>
			</table>
			<?php
		}

		/**
         * Add payment details metabox
         *
		 * @param $post_type
		 * @param $post
		 */
		function add_wctg_order_meta_box( $post_type, $post ) {
			if( ! $post instanceof \Automattic\WooCommerce\Admin\Overrides\Order || 'tokens-gateway' != $post->get_payment_method() ){
				return;
			}

			add_meta_box(
				'wctg_order_meta_box',          // Unique ID
				'Payment Details',              // Box title
				array( $this, 'display_wctg_order_meta_box'),  // Content callback
				'woocommerce_page_wc-orders',                   // Screen (WooCommerce order)
				'advanced',                         // Context (place on the side)
				'default'                       // Priority
			);
		}

		/**
		 * @param Order $post
		 *
		 * @return void
		 */
		function display_wctg_order_meta_box( $post ) {


			// Get the meta data for the order
			$payer_account_id = get_post_meta( $post->get_id(), 'wctg_payer_account_id', true );
			$payment_amount = get_post_meta( $post->get_id(), 'wctg_payment_amount', true );
			$payment_hash = get_post_meta( $post->get_id(), 'wctg_payment_hash', true );
			$payment_token_name = get_post_meta( $post->get_id(), 'wctg_payment_token_name', true );
			$payment_token_id = get_post_meta( $post->get_id(), 'wctg_payment_token_id', true );
            $payment_network = get_post_meta( $post->get_id(), 'wctg_payment_network', true );

            $payment_hash_link = '<a href="https://hashscan.io/' . $payment_network . '/transaction/' . $payment_hash . '" target="_blank">' . $payment_hash . '</a>';

			// Create the table
			echo '<table style="width:100%">';
			echo '<tr><th>Title</th><th>Value</th></tr>'; // Table headers

			echo '<tr><td>Payer Account ID</td><td>' . esc_html( $payer_account_id ) . '</td></tr>';
			echo '<tr><td>Payment Amount</td><td>' . esc_html( $payment_amount ) . '</td></tr>';
			echo '<tr><td>Payment Network</td><td>' . esc_html( ucfirst( $payment_network ) ) . '</td></tr>';
			echo '<tr><td>Payment Hash</td><td>' . $payment_hash_link . '</td></tr>';
			echo '<tr><td>Payment Token</td><td>' . esc_html( $payment_token_name ) . ' (' . $payment_token_id . ')' . '</td></tr>';

			echo '</table>';
		}

	}
}

