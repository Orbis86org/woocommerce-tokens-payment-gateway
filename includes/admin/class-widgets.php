<?php
/**
 * Widgets class
 */

namespace WooCommerce_Tokens_Payment_Gateway\Admin;

use WooCommerce_Tokens_Payment_Gateway\Traits\Singleton;

class Widgets {
	use Singleton;

	/**
	 * Class Initializer
	 */
	public function init() {
        // Below charts moved to WooCommerce Reports Page
		/*add_action( 'wp_dashboard_setup', array( $this, 'create_orders_widget' ) );
		add_action( 'wp_dashboard_setup', array( $this, 'create_total_orders_widget' ) );
		add_action( 'wp_dashboard_setup', array( $this, 'create_income_per_token_widget' ) );
		add_action( 'wp_dashboard_setup', array( $this, 'create_income_per_token_widget_2' ) );*/

		// Hook into WooCommerce Reports to add a custom report tab
		add_filter( 'woocommerce_admin_reports', array( $this, 'add_custom_woocommerce_report_tab' ) );
	}

	function add_custom_woocommerce_report_tab( $reports ) {
		$sales_by_country = array(
			'tokens_gateway' => array(
				'title'       => __( 'Orders Processed by Tokens Gateway', 'woocommerce-tokens-payment-gateway' ),
				'description' => __( 'Below shows the number of orders and their total value that were processed by WooCommerce Tokens Payment Gateway', 'woocommerce-tokens-payment-gateway' ),
				'callback'    => array( $this, 'display_custom_report_content')
			),
		);
		// This can be: orders, customers, stock or taxes, based on where we want to insert our new reports page
		$reports['orders']['reports'] = array_merge( $reports['orders']['reports'], $sales_by_country);
		return $reports;

	}

	// Function to display custom report content
	function display_custom_report_content() {
		?>
        <div class="wrap woocommerce">
            <div style="display: flex; align-items: center; justify-content: end;">
                <label for="totalOrderYearFilter" style="margin-right: 10px;">Select Year:</label>
                <select id="totalOrderYearFilter" style="border-radius: 5px;">
                    <option value="2025" selected>2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                </select>
            </div>

            <div id="wctg-total-orders-chart">
            </div>

            <script>
				var chartData = {
					"2024": [120, 150, 90, 200, 180, 30, 150, 140, 125, 90, 20, 100], // Sample data for 2024
					"2023": [100, 130, 70, 180, 160, 100, 165, 77, 136, 46, 80, 50], // Sample data for 2023
					"2022": [90, 120, 60, 160, 140, 50, 80, 110, 68, 30, 90, 160]   // Sample data for 2022
				};

				var selectedYear = "2024"; // Default year

				var options = {
					chart: { type: "bar", toolbar: false },
					series: [{ name: "Orders", data: chartData["2024"] }],
					xaxis: { categories: ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"] },
				}

				var chart = new ApexCharts(document.querySelector("#wctg-total-orders-chart"), options);

				chart.render();

				document.getElementById("totalOrderYearFilter").addEventListener("change", function() {
					var selectedYear = this.value;
					chart.updateSeries([{ name: "Orders", data: chartData[selectedYear] }]);
				});


				// Listen for year dropdown changes
				document.addEventListener("change", function(event) {
					if (event.target.id === "yearSelect") {
						selectedYear = event.target.value;
						chart.updateSeries([{ name: "Orders", data: chartData[selectedYear] }]);
					}
				});
            </script>
        </div>
		<?php
	}


	/**
	 * Create orders dashboard widget
	 */
	public function create_orders_widget(): void {
		if ( current_user_can( 'manage_options' ) ) {
			wp_add_dashboard_widget(
				'wctg_orders_dashboard_widget',                          // Widget slug.
				esc_html__( 'Orders Processed By WooCommerce Tokens Payment Gateway', 'woocommerce-tokens-payment-gateway' ), // Title.
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
					data: [30,40,35,50,39,60,70,91,125,100,98, 130]
				}],
				xaxis: {
					categories: ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"]
				}
			}

			var chart = new ApexCharts(document.querySelector("#wctg-orders-chart"), options);

			chart.render();
        </script>
		<?php
	}


	/**
	 *  Total Orders Processed Per Month
	 */
	public function create_total_orders_widget(): void {
		if ( current_user_can( 'manage_options' ) ) {
			wp_add_dashboard_widget(
				'wctg_total_orders_dashboard_widget',                          // Widget slug.
				esc_html__( 'Total Orders Processed Per Month (With Year Filter)', 'woocommerce-tokens-payment-gateway' ), // Title.
				array( $this, 'total_orders_dashboard_widget_render' )                    // Display function.
			);
		}
	}

