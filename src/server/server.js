/**
 * To resolve the 'ERR_REQUIRE_ESM' error in cPanel when loading app.js,
 * follow the steps at https://stackoverflow.com/questions/74174516/node-js-cpanel-error-im-getting-an-error-err-require-esm-must-use-import
 *
 * If you get '/usr/bin/env: node: No such file or directory' error check out https://support.cpanel.net/hc/en-us/articles/360053317733-Adding-NodeJS-to-your-PATH
 */

import express from "express";
import bodyParser from "body-parser";
import path from "path";
import http from "https";
import https from "https";
import fs from "fs";
import axios from "axios";
import fetch from "node-fetch";
import request from "request";
import crypto from "crypto";
import cors from "cors";
import 'dotenv/config'

import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import sharp from 'sharp';
import { createCanvas, loadImage, registerFont  } from 'canvas';
import { S3Client, CreateBucketCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';

/**
 * Resolve 'ReferenceError: __dirname is not defined in ES module scope'
 * @link https://flaviocopes.com/fix-dirname-not-defined-es-module-scope/
 *
 * @type {string}
 * @private
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Hedera Tutorial
 */
import {
	AccountAllowanceApproveTransaction,
	AccountBalanceQuery,
	AccountId,
	Client, Hbar, HbarUnit,
	PrivateKey,
	TokenAssociateTransaction, Transaction,
	TransactionId, TransactionReceipt,
	TransferTransaction,
	NftId, TokenAllowance, TokenId
} from '@hashgraph/sdk';

// Bearer token access token secret
const accessTokenSecret = 'qxHSVy5Gs6gDkfd';
/**
 * Bearer token authentication middleware
 */
const authenticateJWT = (req, res, next) => {
	const authHeader = req.headers.authorization;

	if (authHeader) {
		const token = authHeader.split(' ')[1];

		jwt.verify(token, accessTokenSecret, (err, user) => {
			if (err) {
				return res.sendStatus(403);
			}

			next();
		});
	} else {
		res.sendStatus(401);
	}
};

let main_js_object = {
	treasury_account: jwt.decode( process.env.TREASURY_ACCOUNT, accessTokenSecret),
	treasury_account_private_key: jwt.decode( process.env.TREASURY_ACCOUNT_PRIVATE_KEY, accessTokenSecret),
};

let backblaze_credentials = {
	keyId: jwt.decode( process.env.BACKBLAZE_KEY_ID, accessTokenSecret),
	applicationKey: jwt.decode( process.env.BACKBLAZE_APPLICATION_KEY, accessTokenSecret),
	bucketId: '0ec37d115fd4b83a8f570d16',
}

const app = express();
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cors());

app.get("/", (req, res) =>{

});

/**
 * Bearer token generation
 */
app.get("/token", (req, res) =>{
	// Generate an access token
	const accessToken = jwt.sign({ bearer_token: true }, accessTokenSecret);

	res.json({
		accessToken
	});
});


/**
 * Encrypt Data
 */
app.post('/encrypt', async (req, res) => {
	try{
		// Data sent via post
		let data = req.body;

		// console.log( data );

		// Get the string being encrypted
		let string = data.string;

		// Encrypt the string
		let encrypted_string = jwt.sign( string, accessTokenSecret);

		// Return the encrypted value
		res.json({
			'success': 'true',
			'encrypted_string': encrypted_string
		});
	} catch (e) {
		res.json({
			'success': 'false',
			'message': 'An error has occurred'
		});
	}
})

/**
 * Decrypt Data
 */
app.post('/decrypt',  async (req, res) => {

	try{
		// Data sent via post
		let data = req.body;

		// console.log( data );

		// Get the string being decrypted
		let string = data.string;

		// Encrypt the string
		let decrypted_string = jwt.decode( string, accessTokenSecret);

		// Return the encrypted value
		res.json({
			'success': 'true',
			'decrypted_string': decrypted_string
		});

	} catch (e) {
		res.json({
			'success': 'false',
			'message': 'An error has occurred'
		});
	}

})

