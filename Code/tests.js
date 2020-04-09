exports.provideTestCases = provideTestCases;

/*
Here are all of the test cases I've built so far. These JSON objects simulate what the code would receive from various sources.
What I simulate here is basically:
1. The entire signup process for both M-Pesa- and Paga-using customers, with some intentional errors thrown in
2. Good and bad payments
3. Good and bad uses of our meter change form
4. Our SMS functionality
*/




/*
A small note for the future!
Whenever SparkMeter wipes the staging platform (the test site), here's what you have to do to get it back to being set up for testing:

1. Get a new API authentication key for an API user that's allowed to sell power- specifically, on the system Sales Account (for zeroing balance)
2. Create all your tariffs (or else signups will fail)

That's what I have for now. Maybe add to this list as more requirements as discovered.
*/



// Increment this every time the tests are run.
var counter = 20;


// These values need to change every time the tests are run
var accountNumber1Ending = 1100 + counter;
var accountNumber2Ending = 2100 + counter;
var meterSerial1Ending = 1110 + counter;
var meterSerial2Ending = 2110 + counter;
var meterSerial1ReplacementEnding = 3110 + counter;

var accountNumber1 = "12" + accountNumber1Ending;
var accountNumber2 = "12" + accountNumber2Ending;
var meterSerial1 = "SM5R-04-0000" + meterSerial1Ending;
var meterSerial2 = "SM16R-04-0000" + meterSerial2Ending;
var meterSerial1Replacement = "SM60R-05-0000" + meterSerial1ReplacementEnding;

// These ones can stay the same for each test
var meterSerialBad = "SM15R-01-000004D1";
var accountNumberBad = "128888";
var paymentID = Date.now(); // Easy way to get unique IDs





