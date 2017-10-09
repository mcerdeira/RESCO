var guidEncuesta;
var estadoEncuesta;
var surveyXMLDoc;
var questionFetchs = [];
var idEncuestaRespuesta;
var latitud;
var longitud;
var saveStatusStack = [];
var VocQuestionProp = {
	visible: "986540000",
	invisible: "986540001",
}
var VocActionProp = {
	Mostar: "986540000",
	Ocultar: "986540001",
	Ir_a: "986540002",
	Finalizar_encuesta: "986540003",
	Encuesta_de_cadena: "986540004",
	Visibilidad_de_alternancia: "986540005",
}
var VocActionOperators = {
	Es_Igual: "986540000",
	Es_Mayor: "986540001",
	Es_Menor: "986540002",
	Seleccionado: "986540003",
}
var VocLogicGroup = {
	AND: "986540000",
	OR: "986540001",
}
var VocQuestionRequired = {
	Si: "986540000",
	No: "986540001",
}

var VocSingleresponsetype = {
	Botones_Grandes: "986540002",
	Escala: "986540003",
	Botones_de_Opcion: "986540000",
	Lista_Despegable: "986540001",
}

// Notes attachenment stuff
function getSurveyNoteAttachment(surveyId) {
	var xmlFetch = "<fetch top='50' >" +
		"<entity name='msdyn_survey' >" +
		"<attribute name='msdyn_name' />" +
		"<filter>" +
		"<condition attribute='msdyn_surveyid' operator='eq' value='" + surveyId + "' />" +
		"</filter>" +
		"<link-entity name='annotation' from='objectid' to='msdyn_surveyid' visible='true' >" +
		"<attribute name='filename' />" +
		"<attribute name='filesize' />" +
		"<attribute name='subject' />" +
		"<attribute name='documentbody' />" +
		"<attribute name='objecttypecode' />" +
		"<attribute name='annotationid' />" +
		/*
			No anda este filter...
			"<filter>" +
			"<condition attribute='filename' operator='neq' value='Traducciones.xml' />" +
			"</filter>" +
		*/
		"</link-entity>" +
		"</entity>" +
		"</fetch>";
	MobileCRM.FetchXml.Fetch.executeFromXML(xmlFetch, (function (res) {
		var idx = findAttachment(res);
		if (idx != -1) {
			downloadNoteAttachment(res[idx][6], surveyId);
		} else {
			var popup = new MobileCRM.UI.MessageBox("La encuesta se encuentra defectuosa.");
			popup.items = ["Ok"];
			popup.show();
			window.location.href = 'HomeEncuesta.html';
		}
	}), DisplayError, null);
}

function findAttachment(res) {
	for (i = 0; i < res.length; i++) {
		if (res[i][1].indexOf(res[i][0]) != -1) {
			return i;
		}
	}
	return -1;
}

function downloadNoteAttachment(noteId, surveyId) {
	MobileCRM.DynamicEntity.downloadAttachment("annotation", noteId, function (base64str) {
		var content = base64str;
		var decoded = decodeUTF16LE(window.atob(base64str));
		xmlDoc = $.parseXML(decoded);
		$xml = $(xmlDoc);
		surveyXMLDoc = $xml;
		LoadAndDisplaySurvey(surveyId);
	}, error_callback, null);
}

function pageObjfromQuestionId(id, surveyXMLDoc) {
	try {
		var pageid = surveyXMLDoc.find("question[Id='" + id + "']")[0].parentNode.parentNode.parentNode.attributes['0'].nodeValue;
		var pagename = surveyXMLDoc.find("question[Id='" + id + "']")[0].parentNode.parentNode.parentNode.attributes['1'].nodeValue;
		var sectionid = findNodeValue(surveyXMLDoc.find("question[Id='" + id + "']")[0].parentNode.parentNode.attributes, "Id");
		var sectionname = findNodeValue(surveyXMLDoc.find("question[Id='" + id + "']")[0].parentNode.parentNode.attributes, "s.name");

		if (sectionname === undefined) {
			pageid = "";
		}

		var pageObj = {
			PageId: pageid,
			PageName: pagename,
			SectionId: sectionid,
			SectionName: sectionname,
		};
		return pageObj;
	} catch (err) {
		var pageObj = {
			PageId: "",
			PageName: "",
			SectionId: "",
			SectionName: "",
		};
		return pageObj;
	}
}

function findNodeValue(node, name) {
	for (i = 0; i < node.length; i++) {
		if (node[i].name == name) {
			return node[i].nodeValue;
		}
	}
}

function decodeUTF16LE(binaryStr) {
	var buffer = "";
	var cp = [];
	for (var i = 0; i < binaryStr.length; i += 2) {
		cp[0] = binaryStr.charCodeAt(i) |
			(binaryStr.charCodeAt(i + 1) << 8);
		buffer += String.fromCharCode.apply(String, cp);
	}
	return buffer;
}

function LoadActivities() { // Main entry point (capaz hay que renombrarla a "Main" :) )...Ponele ;)
	//var html = "<center><h3>Cargando encuesta</h3>";
	//html += "<img src='img/loading.gif'></center>";
	//document.getElementById('wrapper').innerHTML = html;
	GetCookieByName('idEncuesta', LoadActivities_callback);
}

function LoadActivities_callback(id) {
	getSurveyNoteAttachment(id);
}

