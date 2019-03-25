"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fuse_box_1 = require("fuse-box");
const app = express_1.default();
const path = "public";
app.use(express_1.default.static(path));
app.listen(4444);
const fuse = fuse_box_1.FuseBox.init({
    homeDir: "src",
    output: "../public/$name.js",
});
fuse.bundle("app").hmr({ reload: true }).watch().instructions("^ > App.js");
fuse.run();