/*
app.get("/google-secret", async (req, res) => {
    // Instantiates a client
    const secretmanagerClient = new SecretManagerServiceClient();

    //Required. The resource name of the Secret google.cloud.secretmanager.v1.Secret, in the format `projects/* /secrets/*`.
    const name = '384140312879'

    const client = new SecretManagerServiceClient();
    const [version] = await client.accessSecretVersion({
       // name: `projects/${name}/secrets/secrets-prod/versions/latest`,
        name: 'projects/384140312879/secrets/hostfiti-secret/versions/1'
    });
    const responsePayload = version.payload.data.toString();
    let secrets = JSON.parse(responsePayload);


    res.send( secrets );
});
*/


/**
 * Transfer HBAR
 */
app.post('/transfer-hbar', authenticateJWT, async (req, res) => {
	// Data sent via post
	let data = req.body;

	console.log( data );

	/**
	 * Transaction Parameters
	 */
	let hbar_receiver_account = data.receiver_account;
	let hbar_sender_account = data.sender_account;
	let hbar_amount = data.hbar_amount;
	let memo = data.memo;

	const transactiondId = TransactionId.generate(hbar_sender_account);

	const tx = new TransferTransaction()
		.setTransactionMemo( memo )
		.addHbarTransfer(hbar_receiver_account, Hbar.from(hbar_amount, HbarUnit.Hbar))
		.addHbarTransfer(hbar_sender_account, Hbar.from(-hbar_amount, HbarUnit.Hbar))
		.setNodeAccountIds([new AccountId(3)])
		.setTransactionId(transactiondId)
		.freeze()

	const signed = await tx.sign(PrivateKey.fromString( main_js_object.treasury_account_private_key ) );
	const bytes = signed.toBytes()

	//return json(bytes);
	res.send( JSON.stringify( bytes ) );
})

/**
 * Transfer Token
 */
app.post('/transfer-token', authenticateJWT, async (req, res) => {
	// Data sent via post
	let data = req.body;

	/**
	 * Transaction Parameters
	 */
	let token_receiver_account = data.receiver_account;
	let token_id = data.token_id;
	let token_amount = data.token_amount;
	let token_sender_account = data.sender_account;
	let decimals = data.decimals;
	let memo = data.memo;

	const transactiondId = TransactionId.generate( token_sender_account );

	const tx = new TransferTransaction()
		.setTransactionMemo( memo )
		// Deduct token from sender account
		.addTokenTransferWithDecimals( token_id, token_sender_account, - token_amount, decimals )
		// Add token to receiver account
		.addTokenTransferWithDecimals( token_id, token_receiver_account, token_amount, decimals )
		.setNodeAccountIds([new AccountId(3)])
		.setTransactionId(transactiondId)
		.freeze()

	const signed = await tx.sign(PrivateKey.fromString( main_js_object.treasury_account_private_key ) );
	const bytes = signed.toBytes()

	//return json(bytes);
	res.send( JSON.stringify( bytes ) );
})

/**
 * Transfer NFTs
 */
