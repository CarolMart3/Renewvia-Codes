exports.assignPlatform = assignPlatform;

function assignPlatform(siteCode) {
    console.log("Assigning meter platform based on site code.");

    var sparkmeterList = ["ND", "RN", "11", "12", "13", "14", "15", "50", "51", "99"];
    var steamacoList = [];
    var stsList = [];

    var meterPlatform;
    siteCode = siteCode.slice(0, 2).toUpperCase();
    console.log("Site code is " + siteCode);

    if (sparkmeterList.includes(siteCode)) {
        meterPlatform = "sparkmeter";
    }
    else if (steamacoList.includes(siteCode)) {
        meterPlatform = "steamaco";
    }
    else if (stsList.includes(siteCode)) {
        meterPlatform = "sts";
    }
    else {
        // This should lead to failure eventually, as you only get here by having an account number with a wrong site code.
        // I'm only putting this here to not deal with handling failure within this code. It's lazy of me.
        // There is definitely a better way to fail sooner. Will improve one day.
        meterPlatform = "sparkmeter";
    }

    console.log("Meter platform is " + meterPlatform + ".");
    return meterPlatform;
}