const esbuild = require("esbuild");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/** @type {import('esbuild').BuildOptions} */
const sharedOptions = {
  entryPoints: ["src/surround.ts"],
  bundle: true,
  minify: production,
  sourcemap: !production,
  external: ["vscode"],
};

async function main() {
  const contexts = await Promise.all([
    // Desktop (Node.js) bundle
    esbuild.context({
      ...sharedOptions,
      platform: "node",
      outfile: "out/surround.js",
      format: "cjs",
    }),
    // Browser (web worker) bundle
    esbuild.context({
      ...sharedOptions,
      platform: "browser",
      outfile: "out/surround.web.js",
      format: "cjs",
      define: {
        "process.env.HOME": '""',
        "process.env.USERPROFILE": '""',
      },
    }),
  ]);

  if (watch) {
    await Promise.all(contexts.map((ctx) => ctx.watch()));
    console.log("Watching for changes...");
  } else {
    await Promise.all(contexts.map((ctx) => ctx.rebuild()));
    await Promise.all(contexts.map((ctx) => ctx.dispose()));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
