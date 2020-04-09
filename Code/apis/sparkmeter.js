
exports.setSiteVariables = setSiteVariables;
exports.getCustomerInfo = getCustomerInfo;
exports.postPayment = postPayment;
exports.getSmsQueue = getSmsQueue;
exports.getCustomerList = getCustomerList;
exports.handleSparkmeterErrors = handleSparkmeterErrors;
exports.updateCustomer = updateCustomer;
exports.changeMeterMode = changeMeterMode;
exports.addCustomer = addCustomer;
exports.getCustomerInfoByMeterSerial = getCustomerInfoByMeterSerial;
exports.zeroBalance = zeroBalance;
exports.createTariff = createTariff;
exports.updateTariff = updateTariff;
exports.getTariffList = getTariffList;
exports.getOrganizationId = getOrganizationId;
exports.getKoiosSitesList = getKoiosSitesList;
exports.getKoiosHistoricalData = getKoiosHistoricalData;
var cldashes = "-------------------------------------------------------------------";


var axios = require("axios");
var email = require("./../apis/email");



function setSiteVariables(customerAccountNumber) {
    console.log("Set SparkMeter variables has begun");

    // Just in case
    customerAccountNumber = customerAccountNumber.toString();

    // You can feed this function an entire customer account number, or just the site code (first 2 digits)
    var siteCode = customerAccountNumber.slice(0, 2).toUpperCase();

    var siteName;
    var siteURLPath;
    var siteAuthToken;
    var startingBalance;
    var currency;

    // These are base tariffs- no forex, inflation, fuel, VAT, etc.
    var tariffResidential;
    var tariffCommercial;
    var tariffReligious;

    // These rates are used for calculating the bills sent in SMS's.
    var forexRate;
    var inflationRate;
    var taxRate;

    // This needs to be harmonized with the country in payment. It's useful here though.
    var siteCountry;
    var siteLanguage;

    // This allows multiple codes per site. Not used yet, but it's planned for the first two sites.
    // The site codes at the first two sites are alpha, and I want all future sites to be numeric.
    var standardSiteCode = siteCode;

    // There's a part of every SparkMeter URL that's identical for every site...except their test environment
    // This had been hard-coded for each API call before, but here I'll set it for all sites (and it will be overwritten only for the test environment)
    var meterBaseURL = process.env.sparkMeterBaseURL;

    if (siteCode === 'ND' || siteCode === '12') {
        siteURLPath = process.env.sparkMeterURLNdeda;
        siteAuthToken = process.env.sparkMeterAuthTokenNdeda;
        siteName = "Ndeda";
        standardSiteCode = "12";
        siteCountry = "Kenya";
        siteLanguage = "English";
        tariffResidential = 68;
        tariffCommercial = 86;
        tariffReligious = 68;
        tariffIndustrial = 86;
        forexRate = 0.0047;
        inflationRate = 0.0651;
        taxRate = .16;
        fuelRate = 0;
        startingBalance = 200;
        currency = "Kshs ";
    }
    else if (siteCode === 'RN' || siteCode === '11') {
        siteURLPath = process.env.sparkMeterURLRingiti;
        siteAuthToken = process.env.sparkMeterAuthTokenRingiti;
        siteName = "Ringiti";
        standardSiteCode = "11";
        siteCountry = "Kenya";
        siteLanguage = "English";
        tariffResidential = 68;
        tariffCommercial = 86;
        tariffReligious = 68;
        tariffIndustrial = 86;
        forexRate = 0.0047;
        inflationRate = 0.0651;
        taxRate = .16;
        fuelRate = 0;
        startingBalance = 200;
        currency = "Kshs ";
    }
    // The tariffs below are not approved. They are placeholders for now.
    else if (siteCode === "13") {
        siteURLPath = process.env.sparkMeterURLKalobeyeiSettlement;
        siteAuthToken = process.env.sparkMeterAuthTokenKalobeyeiSettlement;
        siteName = "Kalobeyei Settlement";
        standardSiteCode = siteCode;
        siteCountry = "Kenya";
        siteLanguage = "English";
        tariffResidential = 20;
        tariffCommercial = 25;
        tariffReligious = 20;
        tariffIndustrial = 25;
        forexRate = 0;
        inflationRate = 0;
        taxRate = .16;
        fuelRate = 0;
        startingBalance = 200;
        currency = "Kshs ";
    }
    else if (siteCode === "14") {
        siteURLPath = process.env.sparkMeterURLKalobeyeiTown;
        siteAuthToken = process.env.sparkMeterAuthTokenKalobeyeiTown;
        siteName = "Kalobeyei Town";
        standardSiteCode = siteCode;
        siteCountry = "Kenya";
        siteLanguage = "English";
        tariffResidential = 20;
        tariffCommercial = 25;
        tariffReligious = 20;
        tariffIndustrial = 25;
        forexRate = 0;
        inflationRate = 0;
        taxRate = .16;
        fuelRate = 0;
        startingBalance = 200;
        currency = "Kshs ";
    }
    else if (siteCode === "15") {
        siteURLPath = process.env.sparkMeterURLNgurunit;
        siteAuthToken = process.env.sparkMeterAuthTokenNgurunit;
        siteName = "Ngurunit";
        standardSiteCode = siteCode;
        siteCountry = "Kenya";
        siteLanguage = "English";
        tariffResidential = 59;
        tariffCommercial = 78;
        tariffReligious = 59;
        tariffIndustrial = 83;
        forexRate = 0;
        inflationRate = 0;
        taxRate = .16;
        fuelRate = 0;
        startingBalance = 200;
        currency = "Kshs ";
    }
    else if (siteCode === "50") {
        siteURLPath = process.env.sparkMeterURLOloibiri;
        siteAuthToken = process.env.sparkMeterAuthTokenOloibiri;
        siteName = "Oloibiri";
        standardSiteCode = siteCode;
        siteCountry = "Nigeria";
        siteLanguage = "English";
        tariffResidential = 210;
        tariffCommercial = 238;
        tariffReligious = 238;
        tariffIndustrial = 300;
        forexRate = 0;
        inflationRate = 0;
        taxRate = 0.075;
        fuelRate = 0;
        startingBalance = 1000;
        currency = "N";
    }
    else if (siteCode === "51") {
        siteURLPath = process.env.sparkMeterURLAkipelai;
        siteAuthToken = process.env.sparkMeterAuthTokenAkipelai;
        siteName = "Akipelai";
        standardSiteCode = siteCode;
        siteCountry = "Nigeria";
        siteLanguage = "English";
        tariffResidential = 210;
        tariffCommercial = 238;
        tariffReligious = 238;
        tariffIndustrial = 300;
        forexRate = 0;
        inflationRate = 0;
        taxRate = 0.075;
        fuelRate = 0;
        startingBalance = 1000;
        currency = "N";
    }
    else if (siteCode === "99") {
        // This is the SparkMeter test environment
        siteURLPath = process.env.sparkMeterURLTest;
        siteAuthToken = process.env.sparkMeterAuthTokenTest;
        siteName = "Test";
        standardSiteCode = siteCode;
        siteCountry = "Nigeria";
        siteLanguage = "English";
        tariffResidential = 180;
        tariffCommercial = 180;
        tariffReligious = 180;
        tariffIndustrial = 300;
        meterBaseURL = process.env.sparkMeterBaseURLTest;
        forexRate = 0;
        inflationRate = 0;
        taxRate = 0;
        fuelRate = 0;
        startingBalance = 1000;
        currency = "N";
    }
    else if (siteCode === "98") {
        // This is the SparkMeter test environment, but for simulating when it's down
        siteURLPath = process.env.sparkMeterURLTest;
        siteAuthToken = process.env.sparkMeterAuthTokenTestUnavailable; // This is for injecting the wrong auth token so all API calls fail
        siteName = "Test";
        standardSiteCode = siteCode;
        siteCountry = "Nigeria";
        siteLanguage = "English";
        tariffResidential = 180;
        tariffCommercial = 180;
        tariffReligious = 180;
        tariffIndustrial = 300;
        meterBaseURL = process.env.meterBaseURLTest;
        forexRate = 0;
        inflationRate = 0;
        taxRate = 0;
        fuelRate = 0;
        startingBalance = 1000;
        currency = "N";
    }
    else {
        // This is my way of failing gracefully if an invalid site code is given.
        siteURLPath = process.env.sparkMeterURLKalobeyeiTown;
        siteAuthToken = process.env.sparkMeterAuthTokenKalobeyeiTown;
        siteName = "Kalobeyei Town";
        standardSiteCode = siteCode;
        siteCountry = "Kenya";
        siteLanguage = "English";
        tariffResidential = 20;
        tariffCommercial = 25;
        tariffReligious = 20;
        tariffIndustrial = 25;
        forexRate = 0;
        inflationRate = 0;
        taxRate = .16;
        fuelRate = 0;
        startingBalance = 200;
        currency = "Kshs ";
    }



    var response = {
        siteAuthToken: siteAuthToken,
        siteURLPath: siteURLPath,
        meterBaseURL: meterBaseURL,
        siteName: siteName,
        standardSiteCode: standardSiteCode,
        siteCountry: siteCountry,
        siteLanguage: siteLanguage,
        siteCode: siteCode,
        startingBalance: startingBalance,
        tariffResidential: tariffResidential,
        tariffCommercial: tariffCommercial,
        tariffReligious: tariffReligious,
        tariffIndustrial: tariffIndustrial,
        taxRate: taxRate,
        forexRate: forexRate,
        inflationRate: inflationRate,
        fuelRate: fuelRate,
        startingBalance: startingBalance,
        currency: currency
    };

    return response;
}





