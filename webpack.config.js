const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const path = require("path");

const package = require("./package");
const widgetName = package.widgetName;

module.exports = {
    entry: {
        [widgetName]: [ `./src/${widgetName}/widget/${widgetName}.js` ],
    },
    output: {
        path: path.resolve(__dirname, "dist/tmp/src"),
        filename: `${widgetName}/widget/[name].js`,
        chunkFilename: `${widgetName}/widget/${widgetName}[id].js`,
        libraryTarget: "amd",
        publicPath: "widgets/"
    },
    mode: "production",
    devtool: false,
    externals: [ /^mxui\/|^mendix\/|^dojo\/|^dijit\// ],
    plugins: [
        new webpack.LoaderOptionsPlugin({ debug: true }),
        new MiniCssExtractPlugin({
            filename: `./${widgetName}/widget/ui/${widgetName}.css`
        }),
        new CopyWebpackPlugin({patterns: [{ context: "src", from: "**/*.xml" }, { context: "src", from: "**/*.html" }]})
    ],
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: [MiniCssExtractPlugin.loader, "css-loader"],
            }
        ]
    }
};
