<?php
/**
 * Handles the Admin Notices added by WooCommerce Tokens Payment Gateway.
 *
 * @package WooCommerce_Tokens_Payment_Gateway
 * @subpackage Admin_Notices
 * @since 0.0.1
 */

namespace WooCommerce_Tokens_Payment_Gateway;

// Exit if accessed directly
defined( 'ABSPATH' ) || exit;

use WooCommerce_Tokens_Payment_Gateway\Traits\Singleton;

/**
 * Handles Admin Notices.
 *
 * @since 0.0.1
 */
class Admin_Notices {
	use Singleton;

	/**
	 * Initialize class
	 */
	public function init() {
		add_action( 'network_admin_notices', array( $this, 'plugin_settings_notices' ) );
		add_action( 'admin_notices', array( $this, 'plugin_settings_notices' ) );
	}

	/**
	 * These notices are shown when plugin settings are saved
	 */
	public function plugin_settings_notices() {
		// Shown on settings page
		if (
			isset( $_GET['page'] ) &&
			'woocommerce-tokens-payment-gateway-settings' == $_GET['page']
		) {
			//Shown if there is an error
			if ( isset( $_GET['error'] ) && 'true' == $_GET['error'] ) {
				?>
                <div class="notice notice-error is-dismissible">
                    <p>
                        Error saving settings. Please try again.
                    </p>
                </div>
				<?php
			}

			//Shown if there is no error
			if ( isset( $_GET['error'] ) && 'false' == $_GET['error'] ) {
				$current_tab = $_GET['tab'] ?? '';
				if ( 'license' != $current_tab ) {
					?>
                    <div class="notice notice-success is-dismissible">
                        <p>
                            Settings saved successfully.
                        </p>
                    </div>
					<?php
				}
			}
		}

		//Shown on license tab
		if ( isset( $_GET['page'] ) && 'woocommerce-tokens-payment-gateway-settings' == $_GET['page'] && isset( $_GET['tab'] ) && 'license' == $_GET['tab'] ) {
			//Shown if there is an error
			if ( isset( $_GET['error'] ) && 'true' == $_GET['error'] ) {
				?>
                <div class="notice notice-error is-dismissible">
                    <p>
                        Error saving. Please try again.
                    </p>
                </div>
				<?php
			}

			//Shown if there is no error (activated license)
			if ( isset( $_GET['error'] ) && 'false' == $_GET['error'] && isset( $_GET['status'] ) && 'activate' == $_GET['status'] ) {
				?>
                <div class="notice notice-success is-dismissible">
                    <p>
                        License activated successfully.
                    </p>
                </div>
				<?php
			}

			//Shown if there is no error (deactivated license)
			if ( isset( $_GET['error'] ) && 'false' == $_GET['error'] && isset( $_GET['status'] ) && 'deactivate' == $_GET['status'] ) {
				?>
                <div class="notice notice-success is-dismissible">
                    <p>
                        License deactivated successfully.
                    </p>
                </div>
				<?php
			}
		}
	}

} // end class Admin_Notices;