async function getCustomerInfo(customerAccountNumber) {

    console.log("Getting customer information by account number has begun");

    var siteVariables = setSiteVariables(customerAccountNumber);

    var url = siteVariables.siteURLPath + siteVariables.meterBaseURL + "/customer/" + customerAccountNumber;

    var config = {
        headers: {
            "Content-Type": "application/json",
            "Authentication-Token": siteVariables.siteAuthToken
        },
        validateStatus: function (status) {
            return (status == 200 || status == 404); // Accepts 200 (customer exists) or 404 (customer doesn't exist). Any other status means there's a problem.
        }
    };

    const response = await axios.get(url, config);
    console.log("---SparkMeter's status is " + response.status);
    console.log("---SparkMeter's error reponse is " + response.data.error);
    return response.data;
}



// This one gets customer information by their meter serial number
async function getCustomerInfoByMeterSerial(meterSerialNumber, siteCode) {

    console.log("Getting customer information by meter serial number has begun");

    var siteVariables = setSiteVariables(siteCode);
    var siteAuthToken = siteVariables.siteAuthToken;

    var url = siteVariables.siteURLPath + siteVariables.meterBaseURL + "/customers?meter_serial=" + meterSerialNumber;

    var config = {
        headers: {
            "Content-Type": "application/json",
            "Authentication-Token": siteAuthToken
        },
        validateStatus: function (status) {
            return (status == 200 || status == 404); // Accepts 200 (customer exists) or 404 (customer doesn't exist). Any other status means there's a problem.
        }
    };

    const response = await axios.get(url, config);
    console.log("---SparkMeter's status is " + response.status);
    console.log("---SparkMeter's error reponse is " + response.data.error);
    return response.data;
}




