const appConfig = {
  APP_PREFIX: "textio_",
  get DB_KEY_PREFIX() {
    return this.APP_PREFIX + "data_";
  }
};

const uiConfig = {
  labels: {
    not_saved_doc: "untitled document"
  }
};

const	textareaMain = document.querySelector("#textareaMain");
const textareaEval = document.querySelector("#textareaEval");
const	flashcardsSection = document.querySelector("#flashcards-section"); 
const	currentStepText = document.querySelector("#currentStep"); 
const	btnGoBack = document.querySelector("#goBack"); 
const	cardFront = document.querySelector(".card-front");
const	cardBack = document.querySelector(".card-back > pre"); //document.querySelector(".card-back");
const textareaLogs = document.getElementById('textarea-logs');
const selectTtsVoices = document.getElementById('tts-voices');  
const currentDocName = document.getElementById('currentDocName');    

var logs = [];
var historySteps = [];
var synth = speechSynthesis;
var voices_all;
var voices_filtered;
var supported_tts_languages = ['cs-CZ', 'en-US', 'en-GB'];
let currentDoc = null;

textareaEval.value = "t = textareaMain;\ntv = t.value;\nr = tv.replace(/,/g,'|');\nt.value = r;";			

// Functions
function ShuffleArray(inputArray) {
  var array = inputArray;
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

function setCurrentDoc(doc) {
  console.info(doc);
  currentDoc = doc;
  if (doc === null) {
    currentDocName.innerText = uiConfig.labels.not_saved_doc;
  } else if (doc && typeof doc === "object" && doc.name) {
    currentDocName.innerText = doc.name;
  }
}

function RandomIndex(range){
  var random = Math.random();
  return Math.floor(random * range);
}

function generateId(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}

function Transform(callback) {
  if(callback) {
    HistoryAdd();
    var result = callback(textareaMain.value);
    textareaMain.value = result;
  }      
}

function LoadFile(fileHref) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", fileHref, false);
  xmlhttp.send();
  var result = xmlhttp.responseText;
  textareaMain.value = result;
  setCurrentDoc(null);
  HistoryReset();
}

function ClickHiddenFileInput() {  
  document.getElementById('fileInputHidden').click();
}

function ReadFile(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    textareaMain.value = e.target.result;
    setCurrentDoc(null);
    HistoryReset();
  }
  reader.readAsText(file);
}

function OpenLsRecord(id) {
  var record = JSON.parse(localStorage.getItem(appConfig.DB_KEY_PREFIX + id));
  if (record && record.content) {    
    textareaMain.value = record.content;
    setCurrentDoc(record);
    HistoryReset();
  }
}

// Download file = Save file
function DownloadFile() {
  var userInput = prompt("File name:");
  if (userInput !== null && userInput !== "") {
    fileName = 'textio - ' + userInput.trim();
    var hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/plain;charset=utf-8,' + encodeURI(textareaMain.value);
    hiddenElement.target = '_blank';
    hiddenElement.download = fileName;
    hiddenElement.click();
  }				
}

function SaveAsNewToLs(){
  var userInput = prompt("Name:");
  if (userInput !== null && userInput !== "") {
    const id = generateId();
    var key = appConfig.DB_KEY_PREFIX + id;
    var record = {
      "id": id,
      "name": userInput.trim(),        
      "content": textareaMain.value,
      "created": Date.now(),
      "timestamp": GetDateTime(),
    };
    var value = JSON.stringify(record);
    localStorage.setItem(key, value);
    PopulateLsRecords();
    setCurrentDoc(record);
  }        	      
}

function SaveOpenedRecord() {
  if (currentDoc !== null && currentDoc.id) {
    var confirmation = confirm(`Are you sure you want to save and rewrite the ${(currentDoc && currentDoc.name) ? '"' + currentDoc.name + '"' : ''}?`);
    if (confirmation) {
      var key = appConfig.DB_KEY_PREFIX + currentDoc.id;
      var record = currentDoc;
      record.content = textareaMain.value;      
      var value = JSON.stringify(record);
      localStorage.setItem(key, value);
      //PopulateLsRecords();
      setCurrentDoc(record);
    }          
  
  } else {
    SaveAsNewToLs();
  }
}

function ListLsRecords() {
  const savedKeys = Object.keys(localStorage); 
  const filteredKeys = savedKeys.filter(key => key.startsWith(appConfig.DB_KEY_PREFIX));
  const savedRecords = filteredKeys.map(key => {
      var record = JSON.parse(localStorage.getItem(key));
      var id = record.id;
      var name = record.name;
      var content = record.content;
      var created = record.created;
      var timestamp = record.timestamp;
      return {
        id: id, 
        name: name, 
        content: content, 
        lcKey: key, 
        created: created,
        timestamp: timestamp};
  });
  return savedRecords;
}

