exports.checkStuff = checkStuff;

var sparkmeter = require("../apis/sparkmeter");

async function checkStuff() {

    var cursor;

    var body = {
        "filters": {
            "entity_types": ["readings"],
            "date_range": {
                "from": "2019-02-01T01:30:00.000",
                "to": "2019-05-30T00:00:00.000"
            },
            "sites": ["e1ce695e-bb99-4cd1-90ae-b1a6935dadbc"]
        }
    };

    var list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    var k;
    var i = 0;

    while (i < 1000) {
        var response = await sparkmeter.getKoiosHistoricalData(body);
        var results = response.results;

        // console.log(results);
        console.log("i is " + i);
        for (k in results) {
            // console.log("k is " + k);
            try {
                var can = results[k].meter.customer.code;
                console.log(can);
                if (results[k].meter.customer.code === "RN2299") {
                    console.log(results[k].heartbeat_start);
                    console.log(results[k].meter.serial);
                    console.log(results[k].meter.customer.code);
                }
                else {
                    // console.log(results[j].meter.customer.code);
                }
            }
            catch (e) {
                // console.log("Problem with one of the fields");
            }
        }
        i = i + 1;
        body = { cursor: cursor };
    }

    // RN2272
    //Feb 1 2019 through May 30 2019

    return response;
    // await sparkmeter.getKoiosSitesList();
}