async function getCustomerList(site) {

    console.log("Getting customer list has begun");

    var sparkmeterDetails = setSiteVariables(site);

    var url = sparkmeterDetails.siteURLPath + sparkmeterDetails.meterBaseURL + "/customers";

    var config = {
        headers: {
            "Content-Type": "application/json",
            "Authentication-Token": sparkmeterDetails.siteAuthToken
        }
    };

    const response = await axios.get(url, config);
    return response.data;
}



async function postPayment(customerAccountNumber, transactionAmount, source, externalID) {
    console.log("Posting payment to SparkMeter has begun");

    externalID = externalID.toString();

    var siteVariables = setSiteVariables(customerAccountNumber); // setSiteVariables can take just a 2-digit site code or an entire account number
    var siteURLPath = siteVariables.siteURLPath;
    var meterBaseURL = siteVariables.meterBaseURL;
    var siteAuthToken = siteVariables.siteAuthToken;

    var customerInfo = await getCustomerInfo(customerAccountNumber);
    var meterCustomerID = customerInfo.customers[0].id;

    var url = siteURLPath + meterBaseURL + "/transaction/";
    var body = { customer_id: meterCustomerID, amount: transactionAmount, source: source, external_id: externalID };
    console.log(body);

    var config = {
        headers: {
            "Content-Type": "application/json",
            "Authentication-Token": siteAuthToken
        }
    };

    const response = await axios.post(url, body, config);
    console.log("---SparkMeter error on payment posting is " + response.data.error + " and status is " + response.data.status);
    console.log("---SparkMeter transaction ID is " + response.data.transaction_id);
    return response.data;
}




