exports.convertJStoSQLTimestamp = convertJStoSQLTimestamp;
exports.convertMpesaToSQLTimestamp = convertMpesaToSQLTimestamp;
exports.convertPagaToSQLTimestamp = convertPagaToSQLTimestamp;

function convertJStoSQLTimestamp(date) {
    // Like 
    var newDateString = date.toISOString();
    newDateString = newDateString.replace("T", " ");
    newDateString = newDateString.replace("Z", "");
    // newDateString = '"' + newDateString + '"';
    return newDateString;
}


function convertMpesaToSQLTimestamp(dateString) {
    // Like 20190501130839 to 2020-01-02 11:43:26.755
    var timestamp;
    timestamp = dateString.slice(0, 4) + "-" + dateString.slice(4, 6) + "-" + dateString.slice(6, 8) + " " + dateString.slice(8, 10) + ":" + dateString.slice(10, 12) + ":" + dateString.slice(12, 14);
    return timestamp;
}

function convertPagaToSQLTimestamp(dateString) {
    // Paga sends dates as 2018-06-13T15:27:32
    var newDateString = dateString.replace("T", " ");
    return newDateString;
}