function PopulateLsRecords() {
  var records = ListLsRecords();
  //console.log(records);
  var optgroup = document.getElementById('optgroupLcRecords');
  optgroup.innerHTML = ""; // Clear existing options
  records.forEach((item) => {
    //console.log(item);
    const option = document.createElement("option");
    option.value = "OpenLsRecord('"+ item.id +"')"; 
    option.text = item.name;
    optgroup.appendChild(option);
  });
}

function RemoveLsRecord(){
  if (currentDoc !== null && currentDoc.id) {
    var confirmation = confirm(`Are you sure you want to remove ${(currentDoc && currentDoc.name) ? '"' + currentDoc.name + '"' : ''}?`);
    if (confirmation) {
      var key = appConfig.DB_KEY_PREFIX + currentDoc.id;
      localStorage.removeItem(key);
      textareaMain.value = "";
      PopulateLsRecords();
      setCurrentDoc(null);
      HistoryReset();    
    }  
  }  	      
}

function ClearLS() {
  var confirmation = confirm("Are you sure you want to clear the local storage?");
  if (confirmation) {
    var records = ListLsRecords();
    records.forEach(function(item){
      localStorage.removeItem(appConfig.DB_KEY_PREFIX + item.id);
    });
    PopulateLsRecords(); 
    setCurrentDoc(null);
  }
}

function parseItemsFromXmlTag(inputText) {

  function parseTagContent(tagName) {
    // Adjust regex to make `fieldSeparator` optional
    const tagMatch = inputText.match(new RegExp(`<${tagName}[^>]*?separator="([^"]+)"(?:[^>]*?fieldSeparator="([^"]+)")?[^>]*?>([\\s\\S]*?)<\\/${tagName}>`, "i"));
    console.log(tagMatch);

    if (tagMatch && tagMatch[3].trim() !== "") {
      const separator = tagMatch[1];             // separator value
      const fieldSeparator = tagMatch[2] || "";  // fieldSeparator value, or empty string if not provided
      const content = tagMatch[3].trim();

      // Split content by the main separator and process each item
      return content
        .split(separator)
        .map(item => item.trim())
        .filter(item => item !== "")
        .map(item => fieldSeparator ? item.split(fieldSeparator).map(field => field.trim()) : [item]);  
        // If fieldSeparator exists, split by it; otherwise, keep item as a single element array
    }
    return null;  // Return null if the tag has no content or is not found
  }

  return parseTagContent("items") || parseTagContent("item-group") || parseTagContent("data-list") || null;
}

function CreateFlashCards() {        
  window.cardsAll = RemoveEmptyLines(textareaMain.value)
    .trim()
    .split("\n")
    .map(item => item.split(/\.{4}|=|\t/).map(item => item.trim() ))
    .filter(item => item[0] !== "");
  window.cardsShuffled = ShuffleArray(cardsAll);
  flashcardsSection.style.display = 'block';
  window.cardIndex = -1; // -1 is value for starting position, then NextCart function will iterate it to 0
  NextCard();
} 

function CreateFlashCardsFromItemGroup() {
  const parsedItems = parseItemsFromXmlTag(textareaMain.value);
  if (parsedItems) {
    window.cardsAll = parsedItems; 
    window.cardsShuffled = ShuffleArray(cardsAll);
    flashcardsSection.style.display = 'block';
    window.cardIndex = -1;  // Start at -1, NextCard will increment to 0
    NextCard();
  } else {
    alert(`No items found in the document ${(currentDoc && currentDoc.name) ? '"' + currentDoc.name + '"' : ''}`);
  }
  
}

function NextCard() {       
  if(cardIndex >= window.cardsShuffled.length-1){
    // jump from last cart to first
    cardIndex = 0;
  } else {
    cardIndex++;
  }
  window.currentCard = cardsShuffled[cardIndex]; //window.cardsAll[cardIndex];
  cardFront.innerText = currentCard[0]; 
  cardBack.innerText = "";
  window.currentCardBackLoop = 1;
  if (document.querySelector('#checkbox-auto-speak').checked) {
    Speak(currentCard[0]);
  }
}

function RandomCard() {
  window.currentCard =  window.cardsAll[RandomIndex(window.cardsAll.length)];
  cardFront.innerHTML = currentCard[0];   
  cardBack.innerText = ""; 
  window.currentCardBackLoop = 1;
}