async function getSmsQueue(site) {

    var sparkmeterDetails = setSiteVariables(site);

    console.log("Fetching SMS's from the SparkMeter queue has begun");
    var url = sparkmeterDetails.siteURLPath + sparkmeterDetails.meterBaseURL + "/sms/outgoing";
    console.log(url);

    var config = {
        headers: {
            "Content-Type": "application/json",
            "Authentication-Token": sparkmeterDetails.siteAuthToken
        },
        validateStatus: function (status) {
            return (status == 200 || status == 404); // Accepts 200 (messages are in the queue) or 404 (no other messages in the queue). Any other status means there's a problem.
        },
        data: {
            "mark_delivered": true
        }
    };


    const response = await axios.get(url, config);
    console.log("---SparkMeter's status is " + response.status);
    console.log("---SparkMeter's error reponse is " + response.data.error);
    return response.data;
}



async function updateCustomer(siteCode, customerId, body) {
    console.log("Updating customer on SparkMeter has begun.")
    var siteVariables = setSiteVariables(siteCode);
    var siteAuthToken = siteVariables.siteAuthToken;

    var url = siteVariables.siteURLPath + siteVariables.meterBaseURL + "/customers/" + customerId;

    var config = {
        headers: {
            "Content-Type": "application/json",
            "Authentication-Token": siteAuthToken
        },
        validateStatus: function (status) {
            return (status == 200);
        }
    };

    const response = await axios.put(url, body, config);
    console.log("---SparkMeter error on customer update is " + response.data.error + " and status is " + response.data.status);
    return response.data;
}



async function changeMeterMode(siteURL, meterBaseURL, siteAuthToken, meterSerial, meterState) {
    /*
    Ideally I don't want to pass site URL and Auth parameters around because it's messy, but this call
    is only used for the gridControl routine, and it's easier to deal with meter serial numbers than customer
    account numbers for that. So I'll leave all those inputs alone here.
    */

    console.log("Changing meter mode has begun. Changing " + meterSerial + " to state:" + meterState);

    meterState = meterState.toLowerCase();
    var url = siteURL + meterBaseURL + "/meter/" + meterSerial + "/set-operating-mode";
    var body = { state: meterState };

    var config = {
        headers: {
            "Content-Type": "application/json",
            "Authentication-Token": siteAuthToken
        }
    };

    const response = await axios.post(url, body, config);
    console.log("---SparkMeter error on changing meter mode is " + response.data.error + " and status is " + response.data.status);
    return response.data;

}







