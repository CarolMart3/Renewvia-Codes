exports.fillNewSiteTariffs = fillNewSiteTariffs;

var sparkmeter = require("../../apis/sparkmeter");




async function fillNewSiteTariffs(action, siteCode, siteVoltage, lowBalanceThreshold, tariffResidential, tariffCommercial, tariffIndustrial, tariffReligious) {

    // First, some input cleaning
    action = action.toLowerCase();
    siteCode = siteCode.toString();
    siteVoltage = Number(siteVoltage); // This needs to be a number, because it's used with math later
    lowBalanceThreshold = Number(lowBalanceThreshold); // 10 for Kenya, 50 for Nigeria
    tariffResidential = Number(tariffResidential);
    tariffCommercial = Number(tariffCommercial);
    tariffIndustrial = Number(tariffIndustrial);
    tariffReligious = Number(tariffReligious);


    var tariffLevelsList = [
        {
            name: "Residential",
            price: tariffResidential
        },
        {
            name: "Commercial",
            price: tariffCommercial
        },
        {
            name: "Religious Institution",
            price: tariffReligious
        },
        {
            name: "Industrial",
            price: tariffIndustrial
        }
    ];




    var meterList = [
        {
            name: "SM5R",
            currentLimit: 6
        },
        {
            name: "SM16R",
            currentLimit: 16
        },
        {
            name: "SM60R",
            currentLimit: 60,
        },
        {
            name: "SM60RP",
            currentLimit: 180
        },
    ];



    var result = await sparkmeter.getTariffList(siteCode);
    var tariffList = result.tariffs;







    var i;
    var j;
    var tariffName;
    var tariffPrice;
    var loadLimit;


    for (j in tariffLevelsList) {
        for (i in meterList) {


            // Right now, all the tariffs assume that SM5R meters are the default. So all tariffs for other meters include
            // "with [meter type]" at the end, but those for the SM5R are just "Residential" or "Commercial" or whatever.
            // That should be changed, but for now, we'll work with that.

            if (meterList[i].name === "SM5R") {
                tariffName = tariffLevelsList[j].name;
            }
            else {
                tariffName = tariffLevelsList[j].name + " with " + meterList[i].name;
            }

            loadLimit = siteVoltage * meterList[i].currentLimit;
            tariffPrice = tariffLevelsList[j].price;

            if (action === "create") {
                var result = await sparkmeter.createTariff(siteCode, tariffName, loadLimit, tariffPrice, lowBalanceThreshold);
                console.log(result);
            }
            else if (action === "update") {
                var k;
                var tariffId;

                for (k in tariffList) {
                    if (tariffList[k].name === tariffName) {
                        tariffId = tariffList[k].id;
                        var result = await sparkmeter.updateTariff(siteCode, tariffName, loadLimit, tariffPrice, lowBalanceThreshold, tariffId);
                    }
                }


            }

        }
    }

    return "hey";

}

