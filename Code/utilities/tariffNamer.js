exports.nameTariff = nameTariff;

function nameTariff(meterType, tariffType) {
    var tariffName;

    if (meterType === 'SM5R') {
        tariffName = tariffType;
    }
    else {
        tariffName = tariffType + " with " + meterType;
    }


    return tariffName;
}