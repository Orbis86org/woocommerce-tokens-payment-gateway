import { v4wp } from '@kucrut/vite-for-wp';

export default {
	plugins: [
		v4wp( {
			input: 'src/index.tsx', // Optional, defaults to 'src/main.js'.
			outDir: 'build', // Optional, defaults to 'dist'.
		} ),
	],
};