const path = require("path");

module.exports = {
    entry: "./src/gui/window.ts",

    output: {
        path: path.join(__dirname, "dev"),
        filename: "apollon.js"
    },

    resolve: {
        extensions: [".js", ".ts", ".tsx"]
    },

    module: {
        rules: [{ test: /\.tsx?/, use: "ts-loader" }]
    },

    devServer: {
        contentBase: path.join(__dirname, "dev"),
        port: 8000
    }
};
