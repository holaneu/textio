const appConfigs = {
  app_prefix: "textio_",
  get db_key_prefix() {
    return this.app_prefix + "data_";
  }
};

const uiConfigs = {
  labels: {
    not_saved_doc: "untitled document"
  }
};

const	textareaMain = document.querySelector("#textareaMain");
const textareaEval = document.querySelector("#textareaEval");
const	flashcardsSection = document.querySelector("#flashcards-section"); 
const	currentStepText = document.querySelector("#currentStep"); 
const	btnHistoryBack = document.querySelector("#historyBack"); 
const	cardFront = document.querySelector(".card-front");
const	cardBack = document.querySelector(".card-back"); //document.querySelector(".card-back");
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

document.getElementById('resetEditor').addEventListener('click', () => {
  textareaMain.value = "";
  setCurrentDoc(null);
  HistoryReset();
});

document.getElementById('historyBack').addEventListener('click', () => {
  HistoryBack();
});

document.getElementById('removeDoc').addEventListener('click', () => {
  RemoveDoc();
});

/*
document.getElementById('createFlashcards').addEventListener('click', () => {
  CreateFlashCards();
});

document.getElementById('CreateFlashCardsFromItemGroup').addEventListener('click', () => {
  CreateFlashCardsFromItemGroup();
});
*/

document.getElementById('showCustomCode').addEventListener('change', (event) => {
  const customCodeSection = document.getElementById('customCode');
  if (event.target.checked) {
    customCodeSection.classList.remove('hidden'); 
  } else {
    customCodeSection.classList.add('hidden'); 
  }
});

document.getElementById('showLogs').addEventListener('change', (event) => {
  const customCodeSection = document.getElementById('logs');
  if (event.target.checked) {
    customCodeSection.classList.remove('hidden'); 
  } else {
    customCodeSection.classList.add('hidden'); 
  }
});

document.getElementById('insertOptions').addEventListener('change', (event) => {
  const selectedValue = event.target.value;
  
  switch(selectedValue) {
    case "insertDate":
      insertAtCursor(textareaMain, GetDateTime("YYYY-MM-DD"));
      break;
    case "insertSeparator":
      insertAtCursor(textareaMain, '\n-----\n');
      break;
    case "insertFieldSeparator":
      insertAtCursor(textareaMain, '===');
      break;
    case "insertRandomId":
      insertAtCursor(textareaMain, generateId());
      break;
  }

  event.target.selectedIndex = 0;
  event.target.blur();
});

document.getElementById('saveOptions').addEventListener('change', (event) => {
  const selectedValue = event.target.value;
  eval(selectedValue+"()");
  event.target.selectedIndex = 0;
  event.target.blur();
});


/*
// proven functions
*/

// Navigate between screens
function navigateToScreen(screenId) {
  // Hide all screens
  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => screen.classList.add('hidden'));
  // Show the targeted screen
  document.getElementById(screenId).classList.remove('hidden');
}

function sanitizeInput(textarea) {
  textarea.value = textarea.value.replace(/<script.*?>.*?<\/script>/gi, '').replace(/<.*?>/g, '');
}

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
    currentDocName.innerText = uiConfigs.labels.not_saved_doc;
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

