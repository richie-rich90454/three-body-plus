import {defineConfig} from "vite";
import {readFileSync} from "fs";
import {join} from "path";

let packageJson=JSON.parse(readFileSync(join(__dirname,"package.json"),"utf-8"));
let version=packageJson.version;

export default defineConfig({
	root: ".",
	publicDir: "public",
	build: {
		outDir: "dist",
		emptyOutDir: true,
		assetsDir: "assets",
		minify: "oxc",
		target: "es6",
		cssMinify: true,
		chunkSizeWarningLimit: 1000,
		sourcemap: false,
		treeshake: true,
		cssCodeSplit: true,
		rolldownOptions: {
			output: {
				codeSplitting: true,
				manualChunks(id){
					if (id.includes("node_modules")){
						if (id.includes("three")){
							return "vendor-three";
						}
						if (id.includes("stats-js")){
							return "vendor-stats";
						}
						let parts=id.split("node_modules/")[1].split("/");
						let topLevel=parts[0];
						if (topLevel.startsWith("@")){
							let scoped=`${topLevel}/${parts[1]}`;
							return `vendor-${scoped.replace("@","")}`;
						}
						return "vendor-other";
					}
				},
				chunkFileNames: "assets/[hash:8].js",
				entryFileNames: "assets/[name].[hash:8].js",
			}
		},
		rollupOptions: {
			output: {
				manualChunks: {
					three: ["three"],
					"three-addons": ["three/examples/jsm/controls/OrbitControls.js"],
					stats: ["stats-js"]
				}
			}
		}
	},
	plugins: [
		{
			name: "inject-version",
			transformIndexHtml(html){
				return html.replace(/__APP_VERSION__/g, version);
			}
		}
	],
	server: {
		host: "::",
		port: 5173,
		open: false,
		optimizeDeps: {
			include: ["three", "three/examples/jsm/controls/OrbitControls.js", "stats-js"],
			exclude: []
		}
	},
	preview: {
		host: "::",
		port: 4173,
		open: false
	},
	cacheDir: ".vite-cache",
	esbuild: {
		minifyIdentifiers: true,
		minifySyntax: true,
		drop: ["debugger"]
	}
});