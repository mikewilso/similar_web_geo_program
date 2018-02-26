"use strict";

var args = process.argv;
var fsp = require('fs-promise');
var Promise = require('bluebird');
var rp = require('request-promise');
var country_code_dictionary = require("./country_codes.js");
var file_location;
var SITE_ARRAY;
var COMPLETE_RESULTS;
var api_key = "API KEY HERE";
var RESULTFILENAME = "results.csv";


function checkArg(){

	if(args.length !== 3){
		console.log("usage: node sim_web_geo.js <loc of file>");
		process.exit();
	}
	else {
		file_location = args[2];
	}
}


function openFile(){

	return fsp.readFile(file_location, 'utf8').then(function(contents,err){

	  	if (err) {
	  		if (err.code === 'ENOENT') {
                console.log('File not found!');
			}
			else {
                console.log(err);
    			process.exit();
            }
	    }
	    return contents.replace( /\n/g, " " ).split(" ");
    });
}


function buildURI(website){

	var uriString;
	var dateBefore, dateNow;
	var dateObj = new Date();
	var yearNow = dateObj.getUTCFullYear();
	var yearBefore = dateObj.getUTCFullYear();
	var monthNow = dateObj.getUTCMonth();
	var monthBefore = monthNow - 3;
	
	if(monthBefore < 1){
		monthBefore += 12;
		yearBefore -= 1;
	}
	if (monthBefore < 10) {
		monthBefore = "0" + monthBefore;
	}
	monthNow -= 1;
	if(monthNow < 1){
		monthNow = 12;
		yearNow = yearBefore;
	}
	if (monthNow < 10) {
		monthNow = "0" + monthNow;
	}

	dateBefore = yearBefore + "-" + monthBefore;
	dateNow = yearNow + "-" + monthNow;

	uriString = "https://api.similarweb.com/v1/website/" + website + "/Geo/traffic-by-country?api_key=" + api_key + "&start_date=" + dateBefore + "&end_date=" + dateNow + "&main_domain_only=false&format=json";
	return uriString;
}


function getCountryNameFromCode(code){
	return country_code_dictionary[code];
}


function getDataForSite(website){

	var options = {uri: buildURI(website)};
	return rp(options).then(function(response){

		var resultsString = "";
		var result = JSON.parse(response);
		var metaData = result.meta.request;
		var resultData = result.records;
		var currentSite = metaData.domain;
		
		var innerStrings = "";
		for(var i = 0; i < 5; i++){
			var currentRecord = resultData[i];
			var currentCountry = getCountryNameFromCode(resultData[i].country);

			if(i === 0)
				innerStrings += buildResultString(currentRecord, currentCountry);
			else
				innerStrings += "," + buildResultString(currentRecord, currentCountry);
			
		}

		resultsString = currentSite + "," + innerStrings;
		return resultsString;

	}).catch(function(error){
		console.log(error);
	});
}


function buildResultString(current, country){
	
	var countryDataString = "";

	countryDataString += country + "," + 
					current.share + "," + 
					current.visits + "," + 
					current.pages_per_visit + "," + 
					current.average_time + "," + 
					current.bounce_rate + "," + 
					current.rank + "\n";
	
	return countryDataString;
}


function printResults(){

	var writeLinesPromiseArray = [];
	writeLinesPromiseArray[0] = fsp.appendFile(RESULTFILENAME, ("SITE,TOP 5,SHARE,VISITS,PAGES_PER_VISIT,AVERAGE_TIME,BOUNCE_RATE,RANK" + "\n"));
	
    for(var i = 1; i <= COMPLETE_RESULTS.length; i++){
		writeLinesPromiseArray[i] = fsp.appendFile(RESULTFILENAME, COMPLETE_RESULTS[i - 1]);
	}

	return Promise.all(writeLinesPromiseArray);
}


//START MAIN
checkArg();

openFile().then(function(site_array){

    //Make site_array accessible to scope
	SITE_ARRAY = site_array;

	var sitePromiseArray = [];

	for(var i = 0; i < site_array.length; i++){
		sitePromiseArray[i] = getDataForSite(site_array[i]);
	}

	return Promise.all(sitePromiseArray).then(function(results){
		return COMPLETE_RESULTS = results;
	});

}).then(function(results){
	printResults();
});
//END MAIN