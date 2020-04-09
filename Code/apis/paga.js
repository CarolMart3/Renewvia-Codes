exports.parseMessage = parseMessage;
exports.formatValidationResponse = formatValidationResponse;
exports.formatConfirmationResponse = formatConfirmationResponse;
exports.formatGetIntegrationServicesResponse = formatGetIntegrationServicesResponse;

var dates = require("./../utilities/dates");

// This function fills in the payment with the details received from Paga.

function parseMessage(event, payment) {
    console.log("Paga parser has begun");

    // Paga formats its validation and confirmation messages very differently:

    if (event.PaymentMessageType === "submitTransaction") {

        // Keep an eye out for a use case for isCredit. Paga says this will be true for payments, but if payments can be reversed, this will be false and we need to not credit their meters (in fact, debit them).

        // Top level categorization
        payment.MessageType = "Confirmation";
        payment.PaymentMessageType = event.PaymentMessageType;

        // Where did the payment come from
        payment.paymentProcessor = "paga";
        payment.transactionType = event.transaction.transactionType;
        payment.transactionChannel = event.transaction.channel;


        // Payment Info
        payment.transactionID = event.transaction.pagaTransactionId;
        payment.transactionDateTime = dates.convertPagaToSQLTimestamp(event.transaction.utcTransactionDateTime);
        // payment.transactionDate = event.transaction.utcTransactionDateTime.slice(0, 10);
        // payment.transactionTime = event.transaction.utcTransactionDateTime.slice(10, 19);
        payment.modifiedDateTime = payment.transactionDateTime;
        payment.currency = event.transaction.currency; // I assume this will always be NGN, but maybe they'll tell us differently one day
        payment.transactionAmount = event.transaction.totalAmount;
        payment.renewviaAmount = event.transaction.merchantAmount;



        // Customer Info
        payment.customerAccountNumber = event.transaction.customerReference; // Note that it's customerReference for payment confirmations and customerAccountNumber for validations
        payment.phoneNumber = event.transaction.customerPhoneNumber;
        payment.firstName = event.transaction.customerFirstName.replace(/'/g, "");
        payment.lastName = event.transaction.customerLastName.replace(/'/g, "");


        // Details we add while processing the payment
        payment.country = "Nigeria";

        // Stuff for logs
        payment.fullMessage = JSON.stringify(event);
    }
    else if (event.PaymentMessageType === "validateCustomer") {

        // Top level categorization
        payment.MessageType = "Validation";
        payment.PaymentMessageType = event.PaymentMessageType;

        // Where did the payment come from
        payment.paymentProcessor = "paga";


        // Payment Info
        // Paga doesn't send transaction IDs with validations, so I'll use a combination of account number and time (in milliseconds) for now
        payment.transactionID = event.customerAccountNumber + " " + Date.now();
        var date = new Date;
        date = dates.convertJStoSQLTimestamp(date);
        payment.transactionDateTime = date;
        // payment.transactionDate;
        // payment.transactionTime;
        payment.modifiedDateTime = payment.transactionDateTime;

        // Customer Info
        payment.customerAccountNumber = event.customerAccountNumber; // Note that it's customerReference for payment confirmations and customerAccountNumber for validations
        payment.firstName = event.customerFirstName;
        payment.lastName = event.customerLastName;

        // Details we add while processing the payment
        payment.country = "Nigeria";

        // Stuff for logs
        payment.fullMessage = JSON.stringify(event);

    }

    return payment;
}


// This formats a response to Paga's validation request.
function formatValidationResponse(payment) {
    console.log("Formatting the validation response to Paga has begun");

    var status;
    var isValid;

    if (payment.sparkMeterResponse === "Accepted" || payment.sparkMeterResponse === "Signup" || payment.sparkMeterResponse === "success") {
        status = "SUCCESS";
        isValid = true;
    }
    else if (payment.sparkMeterResponse === "Rejected") {
        status = "SUCCESS";
        isValid = false;
    }
    else if (payment.sparkMeterResponse === "Error") {
        status = "SERVER_ERROR";
        isValid = false;
    }
    else {
        console.log("----Error in formatting response");
    }

    var pagaResponse = {
        "status": status,
        "isValid": isValid
    };

    return pagaResponse;
}


function formatConfirmationResponse(payment) {
    // For now, I'm going to send success in any case. I need to learn more about Paga's failure
    // handling, like if I return failure, does it prevent the money from transfering?
    // This would be different from M-Pesa and I'd need to think about it.
    console.log("Formatting the confirmation response to Paga has begun");

    var status;

    if (payment.sparkMeterResponse === "Accepted" || payment.sparkMeterResponse === "signup" || payment.sparkMeterResponse === "success") {
        status = "SUCCESS";
    }
    else if (payment.sparkMeterResponse === "Rejected") {
        status = "SUCCESS";
    }
    else if (payment.sparkMeterResponse === "Error") {
        status = "SERVER_ERROR";
    }
    else {
        console.log("----Error in formatting response");
    }

    var pagaResponse = {
        "status": status
    };

    return pagaResponse;
}



function formatGetIntegrationServicesResponse() {
    return { "services": "SUBMIT_PAYMENT, VALIDATE _CUSTOMER" };
}