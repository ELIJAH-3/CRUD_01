const express = require("express");
const cors = require("cors");
const mysql = require("mysql");
const winston = require('winston'); // Structured logging library
const app = express();

app.use(express.json());
app.use(cors());
let db;
let retryCount = 0;
const maxRetries = 5; // Set the maximum number of retries

// Custom format to include both timestamp, filename, and the message
const customFormat = winston.format.printf(({ level, message, timestamp, filename }) => {
    const formattedTimestamp = new Date(timestamp).toLocaleString();
    return `[${formattedTimestamp}] ${filename} ${message}`;
});

const log = winston.createLogger({
    levels: winston.config.npm.levels, // Use the predefined NPM log levels
    level: 'info', // Default log level
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format((info) => {
            info.filename = info.filename || 'unknown_file';
            return info;
        })(),
        customFormat
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'app.log' })
    ]
});

// Wrapper function to log messages with filename
const logWithFile = (level, message, filename) => {
    logger.log({ level, message, filename });
};

function connectToDatabase() {
    db = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "crud01",
    });

    db.connect(err => {
        if (err) {
            log.error(` server.js Error connecting to MySQL`, err);
            if (err.code === 'ER_BAD_DB_ERROR')
                log.error("Specified Database does not exit.")
            retryCount++;
            if (retryCount < maxRetries) {
                console.log(`[${new Date().toLocaleString()}] server.js Retrying connection in 5 seconds... (Attempt ${retryCount} of ${maxRetries})`);
                setTimeout(connectToDatabase, 5000); // Retry connection after 5 seconds
            } else {
                console.error(`[${new Date().toLocaleString()}] Maximum retry Attempt = ${maxRetries} reached. Could not connect to MySQL.`);
                // process.exit(1);
            }
        } else {
            retryCount = 0;
            console.log(`[${new Date().toLocaleString()}] Connected to MySQL server.`);
        }
    });

    db.on('error', err => {
        console.error(`[${new Date().toLocaleString()}] MySQL error:`, err.message);
        if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
            console.error(`[${new Date().toLocaleString()}] server.js Connection Lost with SQL SERVER. ERROR CODE=`, err.code);
            console.log(`[${new Date().toLocaleString()}] Attempting to reconnect to MySQL server...`);
            connectToDatabase();
        } else {
            console.error(`[${new Date().toLocaleString()}] server.js UNKNOWN ERROR`);
            throw err;
        }
    });
};

connectToDatabase();

let isDebugEnabled = true;


app.get("/", (req, res) => {
    const sqlQueryString = "SELECT * from student order by id desc";
    console.log(`[${new Date().toLocaleString()}] server.js Querying all Students.`);
    if (db.state !== 'connected') {
        console.log(`[${new Date().toLocaleString()}] server.js Database not connected.`);
        return res.status(500).json({ error: "Database not connected" });
    }
    db.query(sqlQueryString, (err, data) => {
        if (err) return res.json(err);
        if (isDebugEnabled) {
            console.log(`[${new Date().toLocaleString()}] server.js Query:`, sqlQueryString);
            data.forEach(elements => {
                console.log(`[${new Date().toLocaleString()}] server.js Result:`, elements);
            });
            console.log();
        }
        return res.json(data); // sends Response
    })
    // res.json("Hello from backend");
})

app.post('/createNewStudent', (req, res) => {
    console.log(`[${new Date().toLocaleString()}] server.js Entered Create New Student with name=` + req.body.name + ", email=" + req.body.email);
    const sqlQueryString = "INSERT INTO student (`NAME`, `EMAIL`) VALUES (?)";
    const values = [
        req.body.name,
        req.body.email
    ]
    db.query(sqlQueryString, [values], (err, data) => {
        if (err) return res.json(err);
        return res.json(data);
    })
    // res.json("Hello from backend");
})

app.post('/runsqlquery', (req, res) => {
    console.log(`[${new Date().toLocaleString()}] server.js ` + ", queryString=" + req.body.queryString);
    const sqlQueryString = req.body.queryString;

    db.query(sqlQueryString, (err, data) => {
        if (err) {
            console.log(`[${new Date().toLocaleString()}] server.js error while executing query: `, req.body.queryString);
            console.log(`[${new Date().toLocaleString()}] server.js ERROR: `, err.message);
            return res.json(err)
        };

        if (isDebugEnabled) {
            console.log(`[${new Date().toLocaleString()}] server.js Query:`, sqlQueryString);
            console.log(`[${new Date().toLocaleString()}] server.js Result:`, data);
        }
        return res.json(data); // sends Response
    })

    // res.json("Hello from backend");
})

app.listen(8081, () => {
    console.log(`[${new Date().toLocaleString()}] server.js listening to 8081`);
    // run command "node server.js" to start the server
})