function LoadAndDisplaySurvey(id) {
	saveStatusStack = []; // Reset
	guidEncuesta = id;
	var entity = new MobileCRM.FetchXml.Entity("msdyn_question");
	entity.addAttributes();
	entity.orderBy("msdyn_globalorderindex", false);
	entity.filter = new MobileCRM.FetchXml.Filter();
	entity.filter.where("msdyn_surveyid", "eq", id);
	var fetch = new MobileCRM.FetchXml.Fetch(entity);
	fetch.execute("DynamicEntities", DisplayResults, DisplayError, null);
}

function GetOptionSetValues(questionId, style) {
	var questionFetchObj = getQuestionIdFetch(questionId);
	if (questionFetchObj.fetch) {
		if (!questionFetchObj.parentId) {
			MobileCRM.FetchXml.Fetch.executeFromXML(questionFetchObj.fetch, (function (res) {
				SetResultsLookUp(res, questionId, style);
			}), DisplayError, null);
		} else {
			var parent = document.getElementById(questionFetchObj.parentId.id);
			parent.addEventListener("change", function () {
				refreshChild(this, questionId);
			});
		}
	} else {
		var entity = new MobileCRM.FetchXml.Entity("msdyn_answer");
		entity.addAttributes();
		entity.orderBy("msdyn_orderindex", false);
		entity.filter = new MobileCRM.FetchXml.Filter();
		entity.filter.where("msdyn_questionid", "eq", questionId);
		var fetch = new MobileCRM.FetchXml.Fetch(entity);
		fetch.execute("DynamicEntities", (function (res) {
			SetResults(res, questionId, style)
		}), DisplayError, null);
	}
}

function getQuestionIdFetch(questionId) {
	for (i = 0; i < questionFetchs.length; i++) {
		if (questionFetchs[i].questionId == questionId) {
			return questionFetchs[i];
		}
	}
	return "";
}

function refreshChild(parentId, questionId) {
	document.getElementById(questionId).options.length = 0;
	var questionFetchObj = getQuestionIdFetch(questionId);
	var idSelected = document.getElementById(parentId.id)[document.getElementById(parentId.id).selectedIndex].id;
	if (questionFetchObj.fetch) {
		var xml = curateFetchXML(questionFetchObj.fetch, idSelected);
		MobileCRM.FetchXml.Fetch.executeFromXML(xml, (function (res) {
			SetResultsLookUp(res, questionId, "");
		}), DisplayError, null);
	}
}

function curateFetchXML(xml, id) {
	var element = $(xml).find("condition[attribute='axx_locacionpadre']")[0];
	var guid = findNodeValue(element.attributes, "value");
	var xml_ok = xml.replace(guid, "{" + id + "}");
	return xml_ok;
}

function SetResultsLookUp(res, questionId, style) {
	var element = document.createElement("option");
	var name = "-- Elija Opcion --";
	element.text = name;
	element.setAttribute("id", -1);
	element.setAttribute("name", questionId);
	element.setAttribute("value", name);
	var div = document.getElementById(questionId); // Parent element
	div.appendChild(element);
	for (var i in res) {
		var id = res[i][res[0].length - 1];
		var name = res[i][0];
		var div = document.getElementById(questionId); // Parent element
		var displaytype = div.getAttribute("data-displaytype");
		var element = document.createElement("option");
		element.text = name;
		element.setAttribute("id", id);
		element.setAttribute("name", questionId);
		element.setAttribute("value", name);
		div.appendChild(element);
	}
}

function SetResults(res, questionId, style) {
	var div = document.getElementById(questionId); // Parent element
	for (var i in res) {
		var id = res[i].properties.msdyn_answerid;
		var displaytype = div.getAttribute("data-displaytype");
		if (displaytype == "radio" || style != "radio") {
			var element = document.createElement("INPUT");

			controlHTML = "<input type='" + style + "' id='" + id + "' name='" + questionId + "' style='margin-left:-20px;' value='" + res[i].properties.msdyn_name + "' onchange='ActionExec(this);' />";
			controlHTML += "<label for='id'>" + res[i].properties.msdyn_name + "</label> <br/>"
			// element.setAttribute("type", style);
			// element.setAttribute("id", id);
			// element.setAttribute("name", questionId);
			// // element.setAttribute("position", 'relative');
			// // element.setAttribute("left", '20px');
			// // element.setAttribute("margin", '0px 0px 0px 0px');
			// element.style.margin = '0px 0px 0px 20px';

			// element.setAttribute("value", res[i].properties.msdyn_name');
			// element.addEventListener("change", function () {
			// ActionExec(this);
			// });

			// var label = document.createElement('label')
			// label.htmlFor = "id";
			// label.appendChild(document.createTextNode(res[i].properties.msdyn_name));

			// div.appendChild(element);
			// div.appendChild(label);
			// div.appendChild(document.createElement("br"));
			div.innerHTML += controlHTML;
		} else {
			var element = document.createElement("option");
			element.text = res[i].properties.msdyn_name;
			element.setAttribute("id", id);
			element.setAttribute("name", questionId);
			element.setAttribute("value", res[i].properties.msdyn_name);
			div.appendChild(element);
		}
		//
	}
	//div.style.padding = "0px 0px 0px 0px";
}

// Actions

