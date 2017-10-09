function loadActivities() {
    var entity = new MobileCRM.FetchXml.Entity("msdyn_survey");
    var filter1 = new MobileCRM.FetchXml.Filter();
    var filter2 = new MobileCRM.FetchXml.Filter();
    var finalFilter = new MobileCRM.FetchXml.Filter();
    entity.addAttributes(); // we want all important attributes as we are going to save the results		
    filter1.where("statecode", "eq", 0);
    filter2.where("statuscode", "eq", 986540001);
    finalFilter.filters.push(filter1);
    finalFilter.filters.push(filter2);
    finalFilter.type = "and";
    entity.filter = finalFilter;
    var fetch = new MobileCRM.FetchXml.Fetch(entity);
    fetch.execute("DynamicEntities", DisplayResults, MobileCRM.bridge.alert, null);
}

function SetCookieAndRedirect(name, value) {
    //alert(name);
    //alert(value);
    SetCookie(name, value, SetCookieAndRedirect_callback);
}

function SetCookieAndRedirect_callback() {
    //alert("SetCookieAndRedirect_callback");
    location.href = "HomeReplacement.html";
}

function DisplayResults(res) {
    if (res.length == 1) {
        SetCookieAndRedirect('idEncuesta', res[0].properties.msdyn_surveyid);
        return;
    }
    document.getElementById("Results").innerHTML = "";
    for (var i in res) {
        document.getElementById("Results").innerHTML +=
            '<a class="btn btn-primary btn-block BotonEncuesta" onclick="SetCookieAndRedirect(\'idEncuesta\',\'' +
            res[i].properties.msdyn_surveyid + '\');" role="button">' + res[i].properties.msdyn_name + '</a> <br />';
    }
}