function provideTestCases() {
    var testCases = {

        // M-Pesa customer signup sequence

        signupFormReserveCustomerMpesa: {
            "MessageType": "Signup form- new account number",
            "customerAccountNumber": accountNumber1,
            "formFiller": "Douglas"
        },

        mpesaSignupPaymentValidationGood: {
            "isTest": true,
            "MessageType": "Validation",
            "TransactionType": "",
            "TransID": paymentID,
            "TransTime": "20190501130839",
            "TransAmount": "1000",
            "BusinessShortCode": "914630",
            "BillRefNumber": accountNumber1,
            "InvoiceNumber": "",
            "OrgAccountBalance": "",
            "ThirdPartyTransID": "",
            "MSISDN": "254795339437",
            "FirstName": "Do'oooglas'",
            "MiddleName": "T'est'ing'",
            "LastName": "C'ox'",
            "PaymentSource": "mpesa"
        },

        mpesaSignupPaymentConfirmationGood: {
            "isTest": true,
            "MessageType": "Confirmation",
            "TransactionType": "",
            "TransID": paymentID,
            "TransTime": "20190501130839",
            "TransAmount": "1000",
            "BusinessShortCode": "914630",
            "BillRefNumber": accountNumber1,
            "InvoiceNumber": "",
            "OrgAccountBalance": "",
            "ThirdPartyTransID": "",
            "MSISDN": "254795339437",
            "FirstName": "Do'oooglas'",
            "MiddleName": "T'est'ing'",
            "LastName": "C'ox'",
            "PaymentSource": "mpesa"
        },

        signupFormDetailsCustomerMpesa: {
            "MessageType": "Signup form- submit info",
            "customerAccountNumber": accountNumber1,
            "firstName": "Jonathan",
            "middleName": "Douglas",
            "lastName": "Cox",
            "poleNumber": "18",
            "countryCode": "+254",
            "meterSerial": meterSerial1,
            "phoneNumber": "1234567899",
            "tariff": "Residential",
            "customerType": "Residential",
            "transactionID": paymentID.toString()
        },

        // Paga customer signup sequence

        signupFormReserveCustomerPaga: {
            "MessageType": "Signup form- new account number",
            "customerAccountNumber": accountNumber2,
            "formFiller": "Douglas"
        },

        pagaSignupPaymentValidationGood: {
            "isTest": true,
            "customerFirstName": "Douglas",
            "customerLastName": "Cox",
            "customerAccountNumber": accountNumber2,
            "PaymentSource": "paga",
            "PaymentMessageType": "validateCustomer",
            "MessageType": "Payment"
        },

        pagaSignupPaymentConfirmationGood: {
            "PaymentSource": "paga",
            "PaymentMessageType": "submitTransaction",
            "MessageType": "Payment",
            "isTest": true,
            "transaction": {
                "utcTransactionDateTime": "2018-06-13T15:27:32",
                "transactionType": "BILL_PAY",
                "totalAmount": 500,
                "merchantAmount": 492.5,
                "isCredit": "true",
                "pagaTransactionId": (paymentID + 1).toString(),
                "merchantTransactionId": "BP-C_2018061315273249_1448479_XBFJX",
                "currency": "NGN",
                "customerReference": accountNumber2,
                "customerFirstName": "Douglas",
                "customerLastName": "Cox",
                "channel": "ONLINE",
                "description": "CUSTOMER_BILL_PAY.description",
                "customerPhoneNumber": "+2348140002059",
                "services": [
                    {
                        "isPublic": true,
                        "name": "Fruit and Nut Mix",
                        "price": 500,
                        "shortCode": "Fru"
                    }
                ]
            }
        },

        signupFormDetailsCustomerPaga: {
            "MessageType": "Signup form- submit info",
            "customerAccountNumber": accountNumber2,
            "firstName": "Jonathan",
            "middleName": "Douglas",
            "lastName": "Cox",
            "poleNumber": "18",
            "countryCode": "+254",
            "meterSerial": meterSerial2,
            "phoneNumber": "1234567899",
            "tariff": "Commercial",
            "customerType": "Bar/Restaurant",
            "transactionID": (paymentID + 1).toString()
        },

        // M-Pesa normal payment sequence (bad validation, good validation, good confirmation, duplicate confirmation)

        mpesaPaymentValidationBad: {
            "isTest": true,
            "MessageType": "Validation",
            "TransactionType": "",
            "TransID": (paymentID + 2).toString(),
            "TransTime": "20190501130839",
            "TransAmount": "1000",
            "BusinessShortCode": "914630",
            "BillRefNumber": accountNumberBad,
            "InvoiceNumber": "",
            "OrgAccountBalance": "",
            "ThirdPartyTransID": "",
            "MSISDN": "254795339437",
            "FirstName": "Do'oooglas'",
            "MiddleName": "T'est'ing'",
            "LastName": "C'ox'",
            "PaymentSource": "mpesa"
        },

        mpesaPaymentValidationGood: {
            "isTest": true,
            "MessageType": "Validation",
            "TransactionType": "",
            "TransID": (paymentID + 3).toString(),
            "TransTime": "20190501130839",
            "TransAmount": "1000",
            "BusinessShortCode": "914630",
            "BillRefNumber": accountNumber1,
            "InvoiceNumber": "",
            "OrgAccountBalance": "",
            "ThirdPartyTransID": "",
            "MSISDN": "254795339437",
            "FirstName": "Do'oooglas'",
            "MiddleName": "T'est'ing'",
            "LastName": "C'ox'",
            "PaymentSource": "mpesa"
        },

        mpesaPaymentConfirmationGood: {
            "isTest": true,
            "MessageType": "Confirmation",
            "TransactionType": "",
            "TransID": (paymentID + 3).toString(),
            "TransTime": "20190501130839",
            "TransAmount": "1000",
            "BusinessShortCode": "914630",
            "BillRefNumber": accountNumber1,
            "InvoiceNumber": "",
            "OrgAccountBalance": "",
            "ThirdPartyTransID": "",
            "MSISDN": "254795339437",
            "FirstName": "Do'oooglas'",
            "MiddleName": "T'est'ing'",
            "LastName": "C'ox'",
            "PaymentSource": "mpesa"
        },

        mpesaPaymentConfirmationDuplicate: {
            "isTest": true,
            "MessageType": "Confirmation",
            "TransactionType": "",
            "TransID": (paymentID + 3).toString(),
            "TransTime": "20190501130839",
            "TransAmount": "1000",
            "BusinessShortCode": "914630",
            "BillRefNumber": accountNumber1,
            "InvoiceNumber": "",
            "OrgAccountBalance": "",
            "ThirdPartyTransID": "",
            "MSISDN": "254795339437",
            "FirstName": "Do'oooglas'",
            "MiddleName": "T'est'ing'",
            "LastName": "C'ox'",
            "PaymentSource": "mpesa"
        },



        // Paga normal payment sequence (bad validation, good validation, good confirmation, duplicate confirmation)

        pagaPaymentValidationBad: {
            "isTest": true,
            "customerFirstName": "Douglas",
            "customerLastName": "Cox",
            "customerAccountNumber": accountNumberBad,
            "PaymentSource": "paga",
            "PaymentMessageType": "validateCustomer",
            "MessageType": "Payment"
        },


        pagaPaymentValidationGood: {
            "isTest": true,
            "customerFirstName": "Douglas",
            "customerLastName": "Cox",
            "customerAccountNumber": accountNumber2,
            "PaymentSource": "paga",
            "PaymentMessageType": "validateCustomer",
            "MessageType": "Payment"
        },

        pagaPaymentConfirmationGood: {
            "PaymentSource": "paga",
            "PaymentMessageType": "submitTransaction",
            "MessageType": "Payment",
            "isTest": true,
            "transaction": {
                "utcTransactionDateTime": "2018-06-13T15:27:32",
                "transactionType": "BILL_PAY",
                "totalAmount": 500,
                "merchantAmount": 492.5,
                "isCredit": "true",
                "pagaTransactionId": (paymentID + 4).toString(),
                "merchantTransactionId": "BP-C_2018061315273249_1448479_XBFJX",
                "currency": "NGN",
                "customerReference": accountNumber2,
                "customerFirstName": "Douglas",
                "customerLastName": "Cox",
                "channel": "ONLINE",
                "description": "CUSTOMER_BILL_PAY.description",
                "customerPhoneNumber": "+2348140002059",
                "services": [
                    {
                        "isPublic": true,
                        "name": "Fruit and Nut Mix",
                        "price": 500,
                        "shortCode": "Fru"
                    }
                ]
            }
        },

        pagaPaymentConfirmationDuplicate: {
            "PaymentSource": "paga",
            "PaymentMessageType": "submitTransaction",
            "MessageType": "Payment",
            "isTest": true,
            "transaction": {
                "utcTransactionDateTime": "2018-06-13T15:27:32",
                "transactionType": "BILL_PAY",
                "totalAmount": 500,
                "merchantAmount": 492.5,
                "isCredit": "true",
                "pagaTransactionId": (paymentID + 4).toString(),
                "merchantTransactionId": "BP-C_2018061315273249_1448479_XBFJX",
                "currency": "NGN",
                "customerReference": accountNumber2,
                "customerFirstName": "Douglas",
                "customerLastName": "Cox",
                "channel": "ONLINE",
                "description": "CUSTOMER_BILL_PAY.description",
                "customerPhoneNumber": "+2348140002059",
                "services": [
                    {
                        "isPublic": true,
                        "name": "Fruit and Nut Mix",
                        "price": 500,
                        "shortCode": "Fru"
                    }
                ]
            }
        },





        // Change Forms sequence

        changeFormReplaceBad: {
            meterSerial1: meterSerial1,
            meterSerial2: meterSerialBad,
            meterSiteCode1: accountNumber1,
            meterSiteCode2: accountNumber1,
            changeType: "replacement",
            MessageType: "Meter change form"
        },



        changeFormReplaceGood: {
            meterSerial1: meterSerial1,
            meterSerial2: meterSerial1Replacement,
            meterSiteCode1: accountNumber1,
            meterSiteCode2: "Unassigned",
            changeType: "replacement",
            MessageType: "Meter change form"
        },

        // This fails right now and needs to be fixed
        // changeFormSwapBad: {
        //     meterSerial1: "SM60RP-04-00007780",
        //     meterSerial2: "SM60RP-04-00007781",
        //     meterSiteCode1: "99",
        //     meterSiteCode2: "99",
        //     changeType: "swap",
        //     MessageType: "Meter change form"
        // },

        changeFormSwapGood: {
            meterSerial1: meterSerial1Replacement,
            meterSerial2: meterSerial2,
            meterSiteCode1: accountNumber1,
            meterSiteCode2: accountNumber2,
            changeType: "swap",
            MessageType: "Meter change form"
        },


        // SMS tests

        getSMSQueue: {
            MessageType: "checkForSMSSparkmeter"
        },

        testSMSs: {
            MessageType: "Telerivet",
            SMSList: ["chack ND2264","ND2264", "131450", "SUBSCRIBE ND2264", "SUBSCRIBE ND 2264", "CHECK ND2264", "123456", "12 3456", "CHECK 123456", "CHECK 12 3456", "STOP", "SUBSCRIBE 12 3456", "SUBSCRIBE 123456", "SUBSCRIBE", "CHECK", "BlaBla", "Rn3333", "RN33333", "3333", "Check 3456", "Stop 3456", "Subscribe 3456", "Check Rn3333", "Stop Rn3333", "Subscribe Rn3333"]
        }
    };

    return testCases;
}