async function addCustomer(meterSerial, tariff, customerName, customerAccountNumber, phoneNumber, operatingMode, startingCreditBalance) {
    console.log("Adding customer " + customerAccountNumber + " has begun.");

    var siteVariables = setSiteVariables(customerAccountNumber);
    var siteURLPath = siteVariables.siteURLPath;
    var meterBaseURL = siteVariables.meterBaseURL;
    var siteAuthToken = siteVariables.siteAuthToken;

    var url = siteURLPath + meterBaseURL + "/customer/";
    var body = {
        serial: meterSerial,
        meter_tariff_name: tariff,
        name: customerName,
        code: customerAccountNumber,
        phone_number: phoneNumber,
        operating_mode: operatingMode,
        starting_credit_balance: startingCreditBalance
    };

    console.log("New customer details are: " + JSON.stringify(body));
    console.log("URL is: " + url);

    var config = {
        headers: {
            "Content-Type": "application/json",
            "Authentication-Token": siteAuthToken
        },
        validateStatus: function (status) {
            return (status == 200 || status == 404 || status == 423 || status == 400 || status == 201); // Accepts 200 (messages are in the queue) or 404 (no other messages in the queue). Any other status means there's a problem.
        }
    };

    const response = await axios.post(url, body, config);
    console.log("---SparkMeter error adding new customer is  " + response.data.error + " and status is " + response.data.status);
    return response;
}








async function zeroBalance(customerAccountNumber) {

    console.log("Zeroing balance of account: " + customerAccountNumber);
    console.log("Zeroing balance: first we need to get customer info...")
    var customerInfo = await getCustomerInfo(customerAccountNumber);
    console.log("Zeroing balance: then we need to get site info...")
    var siteVariables = await setSiteVariables(customerAccountNumber);
    console.log("Zeroing balance: info gotten, moving onto the zeroing part...")

    var url = siteVariables.siteURLPath + siteVariables.meterBaseURL + "/customers/" + customerInfo.customers[0].id + "/wallet/credit/zero-balance";
    var siteAuthToken = siteVariables.siteAuthToken;

    // Using this format cause for some reason, I couldn't get the usual format to work. Not sure why.
    const response = await axios({
        method: "post",
        url: url,
        headers: {
            "Authentication-Token": siteAuthToken
        },
        validateStatus: function (status) {
            return true;
        }
    });

    console.log("---SparkMeter error zeroing the balance is " + response.data.error + " and status is " + response.data.status);
    return response.data;
}





async function handleSparkmeterErrors(dataObject) {
    console.log(cldashes);
    var emailMessage = "There was an error with connecting to SparkMeter. Here's the data object:\n" + JSON.stringify(dataObject);
    console.log(emailMessage);
    await email.sendEmail(emailMessage);
    return dataObject;
}





async function createTariff(siteCode, tariffName, loadLimit, tariffPrice, lowBalanceThreshold) {

    // I'm just making this for flat tariffs for now. There's a lot of fancy stuff you can do here,
    // but we don't use it and aren't planning to any time soon.

    var siteVariables = setSiteVariables(siteCode);
    var siteURLPath = siteVariables.siteURLPath;
    var meterBaseURL = siteVariables.meterBaseURL;
    var url = siteURLPath + meterBaseURL + "/tariffs";
    var siteAuthToken = siteVariables.siteAuthToken;

    var body = {
        name: tariffName,
        flat_load_limit: loadLimit,
        flat_price: tariffPrice,
        low_balance_threshold: lowBalanceThreshold,
        tariff_type: "flat",
        load_limit_type: "flat",
        cycle_start_day_of_month: 1
    };


    var config = {
        headers: {
            "Content-Type": "application/json",
            "Authentication-Token": siteAuthToken
        },
        validateStatus: function (status) {
            return (status == 201 || status == 401 || status == 400); // 201 is success, 401 is unauthorized, and 400 is bad request. Pass them all so we see the error.
        }
    };

    const response = await axios.post(url, body, config);
    console.log("---SparkMeter error adding new tariff is  " + response.data.error + " and status is " + response.data.status);
    return response;


}