function GetConditions(element, questionId) {
	var entity = new MobileCRM.FetchXml.Entity("msdyn_responsecondition");
	entity.addAttributes();
	var filter1 = new MobileCRM.FetchXml.Filter();
	var filter2 = new MobileCRM.FetchXml.Filter();
	var finalFilter = new MobileCRM.FetchXml.Filter();

	filter1.where("msdyn_survey", "eq", guidEncuesta);
	filter2.where("msdyn_comparisonquestion", "eq", questionId);

	finalFilter.filters.push(filter1);
	finalFilter.filters.push(filter2);
	finalFilter.type = "and";

	entity.filter = finalFilter;
	var fetch = new MobileCRM.FetchXml.Fetch(entity);
	fetch.execute("DynamicEntities", (function (res) {
		if (res.length > 0) {
			GetRouting(element, questionId, res);
		}
	}), DisplayError, null);
}

function GetRouting(element, questionId, resCond) {
	var entity = new MobileCRM.FetchXml.Entity("msdyn_responserouting");
	var routingId = resCond[0].properties.msdyn_responserouting.id;
	entity.addAttributes();
	entity.filter = new MobileCRM.FetchXml.Filter();
	entity.filter.where("msdyn_responseroutingid", "eq", routingId);
	var fetch = new MobileCRM.FetchXml.Fetch(entity);
	fetch.execute("DynamicEntities", (function (res) {
		if (res.length > 0) {
			GetActionRel(element, "action", questionId, resCond, res);
			GetActionRel(element, "actionelse", questionId, resCond, res);
		}
	}), DisplayError, null);
}

function GetActionRel(element, actionType, questionId, resCond, resRout) {
	var routingId = resRout[0].id;
	var action_entity;
	if (actionType == "action") {
		action_entity = "msdyn_responserouting_msdyn_responseaction";
	} else {
		action_entity = "msdyn_responserouting_responseaction_else";
	}
	var xmlFetch = "<fetch resultformat='Array' top='50' > " +
		"<entity name='" + action_entity + "' > " +
		"<attribute name='msdyn_responseactionid' /> " +
		"<filter> " +
		"<condition attribute='msdyn_responseroutingid' operator='eq' value='{" + routingId + "}' />" +
		"</filter>" +
		"</entity>" +
		"</fetch>";
	MobileCRM.FetchXml.Fetch.executeFromXML(xmlFetch, (function (res) {
		if (res.length > 0) {
			for (i = 0; i < res.length; i++) {
				GetAction(element, actionType, questionId, resCond, resRout, res[i]);
			}
		}
	}), DisplayError, null);
}

function GetAction(element, actionType, questionId, resCond, resRout, resActionrel) {
	var entity = new MobileCRM.FetchXml.Entity("msdyn_responseaction");
	var actionId = resActionrel[0].id;
	entity.addAttributes();
	entity.filter = new MobileCRM.FetchXml.Filter();
	entity.filter.where("msdyn_responseactionid", "eq", actionId);
	var fetch = new MobileCRM.FetchXml.Fetch(entity);
	fetch.execute("DynamicEntities", (function (res) {
		if (res.length > 0) {
			BuildActionFinal(element, actionType, questionId, resCond, resRout, resActionrel, res);
		}
	}), DisplayError, null);
}

function BuildActionFinal(element, actionType, questionId, resCond, resRout, resActionrel, resAction) {
	if (resAction.length > 0) {
		if (!element.getAttribute("data-if")) {
			element.setAttribute("data-if", resCond[0].properties.msdyn_comparisonquestion.id);
			element.setAttribute("data-op", resCond[0].properties.msdyn_operator);
			if (resCond[0].properties.msdyn_comparisonvalue) {
				element.setAttribute("data-val", resCond[0].properties.msdyn_comparisonvalue); // valor directo
			}
			if (resCond[0].properties.msdyn_comparisonanswer) {
				element.setAttribute("data-valId", resCond[0].properties.msdyn_comparisonanswer.id); // valor en otra pregunta
			}
		}
		if (actionType == "action") {
			element.setAttribute("data-then", resAction[0].properties.msdyn_action);
			if (resAction[0].properties.msdyn_question) // el target es una pregunta
			{
				addAttributes(element, "data-then-target", resAction[0].properties.msdyn_question.id);
			} else if (resAction[0].properties.msdyn_chaindestinationsurvey) { // el target es una encuesta
				element.setAttribute("data-then-target", resAction[0].properties.msdyn_chaindestinationsurvey.id);
			}
		} else {
			element.setAttribute("data-else", resAction[0].properties.msdyn_action);
			if (resAction[0].properties.msdyn_question) // el target es una pregunta
			{
				addAttributes(element, "data-else-target", resAction[0].properties.msdyn_question.id);
			} else if (resAction[0].properties.msdyn_chaindestinationsurvey) { // el target es una encuesta
				element.setAttribute("data-else-target", resAction[0].properties.msdyn_chaindestinationsurvey.id);
			}
		}
	}
}

function addAttributes(element, attr, value) {
	var valuePrev = element.getAttribute(attr);
	if (valuePrev) {
		value = valuePrev + "|" + value;
	}
	element.setAttribute(attr, value);
}

