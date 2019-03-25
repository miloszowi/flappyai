const express = require("express"); 
const { FuseBox } = require("fuse-box");
const app = express();
const path = "public";

app.use(express.static(path));

app.listen(4444);

const fuse = FuseBox.init({
  homeDir: "src",
  output: "public/$name.js",
});

fuse.bundle("app").hmr({ reload: true }).watch().instructions("^ > App.ts");

fuse.run();
