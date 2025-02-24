<?php
/**
 * Token settings template
 */

// Enqueue Repeater Script
wp_enqueue_script('woocommerce-tokens-payment-gateway-jquery-repeater');

?>

<div class="repeat">
	<table class="wrapper" width="100%">
		<thead>
		<tr>
			<td width="10%" colspan="4"><span class="add">Add</span></td>
		</tr>
		</thead>
		<tbody class="container">
		<tr class="template row">
			<td width="10%">
				<span class="move">Move Row</span>
				<span class="move-up">Move Up</span>
				<input type="text" class="move-steps" value="1" />
				<span class="move-down">Move Down</span>
			</td>

			<td width="10%">An Input Field</td>

			<td width="70%">
				<input type="text" name="an-input-field[{{row-count-placeholder}}]" />
			</td>

			<td width="10%"><span class="remove">Remove</span></td>
		</tr>
		</tbody>
	</table>
</div>

<script>
    jQuery(function() {
        jQuery('.repeat').each(function() {
            jQuery(this).repeatable_fields();
        });
    });
</script>
