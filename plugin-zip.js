/**
 * Zips the plugin for production, including the associated backend (PHP) files.
 *
 * Source maps can be used to read the original code, so we remove them first using the rimraf pacakge
 * @see https://dev.to/raphaelbadia/how-i-read-react-websites-unminified-source-code-through-source-maps-3j9o
 */
import zl  from "zip-lib";
import { rimrafSync } from 'rimraf';

export const pluginZip = () => {
	/**
	 * Remove source maps
	 */
	// rimrafSync('build/**/*.map', { glob: true });

	const zip = new zl.Zip();

	const plugin_folder_name = 'woocommerce-tokens-payment-gateway/';

	/**
	 * Setup the root files
	 */
	const root_files = [
		'constants.php',
		'woocommerce-tokens-payment-gateway.php'
	]

	/**
	 * Setup root folders
	 */
	const root_folders = [
		'assets',
		'build',
		'includes',
		'dependencies',
		'views'
	]

	/**
	 * Zip the files
	 */
	root_files.forEach( function( item, index, array ){
		let folder = plugin_folder_name + item;
		zip.addFile( item, folder );
	} );

	/**
	 * Zip the folders
	 */
	root_folders.forEach( function( item, index, array ){
		let folder = plugin_folder_name + item;
		zip.addFolder( item, folder );
	} );

	/**
	 * Generate archive zip file
	 */
	zip.archive('woocommerce-tokens-payment-gateway.zip').then(function () {
		console.log('Plugin zipped successfully.');
	}, function (err) {
		console.log(err);
	});

}
