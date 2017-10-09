function getVersion(){
	return "1.2.21.";
}

function sync() {
    MobileCRM.Application.synchronize(false);
}

function encuestaNueva() {
    GetCookieByName("idEncuesta", encuestaNueva_callback);
}

function encuestaNueva_callback(value){
    var encuestaId = value;
    if (encuestaId != "") {
        location.href = "encuesta.html";
    } else {
        location.href = "HomeEncuesta.html";
    }
}

function loadSurvey() {
    GetCookieByName("idEncuesta", loadSurvey_MostrarNombreEncuesta);
    GetCookieByName("idEncuesta", loadSurvey_callback);
}

function loadSurvey_MostrarNombreEncuesta(value) {
    var guidEncuesta = value;
    if (guidEncuesta != "") {
        MobileCRM.DynamicEntity.loadById("msdyn_survey", guidEncuesta,
            mostrarNombreEncuesta,
            function (error) {
                var popup = new MobileCRM.UI.MessageBox(error);
                popup.items = ["Ok"];
                popup.show();
            },
            null
        );
    }
}

function mostrarNombreEncuesta(params) {
    document.getElementById("nomencuesta").innerHTML += params.primaryName;
}

function loadSurvey_callback(value) {
    var guidEncuesta = value;
    if (guidEncuesta != "") {
        var entity = new MobileCRM.FetchXml.Entity("msdyn_surveyresponse");
        entity.addAttribute("msdyn_surveyresponseid");
        entity.addAttribute("axx_estadoencuesta");
        entity.filter = new MobileCRM.FetchXml.Filter();
        entity.filter.where("msdyn_surveyid", "eq", guidEncuesta);
        var fetch = new MobileCRM.FetchXml.Fetch(entity);
        fetch.execute("DynamicEntities", DisplayResults, MobileCRM.bridge.alert, null);
    }
}

function DisplayResults(res) {
    document.getElementById("Results").innerHTML = "";
    var n = 1;
    var estado;
    for (var i in res) {
        if (res[i].properties.axx_estadoencuesta == 282270001) {
            estado = "[F]";
        } else {
            estado = "[P]";
        }
        document.getElementById("Results").innerHTML +=
            '<a class="btn btn-primary btn-block" href="encuesta.html?idEncuestaRespuesta=' + res[i].properties.msdyn_surveyresponseid + '&estado=' + res[i].properties.axx_estadoencuesta + '" role="button"> Encuesta ' + n + '- estado ' + estado + '</a> <br />';
        n++;
    }
}