function DisplayActions() {
	//En la pregunta, buscar si para esa encuesta hay una o mas condiciones y se obtiene el enrutamiento.
	//Con el "enrutamiento", se sabe el grupo, esto es si las condiciones son Y u O (AND/OR)
	//Luego, usando entidades intermedias de: 
	//	msdyn_responserouting_msdyn_responseaction
	//	msdyn_responserouting_responseaction_else
	//Se obtienen las acciones del TRUE y del FALSE(ELSE) de ese grupo de condiciones.

	var clases = ['textbox', 'radio']; //['textbox', 'checkbox', 'radio', 'datepicker', 'ntextbox']; // ver si metemos todo en una clase extra agrupadora
	for (var j = 0; j < clases.length; j++) {
		var elements = document.getElementsByClassName(clases[j]);
		for (var i = 0; i < elements.length; i++) {
			var questionId = elements[i].id;
			GetConditions(elements[i], questionId);
		}
	}
}

function ActionExec(element) {
	var element_base = element;
	if (element.type == "radio") {
		element_base = element.parentElement;
	}
	var op = element_base.getAttribute("data-op");
	if (op) {
		var val = [];
		val[0] = ValueOf(element_base.getAttribute("data-if"), element.type);
		if (element_base.getAttribute("data-val")) {
			val[1] = element_base.getAttribute("data-val");
		} else {
			val[1] = element_base.getAttribute("data-valId");
		}

		if (Evaluate(val[0], val[1], op)) {
			ExecuteOn(element_base.getAttribute("data-then"), element_base.getAttribute("data-then-target"));
		} else {
			ExecuteOn(element_base.getAttribute("data-else"), element_base.getAttribute("data-else-target"));
		}
	}
}

function ValueOf(id, type) {
	if (type == "radio") {
		var childs = document.getElementById(id).children;
		for (var index = 0; index < childs.length; index++) {
			if (childs[index].nodeName == 'INPUT' && childs[index].checked) {
				return childs[index].id;
			}
		}
	} else if (type == "select-one") {
		return document.getElementById(id)[document.getElementById(id).selectedIndex].id;
	} else {
		return document.getElementById(id).value;
	}
}

function Evaluate(val1, val2, op) {
	var ret = false;
	switch (op) {
		case VocActionOperators.Es_Igual:
		case VocActionOperators.Seleccionado:
			ret = (val1 == val2);
			break;
		case VocActionOperators.Es_Mayor:
			ret = (val1 > val2);
			break;
		case VocActionOperators.Es_Menor:
			ret = (val1 < val2);
			break;
	}
	return ret;
}

function ExecuteOn(action, id) {
	switch (action) {
		case VocActionProp.Mostar:
			var ids = id.split("|");
			for (i = 0; i < ids.length; i++) {
				Show(ids[i]);
			}
			break;
		case VocActionProp.Ocultar:
			var ids = id.split("|");
			for (i = 0; i < ids.length; i++) {
				Hide(ids[i]);
			}
			break;
		case VocActionProp.Ir_a:
			break;
		case VocActionProp.Finalizar_encuesta:
			break;
		case VocActionProp.Encuesta_de_cadena:
			GotoSurvey(id);
			break;
		case VocActionProp.Visibilidad_de_alternancia:
			break;
	}
}

function Hide(id) {
	document.getElementById(id).parentElement.style.display = "none";
}

function Show(id) {
	document.getElementById(id).parentElement.style.display = ""; // en IE es "" en vez de "unset"
}

function GotoSurvey(id) {
	//save datos de la encuesta actual
	$.when(SaveEntityPosValidate()).then(function () {
		getSurveyNoteAttachment(id);
	});
}

function ValidateCampNum() {
	var clases = "ntextbox";
	var validarTexto = "";
	var elements = document.getElementsByClassName(clases);
	for (var i = 0; i < elements.length; i++) {
		if (isNaN(elements[i].value)) {
			validarTexto += ' ' + elements[i].dataset.questiontext;
		}
	}
	return validarTexto;
}

function ValidateCampRequired() {
	var clases = ['textbox', 'checkbox', 'radio', 'datepicker', 'ntextbox']
	var validarTexto = "";
	var validar;
	for (var j = 0; j < clases.length; j++) {
		var elements = document.getElementsByClassName(clases[j]);
		for (var i = 0; i < elements.length; i++) {
			var type = clases[j];
			var valor = elements[i].value;
			if (elements[i].dataset.requerido == VocQuestionRequired.Si) {
				switch (type) {
					case 'textbox': // texto corto, largo
						if (valor == null || valor.length == 0 || /^\s+$/.test(valor)) {
							validarTexto += ' ' + strip(elements[i].dataset.questiontext) + "\n";
						}
						break;
					case 'ntextbox': // numerica
						if (valor == null || valor.length == 0 || /^\s+$/.test(valor)) {
							validarTexto += ' ' + strip(elements[i].dataset.questiontext) + "\n";
						}
						break;
					case 'datepicker': // fecha
						if (valor == null || valor.length == 0 || /^\s+$/.test(valor)) {
							validarTexto += ' ' + strip(elements[i].dataset.questiontext) + "\n";
						}
						break;
					case 'radio': // respuesta unica
						validar = true;
						for (var index = 0; index < elements[i].children.length; index++) {
							if (elements[i].children[index].nodeName == 'INPUT' &&
								elements[i].children[index].checked) {
								validar = false;
								break;
							}
						}
						if (varlidar)
							validarTexto += ' ' + strip(elements[i].dataset.questiontext) + "\n";
						break;
					case 'checkbox': // varias respuestas
						validar = true;
						for (var index = 0; index < elements[i].children.length; index++) {
							if (elements[i].children[index].nodeName == 'INPUT' &&
								elements[i].children[index].checked) {
								validar = false;
							}
						}
						if (varlidar)
							validarTexto += ' ' + strip(elements[i].dataset.questiontext) + "\n";
						break;
					default:
						break;
				}
			}
		}
	}
	return validarTexto;
}

