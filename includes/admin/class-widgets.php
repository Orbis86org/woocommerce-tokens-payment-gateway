<?php
/**
 * Widgets class
 */

namespace WooCommerce_Tokens_Payment_Gateway\Admin;

use WooCommerce_Tokens_Payment_Gateway\Traits\Singleton;
use WP_Email_Manager\Limits\Limits;

class Widgets {
	use Singleton;

	/**
	 * Class Initializer
	 */
	public function init() {
		add_action( 'wp_dashboard_setup', array( $this, 'create_orders_widget' ) );
	}


	/**
	 * Create orders dashboard widget
	 */
	public function create_orders_widget(): void {
		if ( current_user_can( 'manage_options' ) ) {
			wp_add_dashboard_widget(
				'wctg_orders_dashboard_widget',                          // Widget slug.
				esc_html__( 'Orders Processed By WooCommerce Tokens Payment Gateway', 'wp-email-manager' ), // Title.
				array( $this, 'orders_dashboard_widget_render' )                    // Display function.
			);
		}
	}

	/**
	 * Create the function to output the content of our Orders Dashboard Widget.
	 */
	function orders_dashboard_widget_render() {
		?>
		<div id="wctg-orders-chart">
		</div>

        <script>
			var options = {
				chart: {
					type: 'line'
				},
				series: [{
					name: 'sales',
					data: [30,40,35,50,49,60,70,91,125]
				}],
				xaxis: {
					categories: [1991,1992,1993,1994,1995,1996,1997, 1998,1999]
				}
			}

			var chart = new ApexCharts(document.querySelector("#wctg-orders-chart"), options);

			chart.render();
        </script>
		<?php
	}
}