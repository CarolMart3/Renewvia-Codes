var mpesa = require("../../apis/mpesa");
var paga = require("../../apis/paga");
var sparkmeter = require("../../apis/sparkmeter");
var database = require("../../apis/database");
var newCustomer = require("../Forms/newCustomer");
var cldashes = "-------------------------------------------------------------------";

exports.processConfirmation = processConfirmation;
exports.getTransactionCount = getTransactionCount;




async function processConfirmation(payment) {

    console.log("Payment Confirmation has begun");
    console.log(cldashes);
    var transactionCount;

    // Log this in the database, check for duplicates, and get customer status (signing up or not)
    payment = await submitDbQueryConfirmationLog(payment);
    transactionCount = await getTransactionCount(payment.transactionID, payment);
    var customerStatus = await newCustomer.checkAccountNumberStatus(payment.customerAccountNumber);
    console.log("Transaction count is " + transactionCount);


    if (transactionCount < 2) { // Sometimes the count comes in at 0 incorrectly
        try {
            if (customerStatus === "Paying") {
                console.log("Processing this payment as a signup payment.");
                payment.sparkMeterResponse = "signup";
                payment.sparkMeterTransactionID = "signup";
                // payment.meterCustomerID = "unassigned"; //Deleteme!
            }
            else {
                if (payment.customerAccountNumber.substring(0,2) === "15")
                {
                    payment.sparkMeterTransactionID = "Ngurunit Offline";
                    payment.sparkMeterResponse = "Ngurunit Offline";
                }
                else {
                console.log("Processing this payment as a normal (not signup) payment.");
                payment = await postPaymentToMeter(payment);
            }}

            // Logs for Renewvia
            payment.renewviaResponse = "success";
            await submitDbQueryConfirmationMeterTransactionId(payment);
            payment = await handleResponseLogging(payment);
            console.log("The data object for this transaction is:\n" + JSON.stringify(payment));

            // Response for the payment processor
            var response = formatConfirmationResponse(payment);
            return response;
        }
        catch (error) {
            console.log(error);
            payment.sparkMeterResponse = "failure";
            await sparkmeter.handleSparkmeterErrors(payment);
            payment = await handleResponseLogging(payment);
            var response = formatConfirmationResponse(payment);
            return response;
        }
    }
    else {
        payment.renewviaResponse = "Duplicate";
        payment = await handleResponseLogging(payment);
        console.log("The data object for this transaction is: " + JSON.stringify(payment));
        return "Quit sending me duplicate confirmations";
    }

}




function formatConfirmationResponse(payment) {

    var response;

    if (payment.paymentProcessor === "mpesa") {
        response = mpesa.formatConfirmationResponse(payment);
    }
    else if (payment.paymentProcessor === "paga") {
        response = paga.formatConfirmationResponse(payment);
    }

    return response;
}






async function postPaymentToMeter(payment) {
    console.log("Posting payment to meter.");

    if (payment.meterPlatform === "sparkmeter") {
        // The SparkMeter routine is weird. First you have to get the customer's meter ID, which is not the same as their serial number.
        // Then you post the payment to that meter ID.
        console.log("First getting customer info from SparkMeter.");
        var customerInfo = await sparkmeter.getCustomerInfo(payment.customerAccountNumber);
        // payment.meterCustomerID = customerInfo.customers[0].id; //deleteme!

        console.log("Now posting payment to SparkMeter.");
        var paymentInfo = await sparkmeter.postPayment(payment.customerAccountNumber, payment.transactionAmount, "cash", payment.transactionID);
        payment.sparkMeterTransactionID = paymentInfo.transaction_id;
        payment.sparkMeterResponse = "success";
    }
    else if (payment.meterPlatform === "steamaco") {
        // Put the Steamaco logic here
    }
    else if (payment.meterPlatform === "sts") {
        // Generate a code here
    }
    return payment;
}




async function getTransactionCount(transactionID, payment) {
    try {
        console.log(cldashes);
        console.log("The handler for checking for duplicate payments in the database has begun");
        var stringForDuplicateCheck = 'SELECT COUNT(*) AS COUNT FROM renewviadb.payments WHERE transactionID = "' + transactionID + '"';
        var connectionResult = await database.queryDB(stringForDuplicateCheck);
        var count = connectionResult[0].COUNT;

        console.log("----This is payment number " + count + " of this transaction ID.");
        return count;
    }
    catch (error) {
        await database.handleDBErrors(payment, error, stringForDuplicateCheck);
        return 1;
    }
}



