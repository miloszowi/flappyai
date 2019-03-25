import express from "express";
import { FuseBox } from "fuse-box";
const app = express();
const path: string = "public";

app.use(express.static(path));

app.listen(4444);

const fuse: FuseBox = FuseBox.init({
  homeDir: "src",
  output: "../public/$name.js",
});

fuse.bundle("app").hmr({ reload: true }).watch().instructions("^ > App.js");

fuse.run();