var SaveEntityPosValidate = function () {
	var textValidate = ValidateCampRequired();
	if (textValidate == "") {
		SaveEntitySurvey(true)

	} else {
		var popup = new MobileCRM.UI.MessageBox("Falta completar: \n" + textValidate);
		popup.items = ["Ok"];
		popup.show();
	}
}

function SaveEntitySurvey_callback(err) {
	if (!err) {
		sync_vecino();
		var popup = new MobileCRM.UI.MessageBox("Gracias por teminar la encuesta.");
		popup.items = ["Ok"];
		popup.show();
		window.location.href = 'HomeReplacement.html';
	} else {
		var popup = new MobileCRM.UI.MessageBox(err);
		popup.items = ["Ok"];
		popup.show();
	}
}

function SaveEntitySurvey(finalizar) {
	if (idEncuestaRespuesta) {
		SaveEntity(idEncuestaRespuesta)
		if (finalizar) {
			MobileCRM.DynamicEntity.loadById('msdyn_surveyresponse', idEncuestaRespuesta,
				function (entity) {
					entity.properties["axx_estadoencuesta"] = 282270001;
					entity.save(SaveEntitySurvey_callback);
				},
				error_callback,
				null
			);
		}
	} else {
		var respuestaDeLaEncuesta = new MobileCRM.DynamicEntity.createNew("msdyn_surveyresponse");
		respuestaDeLaEncuesta.properties["msdyn_surveyid"] = new MobileCRM.Reference("msdyn_survey", guidEncuesta.replace('{', '').replace('}', ''), '');
		if (finalizar) {
			respuestaDeLaEncuesta.properties["axx_estadoencuesta"] = 282270001;
		}
		respuestaDeLaEncuesta.save(
			function (error) {
				if (error) {
					DisplayError(error);
				} else {
					// callback is called in scope of newly created MobileCRM.DynamicEntity object; thus we can access the data using "this" keyword
					idEncuestaRespuesta = this.id;
					SaveEntity(idEncuestaRespuesta)
				}
			}
		);
	}
}

function SaveQuestion(surveyResponseId, questionId, type, valueElement) {
	var nuevaPregunta = new MobileCRM.DynamicEntity.createNew("msdyn_questionresponse");
	nuevaPregunta.properties["msdyn_surveyresponseid"] = new MobileCRM.Reference("msdyn_surveyresponse", surveyResponseId, '');
	nuevaPregunta.properties["msdyn_questionid"] = new MobileCRM.Reference("msdyn_question", questionId, '');
	nuevaPregunta.properties["msdyn_surveyid"] = new MobileCRM.Reference("msdyn_survey", guidEncuesta, '');
	if (type == 'textbox') {
		nuevaPregunta.properties["msdyn_valueasstring"] = valueElement;
	} else if (type == 'ntextbox') {
		nuevaPregunta.properties["msdyn_valueasdecimal"] = valueElement;
	} else if (type == 'datepicker') {
		var date = valueElement.split("-");
		//alert("Save" +  date[0] + "-" + date[1] + "-" +date[2]);
		//alert(new Date(date[0], date[1], date[2],0 , 0, 0 ));
		//alert(moment(valueElement).format("YYYY-MM-DD"));
		nuevaPregunta.properties["msdyn_valueasdate"] = new Date(date[0], date[1] - 1, date[2]);
	} else if (type == 'radio' || type == 'checkbox') {
		nuevaPregunta.properties["msdyn_answerid"] = new MobileCRM.Reference("msdyn_answer", valueElement, '');
	}
	nuevaPregunta.save(error_callback);
}

function DeleteQuestion(entityId) {
	MobileCRM.DynamicEntity.deleteById(
		'msdyn_questionresponse',
		entityId,
		null,
		error_callback
	);
}

function ModifyQuestion(entityId, type, valueElement) {
	MobileCRM.DynamicEntity.loadById('msdyn_questionresponse', entityId,
		function (entity) {
			if (type == 'textbox') {
				entity.properties["msdyn_valueasstring"] = valueElement;
			} else if (type == 'ntextbox') {
				entity.properties["msdyn_valueasdecimal"] = valueElement;
			} else if (type == 'datepicker') {
				var date = valueElement.split("-");
				//alert("Modify" +  date[0] + "-" + date[1] + "-" +date[2]);
				//alert(new Date(date[0], date[1], date[2]));
				entity.properties["msdyn_valueasdate"] = new Date(date[0], date[1] - 1, date[2]);
			} else if (type == 'radio' || type == 'checkbox') {
				entity.properties["msdyn_answerid"] = new MobileCRM.Reference("msdyn_answer", valueElement, '');
			}
			entity.save(error_callback);
		},
		error_callback,
		null
	);
}