function CallFunc(callback) {
  if(callback) {
    HistoryAdd();
    var result = callback(textareaMain.value);
    // Check the type of result and format it accordingly
    if (typeof result === "object") {
      // If result is an object or array, stringify it with formatting for readability
      textareaMain.value = JSON.stringify(result, null, 2); // 2 spaces for indentation
    } else {
      // If result is not an object, directly assign it
      textareaMain.value = result;
    }
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

function OpenDoc(id) {
  var record = JSON.parse(localStorage.getItem(appConfigs.db_key_prefix + id));
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

function SaveAsNewDoc() {
  const userInput = prompt("Name:");
  if (userInput !== null && userInput.trim() !== "") {
    const id = generateId();
    const key = appConfigs.db_key_prefix + id;
    const currentTime = Date.now(); // Current timestamp
    const record = {
      id: id,
      name: userInput.trim(),
      content: textareaMain.value,
      created: currentTime,
      modified: currentTime, // Include modified timestamp
      timestamp: GetDateTime()
    };
    const value = JSON.stringify(record);
    localStorage.setItem(key, value);
    populateData();
    setCurrentDoc(record);
  }
}

function OverwriteOpenedDoc() {
  if (currentDoc !== null && currentDoc.id) {
    const confirmation = confirm(
      `Are you sure you want to save and rewrite the ${(currentDoc && currentDoc.name) ? '"' + currentDoc.name + '"' : ''}?`
    );
    if (confirmation) {
      const key = appConfigs.db_key_prefix + currentDoc.id;
      const currentTime = Date.now(); // Current timestamp
      const record = {
        ...currentDoc, // Preserve existing properties
        content: textareaMain.value,
        modified: currentTime // Update the modified timestamp
      };
      const value = JSON.stringify(record);
      localStorage.setItem(key, value);
      setCurrentDoc(record);
    }
  } else {
    SaveAsNewDoc(); // Fallback to creating a new document if no current doc exists
  }
}


function loadLocalData() {
  const savedKeys = Object.keys(localStorage); 
  const filteredKeys = savedKeys.filter(key => key.startsWith(appConfigs.db_key_prefix));
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
  
  // Load user profile from local storage
  function loadUserProfile() {
    const profile = localStorage.getItem(appConfigs.userProfileStorageKey);
    return profile ? JSON.parse(profile) : null;
  }
  
  function populateData() {
    var records = loadLocalData();
    records.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
    var optgroup = document.getElementById('optgroupLcRecords');
    optgroup.innerHTML = "";
    records.forEach((item) => {
      const option = document.createElement("option");
      option.value = "OpenDoc('"+ item.id +"')"; 
      option.text = item.name;
      optgroup.appendChild(option);
    });
  }
  
  function RemoveDoc(){
    if (currentDoc !== null && currentDoc.id) {
      var confirmation = confirm(`Are you sure you want to remove ${(currentDoc && currentDoc.name) ? '"' + currentDoc.name + '"' : ''}?`);
      if (confirmation) {
        var key = appConfigs.db_key_prefix + currentDoc.id;
        localStorage.removeItem(key);
        textareaMain.value = "";
        populateData();
        setCurrentDoc(null);
        HistoryReset();    
      }  
    }  	      
  }
  
  function RemoveAppData() {
    var confirmation = confirm('Are you realy sure you want to remove all "textio_data_" items from local storage?');
    if (confirmation) {
      var records = loadLocalData();
      records.forEach(function(item){
        localStorage.removeItem(appConfigs.db_key_prefix + item.id);
      });
      populateData(); 
      setCurrentDoc(null);
    }
  }
  
  function parseItemsFromXmlTag(inputText) {
    
    function parseTagContent(tagName) {
      // Adjust regex to make `fieldSeparator` optional
      const tagMatch = inputText.match(new RegExp(`<${tagName}[^>]*?separator="([^"]+)"(?:[^>]*?fieldSeparator="([^"]+)")?[^>]*?>([\\s\\S]*?)<\\/${tagName}>`, "i"));
      console.log(tagMatch);
      
      if (tagMatch && tagMatch[3].trim() !== "") {
        function mapSeparator(input) {
          if (!input) {
            return null;
          } 
          let output = input;
          switch(true) {
            case /newline|new line/.test(input):
              output = "\n";
              break;
            case /empty row|empty-row|empty line|empty-line/.test(input):
              output = "\n\n";
              break;
          }
          return output;
        }

        const separator = mapSeparator(tagMatch[1]);             // separator value
        const fieldSeparator = mapSeparator(tagMatch[2]) || "";  // fieldSeparator value, or empty string if not provided
        const content = tagMatch[3].trim();        
        
        // Split content by the main separator and process each item
        return content
        .split(separator)
        .map(item => item.trim())
        .filter(item => item !== "")
        .map(item => fieldSeparator ? item.split(fieldSeparator).map(field => field.trim().replace(/\w{2}: /g,'')) : [item]);  
        // If fieldSeparator exists, split by it; otherwise, keep item as a single element array
      }
      return null;  // Return null if the tag has no content or is not found
    }
    
    return parseTagContent("items") || parseTagContent("item-group") || parseTagContent("data-list") || null;
  }

  function parseAllTagsFromXml(inputData) {
    // Helper function to parse attributes from a tag string
    function parseAttributes(tagString) {
      const attributes = {};
      const attrRegex = /(\w+)="([^"]*)"/g;
      let match;
      while ((match = attrRegex.exec(tagString)) !== null) {
        attributes[match[1]] = match[2];
      }
      return attributes;
    }
  
    // Helper function to parse a single tag and its content
    function parseTag(tagMatch) {
      const tagName = tagMatch[1]; // The tag name
      const attributesString = tagMatch[2]; // The attributes part of the tag
      const content = tagMatch[3].trim(); // The inner content
  
      return {
        tag_name: tagName,
        tag_attributes: parseAttributes(attributesString || ""),
        inner_content: content
      };
    }
  
    // Enhanced regex for matching tags and their content
    const tagRegex = /<([\w-]+)([^>]*)>([\s\S]*?)<\/\1>/g;
    const result = [];
    let match;
  
    // Use a loop to ensure all tags are matched and processed
    while ((match = tagRegex.exec(inputData)) !== null) {
      result.push(parseTag(match));
    }
  
    return result.length > 0 ? result : null; // Return null if no tags were found
  }
  
  function CreateFlashCards() {        
    window.cardsAll = RemoveEmptyLines(textareaMain.value)
    .trim()
    .split("\n")
    .map(item => item.split(/\.{4}|=|\t/).map(item => item.trim() ))
    .filter(item => item[0] !== "");
    window.cardsShuffled = ShuffleArray(cardsAll);
    window.cardIndex = -1; // -1 is value for starting position, then NextCard function will iterate it to 0
    navigateToScreen("flashcards-screen");
    moveCard("next");
  } 
  
  function CreateFlashCardsFromItemGroup() {
    const parsedItems = parseItemsFromXmlTag(textareaMain.value);
    if (parsedItems) {
      window.cardsAll = parsedItems; 
      window.cardsShuffled = ShuffleArray(cardsAll);
      window.cardIndex = -1;  // Start at -1, NextCard will increment to 0
      navigateToScreen("flashcards-screen");
      moveCard("next");
    } else {
      //alert(`No items found in the document ${(currentDoc && currentDoc.name) ? '"' + currentDoc.name + '"' : ''}`);
      CreateFlashCards();
    }    
  }

  function moveCard(direction) {
    StopSpeaking();

    if (direction === "next") {
        cardIndex = (cardIndex >= window.cardsShuffled.length - 1) ? 0 : cardIndex + 1;
    } else if (direction === "previous") {
        cardIndex = (cardIndex <= 0) ? window.cardsShuffled.length - 1 : cardIndex - 1;
    } else {
        console.error(`Invalid direction: ${direction}. Use "next" or "previous".`);
        return;
    }

    window.currentCard = cardsShuffled[cardIndex]; // Update the current card
    cardFront.innerText = currentCard[0];
    cardBack.innerText = "";
    window.currentCardBackLoop = 1; // Reset back-side loop

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
  
  // TTS - source: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API      
  
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
  
  function GetDateTime(outputFormat){
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    let formattedDate;

    switch(outputFormat) {
      case "YYYY-MM-DD":
        formattedDate = `${year}-${month}-${day}`;
        break;
      case "YYYYMMDD":
        formattedDate = `${year}${month}${day}`;
        break;
      default:
        formattedDate = `${year}${month}${day}_${hour}${minute}${second}`;;
        break
    }

    return formattedDate;
  }
  
  function getEditorContent() {
    return textareaMain ? textareaMain.value : null;
  }
  
  function setEditorContent(newText) {
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
    btnHistoryBack.disabled = false;
  }
  
  function HistoryBack() {
    if(historySteps.length > 0){
      setEditorContent(historySteps[historySteps.length-1]);
      historySteps.pop();
      currentStep.innerHTML = historySteps.length;
      if(historySteps.length == 0) {
        btnHistoryBack.disabled = true;
      }
    } 
  }
  
  function HistoryReset() {
    historySteps = [];
    currentStepText.innerHTML = historySteps.length;
    btnHistoryBack.disabled = true;
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
  
  function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    textarea.value = textarea.value.substring(0, start) + text + textarea.value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
  }
  
  function exportData() {
    const appPrefix = appConfigs.db_key_prefix;
    const filteredData = Object.keys(localStorage)
    .filter(key => key.startsWith(appPrefix))
    .map(key => {
      return { key: key, value: JSON.parse(localStorage.getItem(key)) }; 
    });
    
    const json = JSON.stringify(filteredData, null, 2);
    
    const blob = new Blob([json], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'textio_export_'+ GetDateTime('YYYYMMDD') +'.json';
    link.click();
    
    URL.revokeObjectURL(link.href);
  }
  
  function importData() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json';
    
    fileInput.addEventListener('change', event => {
      const file = event.target.files[0];
      if (!file) {
        alert("No file selected.");
        return;
      }
      
      const reader = new FileReader();
      
      reader.onload = function(e) {
        try {
          const data = JSON.parse(e.target.result);
          
          if (Array.isArray(data)) {
            const appPrefix = appConfigs.db_key_prefix;
            
            data.forEach(item => {
              if (!item.key || !item.value || typeof item.key !== 'string') {
                console.warn('Invalid item format:', item);
                return; // Skip invalid items
              }
              
              // Validate the key prefix
              if (!item.key.startsWith(appPrefix)) {
                console.warn('Key does not start with app prefix:', item.key);
                return; // Skip items with invalid keys
              }
              
              // Check for duplicates and handle conflicts
              const existingItem = localStorage.getItem(item.key);
              if (existingItem) {
                const existingValue = JSON.parse(existingItem);
                
                // Compare modified timestamps to resolve conflict
                const existingModified = existingValue.modified || 0;
                const newModified = item.value.modified || 0;
                
                if (newModified > existingModified) {
                  console.info(`Replacing older item with key: ${item.key}`);
                  localStorage.setItem(item.key, JSON.stringify(item.value));
                } else {
                  console.info(`Keeping existing item for key: ${item.key}`);
                }
              } else {
                // No conflict, directly save the new item
                localStorage.setItem(item.key, JSON.stringify(item.value));
              }
            });
            
            alert('Data successfully imported into localStorage.');
            populateData(); // Refresh UI if necessary
          } else {
            alert('Invalid JSON format. The file must contain an array of objects with "key" and "value" properties.');
          }
        } catch (error) {
          console.error('Error importing data:', error);
          alert('Failed to import data. Please ensure the file is a valid JSON.');
        }
      };
      
      reader.readAsText(file); // Read the file as text
    });
    
    // Trigger the file input dialog
    fileInput.click();
  }  
  
  // Universal Modal Functions
  function openModal(contentId) {
    const modal = document.getElementById("universalModal");
    const content = document.getElementById(contentId);
    if (modal && content) {
      modal.classList.remove("hidden");
      content.classList.remove("hidden");
    }
  }

  function closeModal() {
    const modal = document.getElementById("universalModal");    
    if (modal) {
      const allContent = modal.querySelectorAll(".modal-body > div");
      modal.classList.add("hidden");
      allContent.forEach(content => content.classList.add("hidden"));
    }
  }

  function replaceText() {
    HistoryAdd();
    const oldText = document.getElementById("oldText").value;
    const newText = document.getElementById("newText").value;
    const textarea = document.getElementById("textareaMain");

    if (!oldText) {
      alert("Please fill the field");
      return;
    }

    const replacedContent = textarea.value.replaceAll(oldText, newText);
    textarea.value = replacedContent;
    closeModal();
  }

  function clearInput(inputId) {
    const inputField = document.getElementById(inputId);
    if (inputField) {
      inputField.value = '';
      inputField.focus(); // Optional: Refocus the cleared field
    }
  }

  /*REMOVE:
  function openDialog(dialog) {
    target = document.getElementById(dialog);
    if(target){
      target.show();
      closeBtn = target.querySelector(".modal-close");
      if(closeBtn){
        closeBtn.addEventListener('click', () => target.close());
      }
    }
  }
    */

  (() => {
    window.openDialog = function (dialog) {
      const target = document.getElementById(dialog);
      if (!target) {
        console.warn(`Dialog with ID "${dialog}" not found.`);
        return;
      }

      const openButton = document.activeElement;
      target.showModal();
      target.addEventListener('close', () => {
        openButton.focus();
      });

      const closeBtn = target.querySelector(".modal-close");
      if (closeBtn) {
        closeBtn.addEventListener('click', () => target.close(), { once: true });
      } else {
        console.warn('Close button not found in the dialog.');
      }

      target.addEventListener('click', (event) => {
        if (event.target === target) {
          target.close();
        }
      });
    };
  })();

  
  // Transformation functions

  function populateParseAllTagsFromXml(inputData){
    textareaMain.value = parseAllTagsFromXml(inputData);
  }
  
  function yamlMultiDocToVocabularyItems(input) {
    return input.split('\n-----\n')
      .map((i) => {return i.trim()
        .split('\n')
        .map((i) => {return i.replace(/^\w{2}:\s/g,'')})
        .join('\n===\n')
      }).join('\n-----\n');
    //return input.replace(/en: /g,'===\n').replace(/type: \w*\n/g,'').replace(/cs: /g,'');
    //return input.trim().split('-----').map((i) => {i.replace(/\w{2}: /g,'').replace(/\n/g,'\n+++\n')}).join('-----');
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
  
  function ConvertToSlug(inputData) {
    if (!inputData) return;
    let result = '';
    for (let i=0;i<inputData.length;i++) {
      if (char_map[inputData[i]])
        result += char_map[inputData[i]];
      else
        result += inputData[i];
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
  window.addEventListener('DOMContentLoaded', () => {
    populateData();
    VoiceList();
    currentDocName.innerText = uiConfigs.labels.not_saved_doc;

    const clearButtons = document.querySelectorAll(".clear-input");    
    clearButtons.forEach(button => {
      button.addEventListener("click", () => {
        const inputContainer = button.closest(".input-container");
        const inputField = inputContainer && inputContainer.querySelector("input");
        if (inputField) {
          inputField.value = "";
        }         
      });
    });

  });

  