app.post('/transfer-nfts', authenticateJWT, async (req, res) => {
	try{
		// Data sent via post
		let data = req.body;

		// Network
		let hedera_network = data.hedera_network;

		/**
		 * Transaction Parameters
		 */
		let nft_sender_account = main_js_object.treasury_account;
		let nft_receiver_account = data.receiver_account;
		let token_id = data.token_id;
		let serial_number = data.serial_number;

		/**
		 * Hedera Client
		 */
		const TREASURY_ACCOUNT_ID = AccountId.fromString( nft_sender_account );
		const TREASURY_ACCOUNT_PRIVATE_KEY = PrivateKey.fromString( main_js_object.treasury_account_private_key );

		/*
		 * Pre-configured client for network
		 */
		let client = Client.forTestnet();
		// Mainnet
		if( hedera_network === 'mainnet' ){
			client = Client.forMainnet()
		}

		// Previewnet
		if( hedera_network === 'previewnet' ){
			client = Client.forPreviewnet()
		}

		//Set the operator with the account ID and private key
		client.setOperator(TREASURY_ACCOUNT_ID, TREASURY_ACCOUNT_PRIVATE_KEY);

		const tokenTransferTx = await new TransferTransaction()
			.addNftTransfer(token_id, serial_number, nft_sender_account, nft_receiver_account )
			.freezeWith( client )
			.sign( TREASURY_ACCOUNT_PRIVATE_KEY );

		const tokenTransferSubmit = await tokenTransferTx.execute( client );
		const tokenTransferRx = await tokenTransferSubmit.getReceipt( client );

		console.log(`\n- NFT transfer from treasury wallet to receiver wallet: ${ tokenTransferRx.status } \n`);

		// Write to file
		fs.writeFileSync( __dirname + '/logs/debug.log', 'NFT transfer from treasury wallet to receiver wallet: ' );
		fs.writeFileSync( __dirname + '/logs/debug.log', tokenTransferRx.status );

		console.log( tokenTransferRx.status.toString() );
		if( tokenTransferRx.status.toString() === 'SUCCESS' ){
			console.log('Success transferring NFTs');

			// Write to file
			fs.writeFileSync( __dirname + '/logs/debug.log', 'Success transferring NFTs' );

			res.send( JSON.stringify( { "success" : "true", "message" : "Success transferring NFTs", "status" : tokenTransferRx.status } ) );

		} else {
			console.log('Error transferring NFTs');

			// Write to file
			fs.writeFileSync( __dirname + '/logs/debug.log', 'Error transferring NFTs' );

			res.send( JSON.stringify( { "success" : "false", "message" : "Error transferring NFTs", "status" : tokenTransferRx.status } ) );
		}

	} catch (e) {
		// Write to file
		fs.writeFileSync( __dirname + '/logs/debug.log', 'An error occurred when transferring the NFTs. The error: ' );
		fs.writeFileSync( __dirname + '/logs/debug.log', e.message );

		res.send( JSON.stringify( { "success" : "false", "message" : "An error occurred when transferring the NFTs", "error" : e.message } ) );
	}

	// Write to file
	fs.writeFileSync( __dirname + '/logs/debug.log', 'An error occurred when transferring the NFTs' );
	//res.send( JSON.stringify( { "success" : "false", "message" : "An error occurred when transferring the NFTs" } ) );

})

/**
 * Transfer Token and NFTs
 */
app.post('/transfer-token-and-nfts', authenticateJWT, async (req, res) => {
	// Data sent via post
	let data = req.body;

	/**
	 * Token Transaction Parameters
	 */
	let token_receiver_account = data.receiver_account;
	let token_id = data.token_id;
	let token_amount = data.token_amount;
	let token_sender_account = data.sender_account;
	let decimals = data.decimals;
	let memo = data.memo;

	// Network
	let hedera_network = data.hedera_network;

	const transactiondId = TransactionId.generate( token_sender_account );

	/*
	 * Create Basic Transaction
	 */
	const tx = new TransferTransaction()
		.setTransactionMemo( memo );

	/*
	 * Create Token Transaction
	 */
	tx.addTokenTransferWithDecimals( token_id, token_sender_account, - token_amount, decimals ) // Deduct token from sender account
		.addTokenTransferWithDecimals( token_id, token_receiver_account, token_amount, decimals ) // Add token to receiver account
	//.setNodeAccountIds([new AccountId(3)])
	//.setTransactionId(transactiondId)

	/**
	 * NFT Transaction Parameters
	 */
	let nft_sender_account = main_js_object.treasury_account;
	// Get NFTs from array
	let nfts = data.nfts;
	nfts.forEach( function ( item, index, arr ) {
		let nft_receiver_account = item.nft_receiver_account;
		let nft_token_id = item.nft_token_id;
		let nft_serial_number = item.nft_serial_number;
		let nft_owner_id = item.nft_owner_id;

		/**
		 * Manipulate the NFT
		 */
		let raw = nft_token_id.split('.');
		let tokenId = new TokenId(parseInt(raw[0]), parseInt(raw[1]), parseInt(raw[2]));
		let nftId = new NftId(tokenId, nft_serial_number );

		/*
		 * Create NFT Transaction
		 */
		// Check if the treasury account owns the NFT or if not, if they are a spender
		if( nft_owner_id === '' ){
			tx.addNftTransfer( nft_token_id, nft_serial_number, nft_sender_account, nft_receiver_account )
		} else {
			tx.addApprovedNftTransfer( nftId, nft_owner_id, nft_receiver_account );
		}

	});


	/**
	 * Hedera Client
	 */
	let TREASURY_ACCOUNT_ID = AccountId.fromString( main_js_object.treasury_account );
	let TREASURY_ACCOUNT_PRIVATE_KEY = PrivateKey.fromString( main_js_object.treasury_account_private_key );

	let client = Client.forTestnet();
	// Mainnet
	if( hedera_network === 'mainnet' ){
		client = Client.forMainnet()
	}

	// Previewnet
	if( hedera_network === 'previewnet' ){
		client = Client.forPreviewnet()
	}

	//Set the operator with the account ID and private key
	client.setOperator(TREASURY_ACCOUNT_ID, TREASURY_ACCOUNT_PRIVATE_KEY);


	/**
	 * Freeze Transaction
	 */
	tx.freezeWith( client );


	/**
	 * Sign the Transaction
	 *
	 * @type {*}
	 */
	const signed = await tx.sign(PrivateKey.fromString( main_js_object.treasury_account_private_key ) );
	const bytes = signed.toBytes()

	//return json(bytes);
	res.send( JSON.stringify( bytes ) );
})