function SaveEntity(surveyResponseId) {
	var clases = ['textbox', 'checkbox', 'radio', 'datepicker', 'ntextbox'];
	for (var j = 0; j < clases.length; j++) {
		var elements = document.getElementsByClassName(clases[j]);
		for (var i = 0; i < elements.length; i++) {
			var questionId = elements[i].id
			var type = clases[j];
			switch (type) {
				case 'textbox': // texto corto y largo
					if (elements[i].dataset.preimg) {
						if (elements[i].value != null && elements[i].value.length != 0)
							ModifyQuestion(elements[i].dataset.preimg, type, elements[i].value)
						else {
							DeleteQuestion(elements[i].dataset.preimg);
							elements[i].removeAttribute("data-preimg");
						}
					} else if (elements[i].value != null && elements[i].value.length != 0) {
						SaveQuestion(surveyResponseId, questionId, type, elements[i].value)
					}
					break;
				case 'ntextbox': // numerica
					if (elements[i].dataset.preimg) {
						if (elements[i].value != null && elements[i].value.length != 0)
							ModifyQuestion(elements[i].dataset.preimg, type, elements[i].value)
						else {
							DeleteQuestion(elements[i].dataset.preimg);
							elements[i].removeAttribute("data-preimg");
						}

					} else if (elements[i].value != null && elements[i].value.length != 0) {
						SaveQuestion(surveyResponseId, questionId, type, elements[i].value)
					}
					break;
				case 'radio': // respuesta unica
					if (elements[i].getAttribute("data-displaytype") == "combo") {
						if (elements[i][elements[i].selectedIndex] != null && elements[i][elements[i].selectedIndex].value.length != 0) {
							if (elements[i][elements[i].selectedIndex].id != -1) {
								if (elements[i].dataset.preimg) {
									ModifyQuestion(elements[i].dataset.preimg, "textbox", elements[i][elements[i].selectedIndex].id)
								} else {
									SaveQuestion(surveyResponseId, questionId, "textbox", elements[i][elements[i].selectedIndex].id);
								}
							}
						}
					} else {
						for (var index = 0; index < elements[i].children.length; index++) {
							if (elements[i].children[index].nodeName == 'INPUT') {
								if (elements[i].children[index].dataset.preimg) {
									if (elements[i].children[index].checked == false) {
										DeleteQuestion(elements[i].children[index].dataset.preimg);
										elements[i].children[index].removeAttribute("data-preimg");
									}
								} else if (elements[i].children[index].checked) {
									SaveQuestion(surveyResponseId, questionId, type, elements[i].children[index].id)
								}
							}
						}
					}
					break;
				case 'checkbox': // varias respuestas
					for (var index = 0; index < elements[i].children.length; index++) {
						if (elements[i].children[index].nodeName == 'INPUT') {
							if (elements[i].children[index].dataset.preimg) {
								if (elements[i].children[index].checked == false) {
									DeleteQuestion(elements[i].children[index].dataset.preimg);
									elements[i].children[index].removeAttribute("data-preimg");
								}
							} else if (elements[i].children[index].checked) {
								SaveQuestion(surveyResponseId, questionId, type, elements[i].children[index].id)
							}
						}
					}
					break;
				case 'datepicker': // fecha
					if (elements[i].dataset.preimg) {
						if (elements[i].value != null && elements[i].value.length != 0)
							ModifyQuestion(elements[i].dataset.preimg, type, elements[i].value)
						else {
							DeleteQuestion(elements[i].dataset.preimg);
							elements[i].removeAttribute("data-preimg");
						}
					} else if (elements[i].value != null && elements[i].value.length != 0) {
						SaveQuestion(surveyResponseId, questionId, type, elements[i].value)
					}
					break;
				default:
					break;
			}
		}
	}
	LoadSurveyResponse(surveyResponseId);
}


function DisplayOptions(ctrlclass) {
	var elements = document.getElementsByClassName(ctrlclass);
	for (var i = 0; i < elements.length; i++) {
		GetOptionSetValues(elements[i].id, ctrlclass)
	}
}

function getFieldVisibility(visibility) {
	var style = "";
	switch (visibility) {
		case parseInt(VocQuestionProp.visible):
			style = "";
			break;
		case parseInt(VocQuestionProp.invisible):
			style = "style='display: none;'";
			break;
	}
	return style;
}

function strip(html) {
	try {
		var tmp = $(html).text();
		if (tmp == "") {
			return html;
		} else {
			return tmp;
		}
	} catch (err) {
		return html;
	}
}

