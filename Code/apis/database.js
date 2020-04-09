exports.queryDB = queryDB;
exports.insertDB = insertDB;
exports.readDB = readDB;
exports.updateDB = updateDB;
exports.handleDBErrors = handleDBErrors;
exports.handleDBErrorsNew = handleDBErrorsNew;
var email = require("./../apis/email");
var cldashes = "-------------------------------------------------------------------";


function insertDB(insertInto, values) {
    var queryString = 'INSERT INTO ' + insertInto + ' VALUES ' + values;
    console.log(queryString);
    return queryString;
}

function readDB(select, from, where) {
    var queryString = 'SELECT ' + select + ' FROM ' + from + ' WHERE ' + where;
    console.log(queryString);
    return queryString;
}

function updateDB(update, setString, where) {
    var queryString = 'UPDATE ' + update + ' SET ' + setString + ' WHERE ' + where;
    console.log(queryString);
    return queryString;
}




// This simply queries a database with whatever query you give it.
// Database configuration (URL, password, etc) is all in environment variables, so you should be able to query any MySQL database with this code by changing those variables.
async function queryDB(dbString) {
    console.log("DB Query");
    var mysql = require('mysql');

    var dbConfig = {
        host: process.env.dbHost,
        database: process.env.dbName,
        user: process.env.dbUser,
        password: process.env.dbPassword,
        port: '3306'
    };

    var connection = await mysql.createConnection(dbConfig);

    var connectionResult = await new Promise(function (resolve, reject) {
        connection.query(dbString, function (error, results, fields) {
            if (error) {
                console.log(error);
                reject(Error(error));
            }
            else {
                console.log('----Query string submitted is: ' + dbString);
                resolve(results);
            }
        });
    });

    connection.destroy();

    // connection.end(function(err) { console.log("Database connection end error is " + err) });
    // It seems that adding { timeout: 1 } as an argument to the function(err) will trigger the same weird error you were having before you added function(err), but
    // somehow, having a function(err) allows the show to go on no matter what the timeout is, while not having that function(err) will randomly crash the whole thing,
    // and will consistently crash the whole thing if a timeout of 1 is included.
    // If that didn't make sense:
    // connection.end() : this will randomly crash everything
    // connection.end({timeout : 1}) : this will consistently crash everything
    // connection.end(function(err) {...}) : after some testing, it appears that this will never crash anything
    // connection.end({ timeout : 1} , function(err) {...}) : after some testing, it appears that this will never crash anything. function(err) always saves the day.

    return connectionResult;
}


async function handleDBErrors(transactionDataObject, error, queryString) {
    console.log(cldashes);
    console.log("Database connection error:\n", error);
    await email.sendEmail("Your database could not be connected to for the " + transactionDataObject.MessageType + " of transaction " + transactionDataObject.transactionID + ".\n\n Here's the MySQL query: \n" + queryString + "\n\nHere's the error:\n" + error + "\n\nHere's the transaction data object\n" + JSON.stringify(transactionDataObject));
    return;
}


async function handleDBErrorsNew(errorMessage, error) {
    console.log(cldashes);
    console.log("Database connection error:\n", error);
    await email.sendEmail(errorMessage);
}