async function submitDbQueryConfirmationLog(payment) {
    try {
        console.log(cldashes);
        console.log("The handler for posting confirmation messages to the database has begun");

        // Old way I connected the payment object to one for the database. Delete once new way is proven.
        // var transactionDataObjectForDB = {
        //     country: payment.country,
        //     paymentProcessor: payment.paymentProcessor,
        //     transactionType: payment.transactionType,
        //     transactionID: payment.transactionID,
        //     transactionDate: payment.transactionDate,
        //     transactionTime: payment.transactionTime,
        //     transactionAmount: payment.transactionAmount,
        //     businessShortCode: payment.businessShortCode,
        //     customerAccountNumber: payment.customerAccountNumber,
        //     invoiceNumber: payment.invoiceNumber,
        //     renewviaBalance: payment.renewviaBalance,
        //     thirdPartyTransactionID: payment.thirdPartyTransactionID,
        //     phoneNumber: payment.phoneNumber,
        //     firstName: payment.firstName,
        //     middleName: payment.middleName,
        //     lastName: payment.lastName,
        //     currency: payment.currency,
        //     transactionChannel: payment.transactionChannel,
        //     fullMessage: payment.fullMessage,
        // };

        // Start with the whole thing and subtract what isn't logged.
        // This method of copying objects only works for properties but not methods. That's ok, we don't have any
        // methods assigned to the payment object yet. And this copy is just for logging things to the database.
        // But if we ever assign methods to the payment object and call them for the sake of database logging, watch out!
        var transactionDataObjectForDB = JSON.parse(JSON.stringify(payment));

        // This is the same as for the validation logs:
        delete transactionDataObjectForDB.MessageType;
        delete transactionDataObjectForDB.PaymentMessageType;
        delete transactionDataObjectForDB.siteAuthToken;
        delete transactionDataObjectForDB.meterBaseURL;
        delete transactionDataObjectForDB.siteURLPath;
        delete transactionDataObjectForDB.transactionDate;
        delete transactionDataObjectForDB.transactionTime;
        // delete transactionDataObjectForDB.meterCustomerID; //deleteme!
        delete transactionDataObjectForDB.dbID;

        // Gotta remove the quotes from the full message or else everything can break
        var newFullMessage = payment.fullMessage.replace(/"/g, '');
        newFullMessage = newFullMessage.replace(/'/g, "");
        transactionDataObjectForDB.fullMessage = newFullMessage;

        // Make the first part of the query string
        var keysList = Object.keys(transactionDataObjectForDB);
        var x;
        var stringForInsertQuery1 = "";
        for (x in keysList) {
            stringForInsertQuery1 += keysList[x] + ', ';
        }

        stringForInsertQuery1 = stringForInsertQuery1.slice(0, -2);

        // Make the second part of the query string
        var i;
        var stringForInsertQuery2 = "";
        for (i in transactionDataObjectForDB) {
            stringForInsertQuery2 += "'" + transactionDataObjectForDB[i] + "', ";
        }
        stringForInsertQuery2 = stringForInsertQuery2.slice(0, -2);

        // Put it together
        var stringForInsertQueryCombined = 'INSERT INTO renewviadb.payments (' + stringForInsertQuery1 + ') VALUES (' + stringForInsertQuery2 + ')';

        var connectionResult = await database.queryDB(stringForInsertQueryCombined);
        console.log("----DB entry row number is " + connectionResult.insertId);
        payment.dbID = connectionResult.insertId;
        return payment;
    }
    catch (error) {
        await database.handleDBErrors(payment, error);
        return payment;
    }
}



async function submitDbQueryConfirmationSparkmeterResult(payment) {
    try {
        console.log(cldashes);
        console.log("The handler for posting SparkMeter confirmation responses to the database has begun");
        var queryString = "UPDATE renewviadb.payments SET sparkMeterResponse='" + payment.sparkMeterResponse + "' WHERE id=" + payment.dbID;
        var connectionResult = await database.queryDB(queryString);
        return connectionResult;
    }
    catch (error) {
        await database.handleDBErrors(payment, error);
        return;
    }
}



async function submitDbQueryConfirmationRenewviaResult(payment) {
    try {
        console.log(cldashes);
        console.log("The handler for posting Renewvia confirmation responses to the database has begun");
        var queryString = "UPDATE renewviadb.payments SET renewviaResponse='" + payment.renewviaResponse + "' WHERE id=" + payment.dbID;
        var connectionResult = await database.queryDB(queryString);
        return connectionResult;
    }
    catch (error) {
        await database.handleDBErrors(payment, error);
        return;
    }
}



async function submitDbQueryConfirmationMeterTransactionId(payment) {
    try {
        console.log(cldashes);
        console.log("The handler for posting SparkMeter transaction IDs to the database has begun");
        var queryString = "UPDATE renewviadb.payments SET sparkMeterTransactionID='" + payment.sparkMeterTransactionID + "' WHERE id=" + payment.dbID;
        var connectionResult = await database.queryDB(queryString);
        return connectionResult;
    }
    catch (error) {
        await database.handleDBErrors(payment, error);
        return;
    }
}


async function handleResponseLogging(payment) {
    await submitDbQueryConfirmationRenewviaResult(payment);
    await submitDbQueryConfirmationSparkmeterResult(payment);
    return payment;
}
