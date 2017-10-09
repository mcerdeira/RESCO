function createCookie(name, value, days, callback) {
	var entity = new MobileCRM.FetchXml.Entity("axx_rescokeyvaluestorage");
	entity.addAttributes();
	var filter1 = new MobileCRM.FetchXml.Filter();
	var filter2 = new MobileCRM.FetchXml.Filter();
	var finalFilter = new MobileCRM.FetchXml.Filter();

	filter1.where("axx_deviceid", "eq", getFingerPrint());
	filter2.where("axx_name", "eq", name);

	finalFilter.filters.push(filter1);
	finalFilter.filters.push(filter2);
	finalFilter.type = "and";

	entity.filter = finalFilter;
	var fetch = new MobileCRM.FetchXml.Fetch(entity);
	fetch.execute("DynamicEntities", (function (res) {
		if (res.length > 0) {
			MobileCRM.DynamicEntity.deleteById(
				'axx_rescokeyvaluestorage',
				res[0].properties.axx_rescokeyvaluestorageid,
				(function () {
					//alert("1");
					Save(name, value, callback);
				}),
				(function (err) {
					alert(err);
					callback();
				})
			);
		} else {
			//alert("2");
			Save(name, value, callback);
		}
	}), DisplayError, null);
}

function Save(name, value, callback) {
	var nuevaPregunta = new MobileCRM.DynamicEntity.createNew("axx_rescokeyvaluestorage");
	nuevaPregunta.properties["axx_deviceid"] = getFingerPrint();
	nuevaPregunta.properties["axx_name"] = name;
	nuevaPregunta.properties["axx_value"] = value;
	nuevaPregunta.save((function () {
		callback();
	}));
}

function readCookie(name, callBack) {
	var entity = new MobileCRM.FetchXml.Entity("axx_rescokeyvaluestorage");
	entity.addAttributes();
	var filter1 = new MobileCRM.FetchXml.Filter();
	var filter2 = new MobileCRM.FetchXml.Filter();
	var finalFilter = new MobileCRM.FetchXml.Filter();

	filter1.where("axx_deviceid", "eq", getFingerPrint());
	filter2.where("axx_name", "eq", name);

	finalFilter.filters.push(filter1);
	finalFilter.filters.push(filter2);
	finalFilter.type = "and";

	entity.filter = finalFilter;
	var fetch = new MobileCRM.FetchXml.Fetch(entity);
	fetch.execute("DynamicEntities", (function (res) {
		if (res.length > 0) {
			callBack(res[0].properties.axx_value);
		} else {
			callBack("");
		}
	}), DisplayError, null);
}

function getFingerPrint() {
	var client = new ClientJS();
	var fingerprint = client.getFingerprint();
	return fingerprint;
}

function error_callback(err) {
	if (err != null) {
		alert(err);
	}
}

function DisplayError(res) {
	alert(res);
}

function eraseCookie(name) {
	createCookie(name, "", -1, noCallback);
}

function noCallback() {

}

function SetCookie(name, value, callback) {
	//Guardará en cookie el guid de la encuesta a trabajar.
	//alert("SetCookie");
	createCookie(name, value, 200, callback);
}

function GetCookieByName(name, callback) {
	return readCookie(name, callback);
}

/*Funcion para obtener los parametros de una URL*/
function getParameterByName(name) {
	name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
	var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
		results = regex.exec(location.search);
	if (results != null) {
		var value = decodeURIComponent(results[1].replace(/\+/g, " "));
		return value;
	}
	return null;

}