function TurnCard() {
  if(currentCard.length >= 2) {
    window.currentCardBack = currentCard[window.currentCardBackLoop];    
    cardBack.innerText = window.currentCardBack;
    if(window.currentCardBackLoop < currentCard.length - 1) {
      window.currentCardBackLoop ++;
    } else {
      window.currentCardBackLoop = 1;
    }
  } else {
    cardBack.innerText = "-- no back side --";//document.querySelector(".card-back").innerHTML = "-- no back side --";
  }
}

function CloseFlashCards() {
  flashcardsSection.style.display = 'none';
  StopSpeaking();
}

// TTS
// Sources: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API      

function VoiceList () {
  const IntervalGetVoices = setInterval(function() {
    try {    
      voices_all = synth.getVoices();
      if (voices_all.length) {
        clearInterval(IntervalGetVoices);
        
        voices_filtered = voices_all.filter(v => supported_tts_languages.includes(v.lang.replace('_','-')) );
        selectTtsVoices.innerHTML = "";
        for (var voice of voices_filtered) {                
          Log('voice lang: ' + voice.lang );
          var option = document.createElement("option");
          option.value = voice.voiceURI;
          option.text = voice.lang +" - "+ voice.name;
          selectTtsVoices.appendChild(option);
        }
        selectTtsVoices.selectedIndex = '0';
      } else {
        Log("Voices are not available yet");
      }
    } catch (e) {
      Log(e);
    }
  }, 200);
}

function Speak(textToRead){
  if (!window.speechSynthesis){
    alert("Your device does not support the SpeechSynthesis API");
  }
  else {
    if (textToRead === "") {
      alert('No text to read!');
    } else if (voices_filtered.length) {
      speechSynthesis.cancel();
      let availableVoices = voices_filtered; //speechSynthesis.getVoices();
      let utterance = new SpeechSynthesisUtterance();
      utterance.text = textToRead;
      utterance.voice = availableVoices.find(o => o.voiceURI === selectTtsVoices.value) || availableVoices[0];
      utterance.pitch = document.getElementById('tts-pitch').value;
      utterance.rate = document.getElementById('tts-rate').value;
      speechSynthesis.speak(utterance);
    }
  }
}

function StopSpeaking(){
  if (!window.speechSynthesis){
    alert("Your device does not support the SpeechSynthesis API");
  } else {
    speechSynthesis.cancel();
  }
}

function GetDateTime(){
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  const formattedDate = `${year}${month}${day}_${hour}${minute}${second}`;
  return formattedDate;
}

function GetTextareaMainValue() {
  return textareaMain ? textareaMain.value : null;
}

function UpdateTextareaMainValue(newText) {
  if (textareaMain) {
    textareaMain.value = newText;
  }
}

function Log(message) {
  if (message) {
    logs.push(message);
  }
  textareaLogs.value = logs.join('\n\n');
}

function HistoryAdd() {
  historySteps.push(textareaMain.value);
  currentStepText.innerHTML = historySteps.length;
  btnGoBack.disabled = false;
}

function HistoryBack() {
  if(historySteps.length > 0){
    UpdateTextareaMainValue(historySteps[historySteps.length-1]);
    historySteps.pop();
    currentStep.innerHTML = historySteps.length;
    if(historySteps.length == 0) {
      btnGoBack.disabled = true;
    }
  } 
}

function HistoryReset() {
  historySteps = [];
  currentStepText.innerHTML = historySteps.length;
  btnGoBack.disabled = true;
}

function ToggleVisibility ( selector, triggeringElementId ) {
  var element = document.querySelector(selector);
  var triggeringElement = document.getElementById(triggeringElementId);
  if (element) {
    if (element.style.display === "none") {
      element.style.display = "block";
      if (triggeringElement) {
        triggeringElement.innerHTML = triggeringElement.innerHTML.replace('Show', 'Hide');
      }
    } else {
      element.style.display = "none";
      if (triggeringElement) {
        triggeringElement.innerHTML = triggeringElement.innerHTML.replace('Hide', 'Show');
      }
    }
  }
}


// Transformation functions

function yamlMultiDocToVocabularyItems(input) {
  return input.replace(/en: /g,'===\n').replace(/type: \w*\n/g,'').replace(/cs: /g,'');
}

function ParseMarkdownLinks(input) {
  rows = input.replace(/\n\n/g,'\n').split('\n');
  links = [];
  for ( let row of rows ){
      var splitRow = row.trim().split('](');
      if (splitRow && splitRow[1]) {
    links.push(splitRow[1].trim().replace(')',''));
      }
  }
  if ( links && links.length > 0 ){
      return links.join('\n');
  }
}

function RemoveLineBreaks(input) {
  return input.replace(/\n/g,'');
}

