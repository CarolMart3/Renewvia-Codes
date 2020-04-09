exports.sendSMS = sendSMS;
exports.sendMultipleSMS = sendMultipleSMS;
exports.multipleSmsQueueHandler = multipleSmsQueueHandler;
exports.handleTelerivetErrors = handleTelerivetErrors;
exports.setTelerivetProjectVariables = setTelerivetProjectVariables;
var axios = require("axios");
var email = require("./email");
var cldashes = "-------------------------------------------------------------------";



function setTelerivetProjectVariables(route) {
    var apiKey;
    var projectId;
    var routeId;

    if (route === "telerivetGatewayPhoneKenya") {
        apiKey = process.env.telerivetAPIKeyKenya; // from https://telerivet.com/api/keys
        projectId = process.env.telerivetProjectIdKenya;
        routeId = process.env.telerivetRouteIdKenyaGatewayPhone;
    }
    else if (route === "telerivetGatewayPhoneNigeria") {
        apiKey = process.env.telerivetAPIKeyNigeria; // from https://telerivet.com/api/keys
        projectId = process.env.telerivetProjectIdNigeria;
        routeId = process.env.telerivetRouteIdNigeriaGatewayPhone;
    }
    else if (route === "telerivetTest") {
        // I don't have a Telerivet test route yet, but it wouldn't be a bad idea
    }

    var results = {
        apiKey: apiKey,
        projectId: projectId,
        routeId: routeId
    };

    return results;
}


async function sendSMS(phoneNumber, message, route) {
    // Right now this isn't used anywhere, but it's ready to be.
    // For the SMS queues we get from SparkMeter, we send the whole queue at once using another funcrtion, sendMultipleSMS().
    // Responses to individual SMS's are sent from Telerivet. Telerivet calls our server and we return a response, and then the
    // action of sending is triggered from Telerivet. Go to telerivet.com and see our account to see or change that behavior.

    var telerivetProjectVariables = setTelerivetProjectVariables(route);
    var apiKey = telerivetProjectVariables.apiKey;
    var projectId = telerivetProjectVariables.projectId;
    var routeId = telerivetProjectVariables.routeId;


    var url = " https://api.telerivet.com/v1/projects/" + projectId + "/messages/send";
    var body = { api_key: apiKey, content: message, to_number: phoneNumber, route_id: routeId };

    var config = {
        headers: {
            "Content-Type": "application/json",
        },
        validateStatus: function (status) {
            return (status == 200 || status == 404 || status == 429); // Accepts 200 (messages are in the queue) or 404 (no other messages in the queue). Any other status means there's a problem.
        }
    };



    const response = await axios.post(url, body, config);

    console.log("Telerivet response status code is: " + response.status);
    console.log("Telerivet error message is: " + JSON.stringify(response.data.error));

    return response.data;
}



async function sendMultipleSMS(messageQueue, route) {

    var telerivetProjectVariables = setTelerivetProjectVariables(route);
    var apiKey = telerivetProjectVariables.apiKey;
    var projectId = telerivetProjectVariables.projectId;
    var routeId = telerivetProjectVariables.routeId;

    var url = " https://api.telerivet.com/v1/projects/" + projectId + "/send_multi";
    var body = { api_key: apiKey, messages: messageQueue, route_id: routeId };

    var config = {
        headers: {
            "Content-Type": "application/json",
        }
    };

    const response = await axios.post(url, body, config);
    // console.log("TR response is:\n" + response);
    // console.log("TR JS response is:\n" + JSON.stringify(response));
    return response.data;
}



async function multipleSmsQueueHandler(messageQueue, route) {
    var telerivetLimit = 99,
        telerivetResponseList = [],
        telerivetResponse, queueToSend;

    while (messageQueue.length > 0) {
        if (messageQueue.length > telerivetLimit) {
            queueToSend = messageQueue.splice(0, telerivetLimit);
            console.log("Sending overflow queue: " + JSON.stringify(queueToSend));
        }
        else {
            console.log("Send whole queue: " + JSON.stringify(messageQueue));
            queueToSend = messageQueue;
            messageQueue = [];
        }

        try {
            telerivetResponse = await sendMultipleSMS(queueToSend, route);
            telerivetResponseList.push(telerivetResponse.errorMessage);
        }
        catch (e) {
            telerivetResponseList.push(e.toString());
        }
    }
    console.log("Telerivet responses are " + telerivetResponseList);
    return telerivetResponseList;
}





async function handleTelerivetErrors(transactionDataObject) {
    console.log(cldashes);
    var emailMessage = "There was an error with connecting to Telerivet. Here's the transaction data object:\n" + JSON.stringify(transactionDataObject);
    console.log(emailMessage);
    await email.sendEmail(emailMessage);
    return transactionDataObject;
}






















// If you ever want to use the Telerivet library, this code works

// exports.telerivetTesting = telerivetTesting;
// var telerivet = require("telerivet");

// async function telerivetTesting(message) {
//     var tr = new telerivet.API(API_KEY);

//     var project = tr.initProjectById(PROJECT_ID);
//     console.log("APIKEY", API_KEY);
//     console.log("projectId", PROJECT_ID);
//     // send message
//     console.log("TO SEND");
//     var promise = new Promise(function (resolve, reject) {
//         project.sendMessage({
//             to_number: '555-0001',
//             content: 'Hello world!'
//         }, function(err, message) {
//             if (err) throw err;
//             console.log("RETURN VALUE", message);
//             resolve(message);
//         });
//     });


//     return promise;

// }