/**
 * Transfer HBAR and NFTs
 */
app.post('/transfer-hbar-and-nfts', authenticateJWT, async (req, res) => {
	// Data sent via post
	let data = req.body;

	/**
	 * HBAR Transaction Parameters
	 */
	let hbar_receiver_account = data.receiver_account;
	let hbar_sender_account = data.sender_account;
	let hbar_amount = data.hbar_amount;
	let memo = data.memo;
	let hedera_network = data.hedera_network;

	const transactiondId = TransactionId.generate( hbar_sender_account );

	/*
	 * Create Basic Transaction
	 */
	const tx = new TransferTransaction()
		.setTransactionMemo( memo );

	/*
	 * Create HBAR Transaction
	 */
	tx.addHbarTransfer(hbar_receiver_account, Hbar.from(hbar_amount, HbarUnit.Hbar))
		.addHbarTransfer(hbar_sender_account, Hbar.from(-hbar_amount, HbarUnit.Hbar))
	//.setNodeAccountIds([new AccountId(3)])
	//.setTransactionId(transactiondId)

	/**
	 * NFT Transaction Parameters
	 */
	let nft_sender_account = main_js_object.treasury_account;
	// Get NFTs from array
	let nfts = data.nfts;
	nfts.forEach( function ( item, index, arr ) {
		let nft_receiver_account = item.nft_receiver_account;
		let nft_token_id = item.nft_token_id;
		let nft_serial_number = item.nft_serial_number;
		let nft_owner_id = item.nft_owner_id;

		/**
		 * Manipulate the NFT
		 */
		let raw = nft_token_id.split('.');
		let tokenId = new TokenId(parseInt(raw[0]), parseInt(raw[1]), parseInt(raw[2]));
		let nftId = new NftId(tokenId, nft_serial_number );

		/*
		 * Create NFT Transaction
		 */
		// Check if the treasury account owns the NFT or if not, if they are a spender
		if( nft_owner_id === '' ){
			tx.addNftTransfer( nft_token_id, nft_serial_number, nft_sender_account, nft_receiver_account )
		} else {
			tx.addApprovedNftTransfer( nftId, nft_owner_id, nft_receiver_account );
		}
	});

	/**
	 * Hedera Client
	 */
	let TREASURY_ACCOUNT_ID = AccountId.fromString( main_js_object.treasury_account );
	let TREASURY_ACCOUNT_PRIVATE_KEY = PrivateKey.fromString( main_js_object.treasury_account_private_key );

	let client = Client.forTestnet();
	// Mainnet
	if( hedera_network === 'mainnet' ){
		client = Client.forMainnet()
	}

	// Previewnet
	if( hedera_network === 'previewnet' ){
		client = Client.forPreviewnet()
	}

	//Set the operator with the account ID and private key
	client.setOperator(TREASURY_ACCOUNT_ID, TREASURY_ACCOUNT_PRIVATE_KEY);


	/**
	 * Freeze Transaction
	 */
	tx.freezeWith( client );


	/**
	 * Sign the Transaction
	 *
	 * @type {*}
	 */
	const signed = await tx.sign(PrivateKey.fromString( main_js_object.treasury_account_private_key ) );
	const bytes = signed.toBytes()

	//return json(bytes);
	res.send( JSON.stringify( bytes ) );
})

/**
 * Allowance Approval
 */