function LinesToList(input) {
  return input.replace(/\n$/g,'').replace(/\n/g,',');
}

function ListToLines(input) {
  return input.replace(/,/g,'\n');
}

function RemoveEmptyLines(input) {
  return input.replace(/\n\s*\n/g,'\n').replace(/^\s*\n/,'');
}

function IncreaseLineBreaks(input) {
  return input.replace(/\n$/,'').replace(/\n{2,}/g,'\n\n').replace(/\n/g,'\n\n').replace(/\n{4,}/g,'\n\n\n\n');
}

function ShowLineBreaks(input) {
  return input.replace(/\n/g,'~\n');
}

function ListToArray(input) {
  return '["'+ input.replace(/,/g,'","') +'"]';
}

var char_map = {
  /* ** Latin ** */
  'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A', 'Æ': 'AE', 'Ç': 'C',
  'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E', 'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
  'Ð': 'D', 'Ñ': 'N', 'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O', 'Ő': 'O',
  'Ø': 'O', 'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U', 'Ű': 'U', 'Ý': 'Y', 'Þ': 'TH',
  'ß': 'ss',
  'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'æ': 'ae', 'ç': 'c',
  'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e', 'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
  'ð': 'd', 'ñ': 'n', 'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ő': 'o',
  'ø': 'o', 'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u', 'ű': 'u', 'ý': 'y', 'þ': 'th', 'ÿ': 'y',
  /* ** Czech ** */
  'Č': 'C', 'Ď': 'D', 'Ě': 'E', 'Ň': 'N', 'Ř': 'R', 'Š': 'S', 'Ť': 'T', 'Ů': 'U', 'Ž': 'Z',
  'č': 'c', 'ď': 'd', 'ě': 'e', 'ň': 'n', 'ř': 'r', 'š': 's', 'ť': 't', 'ů': 'u', 'ž': 'z'
};    

function RemoveDiacritics(input) {
  var text = input;
  var result = '';
  for (var i=0;i<text.length;i++) {
    if (char_map[text[i]])
      result += char_map[text[i]];
    else
      result += text[i];
  }
  return result;
}

function ConvertToSlug(input) {
  var text = input;
  var result = '';
  for (var i=0;i<text.length;i++) {
      if (char_map[text[i]])
          result += char_map[text[i]];
      else
          result += text[i];
  }
  return result.toLowerCase().replace(/[^\w |\n]+/g,'').replace(/ +|\n+/g,'-');
}

function ExcelColumnsToJSONMap(input) {
  var rows = input.split("\n");
  if(rows[rows.length-1] == "") {
    rows.pop();
  }
  var result = "{\n";
  if(rows.length > 0) {
    for(var i=0,len=rows.length; i<len; i++) {
      var row = rows[i].split("\t");
      if(row.length == 2) {
          result += "\""+ row[0] +"\":\""+ row[1] +"\"";
          if(i != rows.length-1) {
            result += ",\n";
          }
      }
    }
    result += "\n}";
  }
  return result;
}
    
function ListSort(input) {
  return input.split(/[,\|]/).sort();
}
  
function RemoveSpaces(input) {
  return input.trim().replace(/ /g, '');
}
  
function RemoveSpaces(input) {
  return input.trim().replace(/ /g, '');
}
  
function EvalCustomScript() {
  HistoryAdd();
  eval(textareaEval.value);
}

function TTSedit(input) {
  var b = input.toLowerCase().split("\n");
  var c = [];
  b.forEach(function(item){
    var line = item;
    var firstChar = line.charAt(0);
    var lastChar = line.charAt(line.length-1);
    if(line) {
      if( !/\.|,|:/.test(lastChar) ){
        line += "."
      }
      line = firstChar.toUpperCase() +""+ line.slice(1);
    }
    c.push(line);
  });
  return c.join("\n");
}

function EncodeBase64(input) {
  return btoa(input);
}

function DecodeBase64(input) {
  return atob(input);
}

function EncodeUri(input) {
  return encodeURI(input);           
}

//Encoding reference incl. list of characters: https://www.w3schools.com/tags/ref_urlencode.ASP
var url_encode_map = {
  '%20': ' ', '%3A': ':', '%2F': '/', '%2B': '+', '%2C': ',', '%2D': '-'
};

function DecodeUri(input) {
  var result = decodeURI(input);
  for(const phrase in url_encode_map) {
    result = result.replace(new RegExp(phrase,'g'), url_encode_map[phrase]);
  }
  return result;
}

// page initialization      
window.addEventListener('DOMContentLoaded', function() {
  PopulateLsRecords();
  VoiceList();
  currentDocName.innerText = uiConfig.labels.not_saved_doc;
});