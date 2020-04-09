/*
This code will never run on the remote server- it should only be called by the local environment (aka, on your computer, not on AWS).
The point of this is to have easy and local testing of all the major functions of the code. Here's how it works:

The testCases object provided below is a big object full of objects that simulate messages our server could receive.
This includes payments, SMS's, form inputs, and more. Each object is in exactly the same format as what could be sent from real sources.

The runTests() function below loops through those test cases one after another. If you read the outputs in the console log, you
can see if the tests were successful or not.

While these tests can be run with the production environment variables, it is better to use the local testing environment variables. That
way you can test anything you want and not worry about creating fake customers in our real database or on real ThunderClouds. So unless you're
intentionally testing with real ThunderCloud, real database, etc, make sure to set your environment variables correctly.

If you have any authentication errors, check tests.js. There is a note there about what is required to make SparkMeter's testing ThunderCloud happy.
Sometimes SparkMeter wipes it clean, and there are a few things you have to do to set it up to work with this testing.

One more thing- when you run the test cases, go to tests.js and add 1 to the counter variable. This makes sure all the test serial numbers and account numbers
aren't duplicates of previous test cases.
*/






var mainCode = require("./index");
var tests = require("./tests");
var testCases = tests.provideTestCases();


/*
Because this code runs when you hit "Go" on your computer, I wanted to make it easy to run all the test cases, but also to run other things.
So comment and uncomment things below as you please. Look at the bottom of these options for a place to write whatever code you want for testing
small things.
*/





// ------------------------------------------------------------------------------------------------------------------
// Run all the test cases:
// ------------------------------------------------------------------------------------------------------------------

// runTests(testCases);

// ------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------




// ------------------------------------------------------------------------------------------------------------------
// Run a specific test case:
// ------------------------------------------------------------------------------------------------------------------

// var response = runTest(testCases.testSMSs);
    var response = runSMStest(testCases.testSMSs); // Note this is separate because it runs in a different way

// ------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------




// ------------------------------------------------------------------------------------------------------------------
// Run something that isn't in the test cases, but should be sent to the rest of the code
// ------------------------------------------------------------------------------------------------------------------

// Examples 

// To check the SparkMeter SMS queues:
// var event = {
//     MessageType: "checkForSMSSparkmeter",
// };

// To simulate a payment confirmation:
// var event = {
//     "isTest": true,
//     "MessageType": "Confirmation",
//     "TransactionType": "",
//     "TransID": "CIAO",
//     "TransTime": "20190501130839",
//     "TransAmount": "1000",
//     "BusinessShortCode": "914630",
//     "BillRefNumber": "151002",
//     "InvoiceNumber": "",
//     "OrgAccountBalance": "",
//     "ThirdPartyTransID": "",
//     "MSISDN": "254795339437",
//     "FirstName": "Carol",
//     "MiddleName": "T'est'ing'",
//     "LastName": "C'ox'",
//     "PaymentSource": "mpesa"
// };

// To turn a site's meters to a different state:
// var event = {
//     MessageType: "Grid control",
//     DesiredState: "Auto",
//     SiteCode: "RN"
// };


// To send an SMS to an individual numberL

// var customerAccountNumber = "501134";
// var message = "Good morning Oloibiri. This is the automated SMS system of Renewvia. Please do not respond to this number except using the appropriate keywords.\n\nTo check your balance, send an SMS to this number (0703 528 9254‬) with CHECK and your account number, like:\nCHECK " + customerAccountNumber + "\n\nWe are sending you messages because you registered your phone number with us when you signed up with Renewvia. If you would like to receive messages from Renewvia on a different number, send us an SMS from that number with SUBSCRIBE and your account number, like:\nSUBSCRIBE " + customerAccountNumber + "\n\nFinally, to stop receiving these messages, you can reply with STOP. But we encourage you to wait a few days before requesting this. We will only send you notifications about payments, warnings when your balance is low, and important announcements.\n\nRemember, this is an automated system. Please do not call this number, and please do not send it any SMS without the correct keywords (CHECK, SUBSCRIBE, or STOP). Thank you for using Renewvia!";

// var event = {
//     MessageType: "Send SMS",
//     PhoneNumber: "+2347036563456",
//     Message: message,
//     Route: "telerivetGatewayPhoneNigeria"
// }



// To send an SMS to everybody at a site or sites:
// var event = {
//     MessageType: "SMS blast",
//     SiteCodes: ["50"],
//     Route: "telerivetGatewayPhoneNigeria"
// };

// To change all the tariffs at a site:
// var event = {
//     MessageType: "Tariff Change",
//     Action: "update",
//     SiteCode: "RN",
//     SiteVoltage: 240,
//     LowBalanceThreshold: 10,
//     TariffResidential: 84.39,
//     TariffCommercial: 106.73,
//     TariffIndustrial: 106.73,
//     TariffReligious: 84.39
// };
// Note: set tariffs back to 84.39 and 106.73


//var event = {
//    MessageType: "Check Koios"

//};

// var response = runTest(event);

// ------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------






// ------------------------------------------------------------------------------------------------------------------
// Run something that doesn't talk to the rest of the code at all (it's a sandbox!)
// ------------------------------------------------------------------------------------------------------------------

// console.log("yo")
// console.log(process.env.dbUser)
// var a = 3;


// ------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------









// ------------------------------------------------------------------------------------------------------------------
// Here are the testing functions that send the inputs above to the rest of the code
// ------------------------------------------------------------------------------------------------------------------

async function runTests(testCases) {

    var response;
    var i;
    var testCase;

    for (i in testCases) {

        testCase = testCases[i];
        console.log("---------------------------------------------------------------------------------------------------------");
        console.log("---------------------------------------------------------------------------------------------------------");
        console.log("---------------------------------------------------------------------------------------------------------");
        console.log("Running test: " + testCase.MessageType);
        console.log("---------------------------------------------------------------------------------------------------------");

        if (testCase.MessageType === "Telerivet") {
            response = await runSMStest(testCase);
        }
        else {
            response = await runTest(testCase);
        }

        console.log("Response is: " + JSON.stringify(response));
    }

}









async function runTest(input) {
    var response = await mainCode.handler(input);
    return response;
}




async function runSMStest(testSMSes) {
    var i;
    var event;
    var response;
    var SMSList = testSMSes.SMSList;

    console.log(SMSList);

    for (i in SMSList) {

        event = {
            MessageType: "Telerivet",
            message: SMSList[i],
            phoneNumber: "+14049367991"
        };

        response = await runTest(event);
        console.log("-----------------------------------------");
        console.log("Message was:\n" + SMSList[i] + "\n\nResponse was:\n" + response);
        console.log("-----------------------------------------");
    }

    return response;
}


// ------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------