async function updateTariff(siteCode, tariffName, loadLimit, tariffPrice, lowBalanceThreshold, tariffId) {

    // From SparkMeter:
    // "Update an existing tariff. This will overwrite the tariff in its entirety, erasing fields that aren't specified."
    // So we'll pass in all of the same variables as createTariff (plus tariffId). If there ever becomes a need to
    // write cleaner code for updating just one thing, use the "Partially Update Tariff" call instead.
    // Same limitation as createTariff()- this will only work with flat tariffs.


    var siteVariables = setSiteVariables(siteCode);
    var siteURLPath = siteVariables.siteURLPath;
    var meterBaseURL = siteVariables.meterBaseURL;
    var url = siteURLPath + meterBaseURL + "/tariff/" + tariffId;
    var siteAuthToken = siteVariables.siteAuthToken;


    var body = {
        name: tariffName,
        flat_load_limit: loadLimit,
        flat_price: tariffPrice,
        low_balance_threshold: lowBalanceThreshold,
        tariff_type: "flat",
        load_limit_type: "flat",
        cycle_start_day_of_month: 1
    };



    var config = {
        headers: {
            "Content-Type": "application/json",
            "Authentication-Token": siteAuthToken
        },
        validateStatus: function (status) {
            return (status == 200 || status == 401 || status == 400); // 201 is success, 401 is unauthorized, and 400 is bad request. Pass them all so we see the error.
        }
    };


    const response = await axios.put(url, body, config);
    console.log("---SparkMeter error on tariff update is " + response.data.error + " and status is " + response.data.status);
    return response.data;

}


async function getTariffList(siteCode) {

    var siteVariables = setSiteVariables(siteCode);
    var siteURLPath = siteVariables.siteURLPath;
    var meterBaseURL = siteVariables.meterBaseURL;
    var url = siteURLPath + meterBaseURL + "/tariffs";
    var siteAuthToken = siteVariables.siteAuthToken;


    var config = {
        headers: {
            "Content-Type": "application/json",
            "Authentication-Token": siteAuthToken
        },
        validateStatus: function (status) {
            return (status == 200 || status == 401);
        }
    };

    const response = await axios.get(url, config);
    console.log("---SparkMeter's status is " + response.status);
    console.log("---SparkMeter's error reponse is " + response.data.error);
    return response.data;

}


// Koios APIs


async function getOrganizationId() {
    var url = "https://www.sparkmeter.cloud/api/v0/organizations";

    var config = {
        headers: {
            "Content-Type": "application/json",
            "X-API-KEY": process.env.sparkMeterKoiosApiKey,
            "X-API-SECRET": process.env.sparkMeterKoiosApiSecret
        }
    };

    const response = await axios.get(url, config);

    var organizationId = response.data.organizations[0].id;
    return organizationId;

}

async function getKoiosSitesList() {
    var url = "https://www.sparkmeter.cloud/api/v0/organizations/" + process.env.sparkMeterKoiosOrganizationId + "/sites";

    var config = {
        headers: {
            "Content-Type": "application/json",
            "X-API-KEY": process.env.sparkMeterKoiosApiKey,
            "X-API-SECRET": process.env.sparkMeterKoiosApiSecret
        }
    };

    const response = await axios.get(url, config);

    console.log(response.data);
    return response.data;
}


async function getKoiosHistoricalData(body) {
    var url = "https://www.sparkmeter.cloud/api/v0/organizations/" + process.env.sparkMeterKoiosOrganizationId + "/data/historical";

    var config = {
        headers: {
            "Content-Type": "application/json",
            "X-API-KEY": process.env.sparkMeterKoiosApiKey,
            "X-API-SECRET": process.env.sparkMeterKoiosApiSecret
        }
    };


    try {
        const response = await axios.post(url, body, config);
        // console.log(response.data);
        return response.data;
    }
    catch (e) {
        console.log(e);
        return e;
    }
}
