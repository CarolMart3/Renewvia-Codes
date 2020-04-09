exports.parseMessage = parseMessage;
exports.formatValidationResponse = formatValidationResponse;
exports.formatConfirmationResponse = formatConfirmationResponse;

var dates = require("./../utilities/dates");

// This function fills in the payment with the details received from M-Pesa.

function parseMessage(event, payment) {
    console.log("M-Pesa parser has begun");

    // Top level categorization
    payment.MessageType = event.MessageType;
    payment.PaymentMessageType = event.PaymentMessageType;

    // Where did the payment come from
    payment.paymentProcessor = "mpesa";
    payment.transactionType = event.TransactionType;
    payment.transactionChannel = "mpesa";
    payment.businessShortCode = event.BusinessShortCode;


    // Payment Info
    payment.transactionID = event.TransID;
    payment.transactionDateTime = dates.convertMpesaToSQLTimestamp(event.TransTime);
    // payment.transactionDate = event.TransTime.slice(0, 8); // Need to delete
    // payment.transactionTime = event.TransTime.slice(8, 14); // Need to delete
    payment.modifiedDateTime = payment.transactionDateTime;
    payment.currency = "KES";
    payment.transactionAmount = event.TransAmount;
    payment.renewviaAmount = event.TransAmount; // M-Pesa processing fees are charged to customers, not us



    // Useless M-Pesa Things That I'm Logging For Now
    payment.invoiceNumber = event.InvoiceNumber;
    payment.thirdPartyTransactionID = event.ThirdPartyTransID;
    payment.renewviaBalance = event.OrgAccountBalance;

    // Customer Info
    payment.customerAccountNumber = event.BillRefNumber.replace(/ /g, '');
    payment.phoneNumber = event.MSISDN;
    payment.firstName = event.FirstName.replace(/'/g, "");
    payment.middleName = event.MiddleName.replace(/'/g, "");
    payment.lastName = event.LastName.replace(/'/g, "");

    // Details we add while processing the payment
    payment.country = "Kenya";

    // Stuff for logs
    payment.fullMessage = JSON.stringify(event);

    return payment;
}


// This formats a response to M-Pesa's validation request.
function formatValidationResponse(payment) {

    var validationResultNum;
    var validationResult = payment.renewviaResponse;

    if (payment.sparkMeterResponse === "Accepted") {
        validationResultNum = 0;
    }
    else if (payment.sparkMeterResponse === "Rejected" || payment.sparkMeterResponse === "Error") {
        validationResultNum = 1;
    }
    else {
        console.log("----Error in formatting response");
    }

    var mpesaResponse = {
        "ResultCode": validationResultNum,
        "ResultDesc": validationResult
    };

    return mpesaResponse;
}




function formatConfirmationResponse(payment) {
    // I think that these messages have no effect on M-Pesa's behavior, but they ask for them in their documentation.
    // So even if you send a failure message back, I believe that the money has already been transfered to your
    // account, so it's not like you're reversing the payment.

    var response;

    if (payment.sparkMeterResponse === "success" || payment.sparkMeterResponse === "signup") {
        response = { "C2BPaymentConfirmationResult": "Success" };
    }
    else if (payment.sparkMeterResponse === "failure") {
        response = { "C2BPaymentConfirmationResult": "Failure" };
    }

    return response;
}