app.post('/allowance-approval', authenticateJWT, async (req, res) => {
	// Data sent via post
	let data = req.body;

	/**
	 * Allowance Approval Transaction Parameters
	 */
	let nft = data.nft; // Should be in the form of  {'tokenId': '', 'serial': ''} i.e. json
	let nft_owner_id = data.nft_owner_id;
	let nft_spender_id = data.nft_spender_id;

	/**
	 * Manipulate the NFT
	 */
	let raw = nft.tokenId.split('.');
	let tokenId = new TokenId(parseInt(raw[0]), parseInt(raw[1]), parseInt(raw[2]));
	let nftId = new NftId(tokenId, nft.serial);

	/*
	 * Create Basic Transaction
	 */
	const trans = new AccountAllowanceApproveTransaction();
	trans.approveTokenNftAllowance( nftId, nft_owner_id, nft_spender_id);

	/**
	 * Sign the Transaction
	 *
	 * @type {*}
	 */
	const bytes = await makeBytes( trans, nft_owner_id );

	//return json(bytes);
	res.send( JSON.stringify( bytes ) );
})

/**
 * Refund Token
 */
app.post('/refund-tokens', authenticateJWT, async (req, res) => {
	// Data sent via post
	let data = req.body;

	/**
	 * Transaction Parameters
	 */
	let token_receiver_account = data.receiver_account;
	let token_id = data.token_id;
	let token_amount = data.token_amount;
	let token_sender_account = data.sender_account;
	let memo = data.memo;

	const transactiondId = TransactionId.generate( token_sender_account );

	const tx = new TransferTransaction()
		.setTransactionMemo( memo )
		// Deduct token from sender account
		.addTokenTransfer( token_id, token_sender_account, - token_amount )
		// Add token to receiver account
		.addTokenTransfer( token_id, token_receiver_account, token_amount )
		.setNodeAccountIds([new AccountId(3)])
		.setTransactionId(transactiondId)
		.freeze()



})

/**
 * Manipulate Image
 */
app.post('/manipulate-image', authenticateJWT, async (req, res) => {

	// Data sent via post
	let data = req.body;

	console.log( data );

	const inputImageUrl = data.image;
	const originalFileName = data.original_name;
	const currentFileName = data.current_name;
	const text = data.text;
	const update_image = data.update_image;

	if( update_image === 'true' ){
		// Download Image and add text
		await downloadImageAndAddText(inputImageUrl, '', text, currentFileName, originalFileName );
	}

	//return json(bytes);
	res.send( JSON.stringify( { success: 'true' } ) );
})

/**
 * Download image from URL
 *
 * @param imageURL
 * @param dirPath
 * @param text
 * @param text
 * @param originalFileName
 * @param currentFileName
 * @param originalFileName
 * @returns {Promise<void>}
 */
async function downloadImageAndAddText(imageURL, dirPath, text, currentFileName, originalFileName) {
	// Create the directory if it does not exist
	//if (!fs.existsSync(dirPath)) {
	// fs.mkdirSync(dirPath);
	//}


	// Use fetch to get the image data as a buffer
	const file = fs.createWriteStream(originalFileName);

	https.get(imageURL, response => {
		response.pipe(file);

		file.on('finish', async () => {
			file.close();
			console.log(`Image downloaded as ${originalFileName}`);

			const inputImagePath = originalFileName;
			const outputImagePath = currentFileName;
			const fontSize = text.length < 10 ? 100 : 90;
			const color = '#1e616e';
			const fontPath = 'Bridgestom.ttf';

			await addTextToImage(inputImagePath, outputImagePath, text, fontSize, color, fontPath);

			await updateBackblazeImage(outputImagePath, originalFileName);
		});
	}).on('error', err => {
		fs.unlink(originalFileName);
		console.error(`Error downloading image: ${err.message}`);
	});
}

/**
 * Add text to image
 *
 * @param inputImagePath
 * @param outputImagePath
 * @param text
 * @param fontSize
 * @param color
 * @param fontPath
 * @returns {Promise<void>}
 */