	/**
	 * Create the function to output the content of Total Orders Dashboard Widget.
	 */
	function total_orders_dashboard_widget_render() {
		?>

        <div style="display: flex; align-items: center; justify-content: end;">
            <label for="totalOrderYearFilter" style="margin-right: 10px;">Select Year:</label>
            <select id="totalOrderYearFilter" style="border-radius: 5px;">
                <option value="2025" selected>2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
            </select>
        </div>

        <div id="wctg-total-orders-chart">
        </div>

        <script>
			var chartData = {
				"2024": [120, 150, 90, 200, 180, 30, 150, 140, 125, 90, 20, 100], // Sample data for 2024
				"2023": [100, 130, 70, 180, 160, 100, 165, 77, 136, 46, 80, 50], // Sample data for 2023
				"2022": [90, 120, 60, 160, 140, 50, 80, 110, 68, 30, 90, 160]   // Sample data for 2022
			};

			var selectedYear = "2024"; // Default year

			var options = {
				chart: { type: "bar", toolbar: false },
				series: [{ name: "Orders", data: chartData["2024"] }],
				xaxis: { categories: ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"] },
			}

			var chart = new ApexCharts(document.querySelector("#wctg-total-orders-chart"), options);

			chart.render();

			document.getElementById("totalOrderYearFilter").addEventListener("change", function() {
				var selectedYear = this.value;
				chart.updateSeries([{ name: "Orders", data: chartData[selectedYear] }]);
			});


			// Listen for year dropdown changes
			document.addEventListener("change", function(event) {
				if (event.target.id === "yearSelect") {
					selectedYear = event.target.value;
					chart.updateSeries([{ name: "Orders", data: chartData[selectedYear] }]);
				}
			});
        </script>
		<?php
	}


	/**
	 *  Income Per Token Per Month (With Year Filter)
	 */
	public function create_income_per_token_widget(): void {
		if ( current_user_can( 'manage_options' ) ) {
			wp_add_dashboard_widget(
				'wctg_income_per_token_dashboard_widget',                          // Widget slug.
				esc_html__( 'Income Per Token Per Month (With Year Filter)', 'woocommerce-tokens-payment-gateway' ), // Title.
				array( $this, 'income_per_token_dashboard_widget_render' )                    // Display function.
			);
		}
	}

	/**
	 * Create the function to output the content of Income Per Token Dashboard Widget.
	 */
	function income_per_token_dashboard_widget_render() {
		?>

        <div style="display: flex; align-items: center; justify-content: end;">
            <label for="incomePerTokenYearFilter" style="margin-right: 10px;">Select Year:</label>
            <select id="incomePerTokenYearFilter" style="border-radius: 5px;">
                <option value="2025" selected>2025</option>
                <option value="2024">2024</option>
            </select>
        </div>

        <div id="wctg-income-per-token-chart">
        </div>

        <script>
			var incomeData = {
				"2024": {
					HBAR: [500, 600, 750, 800, 900, 400, 800, 600, 700, 250, 900, 640],
					SAUCE: [200, 300, 250, 400, 450, 500, 600, 750, 800, 900, 400, 550],
					USDC: [600, 700, 250, 900, 640, 300, 400, 350, 500, 550, 390, 870]
				},
				"2023": {
					HBAR: [450, 500, 700, 750, 850, 900, 640, 300, 400, 350, 500, 550],
					SAUCE: [180, 250, 230, 380, 420, 550, 390, 870, 200, 300, 250, 400],
					USDC: [280, 360, 330, 480, 530, 600, 750, 800, 900, 400, 800, 600]
				}
			};

			var incomeOptions = {
				chart: { type: "bar", stacked: true, toolbar: false },
				series: [
					{ name: "HBAR", data: incomeData["2024"].HBAR },
					{ name: "SAUCE", data: incomeData["2024"].SAUCE },
					{ name: "USDC", data: incomeData["2024"].USDC }
				],
				xaxis: { categories: ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"] }
			};

			var incomeChart = new ApexCharts(document.querySelector("#wctg-income-per-token-chart"), incomeOptions);
			incomeChart.render();

			document.getElementById("incomePerTokenYearFilter").addEventListener("change", function() {
				var selectedYear = this.value;
				console.log("selectedYear: ",selectedYear)
				incomeChart.updateSeries([
					{ name: "HBAR", data: incomeData[selectedYear].HBAR },
					{ name: "SAUCE", data: incomeData[selectedYear].SAUCE },
					{ name: "USDC", data: incomeData[selectedYear].USDC }
				]);
			});
        </script>
		<?php
	}


	/**
	 *  Income Per Token Per Month (With Year Filter) - Variant 2 Pie Chart
	 */
	public function create_income_per_token_widget_2(): void {
		if ( current_user_can( 'manage_options' ) ) {
			wp_add_dashboard_widget(
				'wctg_income_per_token_dashboard_widget_2',                          // Widget slug.
				esc_html__( 'Total Income Per Token (With Year Filter)', 'woocommerce-tokens-payment-gateway' ), // Title.
				array( $this, 'income_per_token_dashboard_widget_render_2' )                    // Display function.
			);
		}
	}

	/**
	 * Create the function to output the content of Income Per Token Dashboard Widget. - Variant 2 Pie Chart
	 */
	function income_per_token_dashboard_widget_render_2() {
		?>

        <div style="display: flex; align-items: center; justify-content: end;">
            <label for="incomePerTokenYearFilter2" style="margin-right: 10px;">Select Year:</label>
            <select id="incomePerTokenYearFilter2" style="border-radius: 5px;">
                <option value="2025" selected>2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
            </select>
        </div>

        <div id="wctg-income-per-token-chart-2">
        </div>

        <script>
			var pieData = {
				"2024": { HBAR: 3850, SAUCE: 1600, USDC: 2100 },
				"2023": { HBAR: 3300, SAUCE: 1460, USDC: 1950 },
				"2022": { HBAR: 2900, SAUCE: 1280, USDC: 1800 }
			};

			function getPieSeries(year) {
				return Object.values(pieData[year]);
			}

			var pieOptions = {
				chart: { type: "pie", toolbar: false },
				series: getPieSeries("2024"),
				labels: ["HBAR", "SAUCE", "USDC"]
			};

			var incomeChart = new ApexCharts(document.querySelector("#wctg-income-per-token-chart-2"), pieOptions);
			incomeChart.render();

			document.getElementById("incomePerTokenYearFilter2").addEventListener("change", function() {
				var selectedYear = this.value;
				incomeChart.updateSeries(getPieSeries(selectedYear));
			});
        </script>
		<?php
	}

}