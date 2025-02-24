import axios from "axios";

/**
 * Wrapper for AJAX Calls
 *
 * @link https://wordpress.stackexchange.com/a/284423
 *
 * @param form_data
 */
export async function makeAjaxCall( form_data ) {
    return await axios.post(
        window.wtpg_price_formatter_params.ajax_url,
        form_data,
    );
}