async function addTextToImage(inputImagePath, outputImagePath, text, fontSize, color, fontPath ) {
	try {
		console.log( inputImagePath );
		console.log( outputImagePath );
		// Load the custom font
		registerFont(fontPath, { family: 'CustomFont' });

		// Load the image
		const image = await loadImage(inputImagePath);

		// Create a canvas with the same dimensions as the image
		const canvas = createCanvas(image.width, image.height);
		const ctx = canvas.getContext('2d');

		// Draw the image onto the canvas
		ctx.drawImage(image, 0, 0, image.width, image.height);

		// Add text to the canvas
		ctx.font = `${fontSize}px CustomFont`;
		ctx.fillStyle = color;

		// Center align text horizontally
		const textWidth = ctx.measureText(text).width;
		const x = (canvas.width - textWidth) / 2;
		// const y = (canvas.height+150) / 2;

		ctx.fillText(text, x, 680);

		// Save the modified image
		await sharp(canvas.toBuffer())
			.toFile(outputImagePath);

		console.log(`Text added to image. Output saved to: ${outputImagePath}`);
	} catch (error) {
		console.error('Error adding text to image:', error);
	}
}

async function updateBackblazeImage( outputImagePath, originalFileName )
{
	const accountId = '002e3d1f48af7d60000000009';
	const applicationKey = 'K0026vqbOjFLgNCZoHlycWnEiykYhYQ';
	let credentials;
	const encodedBase64 = new Buffer(accountId + ':' + applicationKey).toString('base64');

	/**
	 * Authenticate backblaze
	 *
	 * @type {string}
	 */
	axios.post('https://api.backblazeb2.com/b2api/v1/b2_authorize_account',
		{},
		{
			headers: { Authorization: 'Basic ' + encodedBase64 }
		})
		.then(function (response) {
			const data = response.data;
			credentials = {
				accountId: backblaze_credentials.keyId,
				applicationKey: backblaze_credentials.applicationKey,
				apiUrl: data.apiUrl,
				authorizationToken: data.authorizationToken,
				downloadUrl: data.downloadUrl,
				recommendedPartSize: data.recommendedPartSize
			}
			console.log(credentials);

			/**
			 * Upload File
			 */
			var bucketId = backblaze_credentials.bucketId;
			var filePath = outputImagePath; // e.g image.png
			var stats = fs.statSync( filePath );
			var fileSizeInBytes = stats.size;

			axios.post(
				credentials.apiUrl + '/b2api/v1/b2_get_upload_url',
				{
					bucketId: bucketId
				},
				{ headers: { Authorization: credentials.authorizationToken } })
				.then(function (response) {
					var uploadUrl = response.data.uploadUrl;
					var uploadAuthorizationToken = response.data.authorizationToken;
					var source = fs.readFileSync(filePath)
					var fileName = path.basename(filePath)

					var sha1 = crypto.createHash('sha1').update(source).digest("hex");

					axios.post(
						uploadUrl,
						source,
						{
							headers: {
								Authorization: uploadAuthorizationToken,
								"X-Bz-File-Name": 'holidaynft/' + fileName,
								"Content-Type": "b2/x-auto",
								"Content-Length": fileSizeInBytes,
								"X-Bz-Content-Sha1": sha1,
								"X-Bz-Info-Author": "unknown"
							}
						}
					).then(function (response) {
						console.log('Uploaded Successfully'); // successful response

						// Delete Files
						fs.unlinkSync(outputImagePath);
						fs.unlinkSync(originalFileName);
					}).catch(function (err) {
						console.log(err); // an error occurred
					});
				})
				.catch(function (err) {
					console.log(err); // an error occurred
				});
		})
		.catch(function (err) {
			console.log(err);  // an error occurred
		});


}

async function makeBytes(trans, signingAcctId) {
	let transId = TransactionId.generate(signingAcctId)
	trans.setTransactionId(transId);
	trans.setNodeAccountIds([new AccountId(3)]);

	await trans.freeze();

	return trans.toBytes();
}


const options = {
	//key: fs.readFileSync(__dirname + "/crt/server.key"),                  //Change Private Key Path here
	//cert: fs.readFileSync(__dirname + "/crt/server.crt"),            //Change Main Certificate Path here
	//ca: fs.readFileSync(__dirname + "/crt/intermediate.crt'),             //Change Intermediate Certificate Path here
};

/*
https.createServer(options, app)
    .listen(3500, '0.0.0.0', function (req, res) {                        //Change Port Number here (if required, 443 is the standard port for https)
        console.log("Server 0.0.0.0 started at port 3500");                //and here
    });
*/

const port = 3500;
app.listen(port, () => {
	console.log(`Example app listening on port ${port}`)
})