function DisplayResults(res) {
	var html = '';
	var idx = 0;
	var pageId = null;
	var prevPage = null;
	var sectionId = null;
	var prevSection = null;

	questionFetchs = [];

	//html = "<div id='carousel-example-generic' class='carousel slide' data-ride='carousel' data-interval='false'>";
	//html += "<div class='carousel-inner'>";
	html = '<form id="SignupForm" action="">'

	for (var i in res) {
		var type = res[i].properties.msdyn_questiontype;
		var questionId = res[i].properties.msdyn_questionid;
		var questionText = res[i].properties.msdyn_questiontext;

		var display = getFieldVisibility(res[i].properties.msdyn_visibility);
		var req = res[i].properties.msdyn_required;
		var singleResponseType = (res[i].properties.msdyn_singleresponsetype == parseInt(VocSingleresponsetype.Lista_Despegable) ? "combo" : "radio");
		saveStatusStack[idx] = questionId;
		pageId = pageObjfromQuestionId(questionId, surveyXMLDoc);
		if (pageId.PageId != prevPage) {
			if (pageId.PageId != "") {
				if (prevPage == null) {
					//html += "<div class='item active'><br>";
					html += '<fieldset>'
				} else {
					//html += "</div>";
					//html += "<div class='item'><br>";
					html += "</fieldset>";
					html += '<fieldset>';
				}
				prevPage = pageId.PageId;
			}
		}
		if (pageId.PageId != "") {
			if (questionText.indexOf("atitud") !== -1) {
				latitud = questionId;
			}
			if (questionText.indexOf("ongitud") !== -1) {
				longitud = questionId;
			}
			sectionId = pageId.SectionId;
			if (sectionId != prevSection) {
				html += "<div Class='Seccion'>";
				html += "<h2>" + pageId.SectionName + "</h2>";
				html += "</div>";
				prevSection = sectionId;
			}
			switch (type) {
				case 1: // texto corto				
					html += "<div " + display + " style='width:95%'><div><span>" + questionText +
						"</span> </div><input  data-requerido='" + req + "'data-questiontext='" + questionText + "' onChange='ActionExec(this)' class='textbox form-control input-small col-xs-12 col-sm-12 form-control CampoTexto ' id='" +
						questionId + "' type='text' /></div>";
					break;
				case 2: // texto largo
					html += "<div " + display + " style=''><div><span>" + questionText +
						"</span> </div><textarea  data-requerido='" + req + "'data-questiontext='" + questionText + "' onChange='ActionExec(this)' class='textbox col-xs-12 col-sm-12 form-control CampoTexto' style='resize:none;' id='" +
						questionId + "' cols='40' rows='5' /></textarea></div>";
					break;
				case 5: // varias respuestas
					html += "<div " + display + " style='width:95%;' ><div class = 'checkbox checkbox-primary col-xs-12 col-sm-12 CampoTexto'  id = '" + questionId + "' ><span style='position:relative;left:-20px;'>" + questionText +
						"</span></br> </div></div>";

					break;
				case 4: // respuesta unica
					if (singleResponseType == "combo") {
						if (res[i].properties.axx_origendatos) {
							questionFetchs.push({
								questionId: questionId,
								fetch: res[i].properties.axx_origendatos,
								parentId: res[i].properties.axx_parentquestion
							});
						}
						html += "<div " + display + " style='width:95%'>";
						html += "<div><span>" + questionText + "</span></div></br>";
						html += "<select onchange='ActionExec(this);' class='radio form-control input-small col-xs-12 col-sm-12 CampoDropDown' data-displaytype='" + singleResponseType + "' id = '" + questionId + "' >" +
							"</select></div>";
					} else {
						html += "<div " + display + " style='width:95%;'><div class = 'radio checkbox-inline'  data-displaytype='" + singleResponseType + "' id = '" + questionId + "'><span style='position:relative;left:-20px;'>" + questionText +
							"</span></br> </div></div>";
					}
					break;
				case 6: // fecha
					html += "<div " + display + " style=width='95%' ><div><span>" + questionText +
						"</span> </div><div class='row' ><div><input  data-requerido='" + req + "' onChange='ActionExec(this)' class='datepicker col-xs-12 col-sm-12 form-control CampoTexto' style='width:90%' id='" +
						questionId + "' type='date' /></div></div></div>";
					break;
				case 3: // numerica
					html += "<div " + display + " style='width:95%'><div><span>" + questionText +
						"</span> </div><input  data-requerido='" + req + "'data-questiontext='" + questionText + "' onChange='ActionExec(this)' class='ntextbox col-xs-12 col-sm-12 form-control CampoTexto' id='" +
						questionId + "' type='number' /></div>";
					break;
				case 10: // label
					if (pageId.PageId != "") {
						html += "<span>" + questionText + "</span>";
					}
					break;
				case 16: // Camaraaa y video!!!!			
					html += "<div " + display + " style='width:95%'><div><span>" + questionText +
						"</span><a class='btn btn-primary btn-block CampoTexto'  id='" + questionId + "' onclick='Photo();' role='button'>Captura multimedia</a> </div></div>";
					break;
			}
		}
		idx++;
	}
	html += "</div>";
	//html += "<div class='item'><br><div Class='Seccion'><h2>Encuesta completa</h2></div><div style='width:95%'><div><span><b><font size='2'>¡Muchas gracias!</font></b></span><a class='btn btn-primary btn-block CampoTexto' onclick='SaveEntityPosValidate();' role='button'>Finalizar</a></div></div></div>";
	//html += "<a class='btn btn-primary btn-block' href='HomeReplacement.html' role='button'>Ir al inicio</a>"; //vecinos
	html += "</div>";
	//html += "</div>";
	html += "</fieldset>";

	html +=  '<button id="SaveAccount" type="submit" class="btn btn-primary submit">Submit form</button>'

	html += '</form>;'

	// <!-- Controls -->
	/* html += "<div class='item col-xs-12 col-sm-6 col-sm-offset-3 center '>";
	html += "<div class='container item col-xs-6 center '>";
	html += "<a class='left btn btn-info btn-lg btn-block ' onclick='SaveEntitySurvey();' href='#carousel-example-generic' data-slide='prev'> Atras</a>";
	html += "</div>";
	html += "<div class='container item col-xs-6 center '>";
	html += "<a class='right btn btn-info btn-lg btn-block ' onclick='SaveEntitySurvey();' href='#carousel-example-generic' data-slide='next'>Siguiente </a> ";
	html += "</div>";
	html += "</div>"; */

	document.getElementById('wrapper').innerHTML = html;
	DisplayOptions('checkbox');
	DisplayOptions('radio');
	DisplayActions();
	idEncuestaRespuesta = getParameterByName('idEncuestaRespuesta');
	LoadSurveyResponse();
	estadoEncuesta = getParameterByName('estado');
	if (estadoEncuesta == 282270001) {
		BlockElements();
	}
	MakeWizard();
	getLocation();
}

