export default {
    ignoreFiles: [
        "**/*",
        "!./manifest.json",
        "!./content-script.js",
        "!./dist",
        "!./dist/**",
        "!./static",
        "!./static/**",
    ],
    build: {
        overwriteDest: true,
    },
    artifactsDir: "web-ext-artifacts"
};