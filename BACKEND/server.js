const express = require("express");
const cors = require("cors");
const mysql = require("mysql");

const app = express();

app.use(cors());

app.get("/",(req,res) => {
    res.json("Hello from backend");
})

app.listen(8081, () => {
    console.log("listening to 8081");
    // run command "node server.js" to start the server
})