function MakeWizard() {
	$("#SignupForm").formToWizard({
		submitButton: 'SaveAccount'
	})
}

function sync_vecino() { //vecinos
	MobileCRM.Application.synchronizeOnForeground(false);
	//MobileCRM.Application.synchronize(false);
}

function BlockElements() {
	var clases = ['textbox', 'checkbox', 'radio', 'datepicker', 'ntextbox']
	for (var j = 0; j < clases.length; j++) {
		var elements = document.getElementsByClassName(clases[j]);
		for (var i = 0; i < elements.length; i++) {
			elements[i].setAttribute("disabled", true);
		}
	}
}

function LoadSurveyResponse() {
	if (idEncuestaRespuesta) {
		var xmlFetch = "<fetch no-lock='true' >  <entity name='msdyn_questionresponse' >    <attribute name='msdyn_questionid' />    <attribute name='msdyn_answerid' />    <attribute name='msdyn_valueasdecimal' />    <attribute name='msdyn_valueasstring' />    <attribute name='msdyn_valueasdate' />  <attribute name='msdyn_questionresponseid' /> 	<filter>      <condition attribute='msdyn_surveyresponseid' operator='eq' value='" + idEncuestaRespuesta + "' />    </filter>  </entity></fetch>";
		MobileCRM.FetchXml.Fetch.executeFromXML(xmlFetch, MergeResults, DisplayError, null);
	}
}

function MergeResults(res) {
	for (var j = 0; j < res.length; j++) {
		var elements = document.getElementById(res[j][0].id);
		estadoEncuesta = getParameterByName('estado');
		if (elements) {
			if (res[j][1] != null && res[j][1].id.length != 0) { //msdyn_answerid Multiples respuesta y radio button
				var item = document.getElementById(res[j][1].id);
				item.checked = true;
				item.setAttribute("data-preimg", res[j][5]);
			} else if (res[j][2] != null && res[j][2].length != 0) { // Numerico
				elements.value = res[j][2];
				elements.setAttribute("data-preimg", res[j][5]);
			} else if (res[j][3] != null && res[j][3].length != 0) { //msdyn_valueasstring Texto
				if (elements.dataset.displaytype == "combo") {
					getSelected(res[j][3], elements);
					elements.setAttribute("data-preimg", res[j][5]);
				} else {
					elements.value = res[j][3];
					elements.setAttribute("data-preimg", res[j][5]);
				}
			} else if (res[j][4] != null && res[j][4].length != 0) { //msdyn_valueasdate Fecha 
				elements.value = moment(res[j][4]).format("YYYY-MM-DD"); //				
				elements.setAttribute("data-preimg", res[j][5]);
			}
		}
	}
}

function getSelected(value, sel) {
	var val = value;
	var opts = sel.options;
	for (var opt, j = 0; opt = opts[j]; j++) {
		if (opt.id == val) {
			sel.selectedIndex = j;
			break;
		}
	}
}

/*
function  parseDate(date)  {    
	var  d  = date.getDate(),
		 m  = date.getMonth() + 1,
		 y  = date.getFullYear();
	if (m < 10)
		m = '0' + m.toString();
	if (d < 10)
		d = '0' + d.toString();
	return  y + '-' + m + '-' + d;
}
*/

function Photo() {
	SaveEntitySurvey();
	MobileCRM.UI.FormManager.showEditDialog("msdyn_surveyresponse", idEncuestaRespuesta, null);
}

function error_callback(err) {
	if (err != null) {
		var popup = new MobileCRM.UI.MessageBox(err);
		popup.items = ["Ok"];
		popup.show();
	}
}

function DisplayError(res) {
	var popup = new MobileCRM.UI.MessageBox(res);
	popup.items = ["Ok"];
	popup.show();
}

//Funcion inicio GPS
function getLocation() {
	MobileCRM.Platform.getLocation(
		function (res) {
			if (res.latitude && res.longitude) {
				document.getElementById(latitud).value = res.latitude;
				document.getElementById(longitud).value = res.longitude;
			} else {
				var popup = new MobileCRM.UI.MessageBox("GPS está apagado o no disponible");
				popup.items = ["Ok"];
				popup.show();
			}
		},
		function (err) {
			if (err == "Unsupported") {
				var popup = new MobileCRM.UI.MessageBox("GPS está apagado o no disponible");
				popup.items = ["Ok"];
				popup.show();
			} else if (err == "UserCancel") {
				var popup = new MobileCRM.UI.MessageBox("Encienda el GPS y vuelva a intentar");
				popup.items = ["Ok"];
				popup.show();
				MobileCRM.UI.EntityForm.closeWithoutSaving();
			} else {
				var popup = new MobileCRM.UI.MessageBox(err);
				popup.items = ["Ok"];
				popup.show();
			}
		}
	);
}
//Funcion fin GPS

function OpenApplication() {
	var surveyId = GetCookieByName('idEncuesta');
	if (surveyId != null) {
		window.location.href = 'HomeEncuesta.html?idEncuesta=' + surveyId;
	}
	// else
	// {
	// window.location.href= 'Ale/RESCO-JS.html';
	// }
}