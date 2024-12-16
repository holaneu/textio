// Configuration
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

// DOM Elements
const elements = {
  editor: {
    main: document.querySelector('#textareaMain'),
    eval: document.querySelector('#textareaEval'),
    logs: document.getElementById('textarea-logs'),
    currentDocName: document.getElementById('currentDocName')
  },
  flashcards: {
    section: document.querySelector('#flashcards-section'),
    cardFront: document.querySelector('.card-front'),
    cardBack: document.querySelector('.card-back')
  },
  history: {
    currentStep: document.querySelector('#currentStep'),
    backButton: document.querySelector('#historyBack')
  },
  tts: {
    voicesSelect: document.getElementById('tts-voices')
  }
};

// UI Manager
const uiManager = {
  navigateToScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
  },

  toggleVisibility(selector, triggeringElementId) {
    const element = document.querySelector(selector);
    const triggeringElement = document.getElementById(triggeringElementId);
    
    if (element) {
      const isHidden = element.style.display === "none";
      element.style.display = isHidden ? "block" : "none";
      if (triggeringElement) {
        triggeringElement.innerHTML = triggeringElement.innerHTML.replace(
          isHidden ? 'Show' : 'Hide',
          isHidden ? 'Hide' : 'Show'
        );
      }
    }
  },

  openModal(contentId) {
    const modal = document.getElementById("universalModal");
    const content = document.getElementById(contentId);
    if (modal && content) {
      modal.classList.remove("hidden");
      content.classList.remove("hidden");
    }
  },

  closeModal() {
    const modal = document.getElementById("universalModal");    
    if (modal) {
      const allContent = modal.querySelectorAll(".modal-body > div");
      modal.classList.add("hidden");
      allContent.forEach(content => content.classList.add("hidden"));
    }
  }
};

// Document Manager
const docManager = {
  currentDoc: null,

  setCurrentDoc(doc) {
    this.currentDoc = doc;
    elements.editor.currentDocName.innerText = doc ? doc.name : uiConfigs.labels.not_saved_doc;
  },

  loadLocalData() {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(appConfigs.db_key_prefix))
      .map(key => {
        const record = JSON.parse(localStorage.getItem(key));
        return {
          id: record.id,
          name: record.name,
          content: record.content,
          lcKey: key,
          created: record.created,
          timestamp: record.timestamp
        };
      });
  },

  populateDocList() {
    const records = this.loadLocalData();
    records.sort((a, b) => a.name.localeCompare(b.name));
    
    const optgroup = document.getElementById('optgroupLcRecords');
    optgroup.innerHTML = "";
    records.forEach((item) => {
      const option = document.createElement("option");
      option.value = `docManager.openDoc('${item.id}')`; 
      option.text = item.name;
      optgroup.appendChild(option);
    });
  },

  openDoc(id) {
    const record = JSON.parse(localStorage.getItem(appConfigs.db_key_prefix + id));
    if (record?.content) {
      elements.editor.main.value = record.content;
      this.setCurrentDoc(record);
      historyManager.reset();
    }
  },

  saveAsNew() {
    const name = prompt("Name:");
    if (!name?.trim()) return;

    const id = utils.generateId();
    const currentTime = Date.now();
    const record = {
      id,
      name: name.trim(),
      content: elements.editor.main.value,
      created: currentTime,
      modified: currentTime,
      timestamp: utils.getDateTime()
    };

    try {
      localStorage.setItem(
        appConfigs.db_key_prefix + id, 
        JSON.stringify(record)
      );
      this.populateDocList();
      this.setCurrentDoc(record);
    } catch (error) {
      console.error('Error saving document:', error);
      alert('Failed to save document');
    }
  },

  overwriteOpened() {
    if (!this.currentDoc?.id) {
      this.saveAsNew();
      return;
    }

    const confirmation = confirm(
      `Are you sure you want to save and rewrite "${this.currentDoc.name || ''}"?`
    );
    
    if (!confirmation) return;

    try {
      const key = appConfigs.db_key_prefix + this.currentDoc.id;
      const record = {
        ...this.currentDoc,
        content: elements.editor.main.value,
        modified: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(record));
      this.setCurrentDoc(record);
    } catch (error) {
      console.error('Error overwriting document:', error);
      alert('Failed to save document');
    }
  },

  downloadFile() {
    const name = prompt("File name:");
    if (!name?.trim()) return;

    const fileName = 'textio - ' + name.trim();
    const hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/plain;charset=utf-8,' + encodeURI(elements.editor.main.value);
    hiddenElement.target = '_blank';
    hiddenElement.download = fileName;
    hiddenElement.click();
  },

  removeDoc() {
    if (!this.currentDoc?.id) return;
    
    const confirmation = confirm(
      `Are you sure you want to remove ${this.currentDoc.name ? `"${this.currentDoc.name}"` : ''}?`
    );
    
    if (confirmation) {
      const key = appConfigs.db_key_prefix + this.currentDoc.id;
      localStorage.removeItem(key);
      elements.editor.main.value = "";
      this.populateDocList();
      this.setCurrentDoc(null);
      historyManager.reset();
    }
  },

  removeAllDocs() {
    const confirmation = confirm('Are you really sure you want to remove all "textio_data_" items from local storage?');
    if (confirmation) {
      const records = this.loadLocalData();
      records.forEach(item => {
        localStorage.removeItem(appConfigs.db_key_prefix + item.id);
      });
      this.populateDocList();
      this.setCurrentDoc(null);
    }
  },

  exportData() {
    const appPrefix = appConfigs.db_key_prefix;
    const filteredData = Object.keys(localStorage)
      .filter(key => key.startsWith(appPrefix))
      .map(key => ({ key, value: JSON.parse(localStorage.getItem(key)) }));
    
    const json = JSON.stringify(filteredData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'textio_export_'+ utils.getDateTime('YYYYMMDD') +'.json';
    link.click();
    URL.revokeObjectURL(link.href);
  },

  importData() {
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
      reader.onload = e => {
        try {
          const data = JSON.parse(e.target.result);
          if (!Array.isArray(data)) {
            throw new Error('Invalid format');
          }

          const appPrefix = appConfigs.db_key_prefix;
          data.forEach(item => {
            if (!item.key?.startsWith(appPrefix)) return;
            
            const existingItem = localStorage.getItem(item.key);
            if (existingItem) {
              const existingValue = JSON.parse(existingItem);
              const existingModified = existingValue.modified || 0;
              const newModified = item.value.modified || 0;
              
              if (newModified > existingModified) {
                localStorage.setItem(item.key, JSON.stringify(item.value));
              }
            } else {
              localStorage.setItem(item.key, JSON.stringify(item.value));
            }
          });
          
          alert('Data successfully imported');
          this.populateDocList();
        } catch (error) {
          console.error('Error importing data:', error);
          alert('Failed to import data. Invalid format.');
        }
      };
      reader.readAsText(file);
    });
    
    fileInput.click();
  }
};

// History Manager
const historyManager = {
  steps: [],

  add() {
    this.steps.push(elements.editor.main.value);
    elements.history.currentStep.innerHTML = this.steps.length;
    elements.history.backButton.disabled = false;
  },

  back() {
    if (this.steps.length === 0) return;
    
    elements.editor.main.value = this.steps.pop();
    elements.history.currentStep.innerHTML = this.steps.length;
    elements.history.backButton.disabled = this.steps.length === 0;
  },

  reset() {
    this.steps = [];
    elements.history.currentStep.innerHTML = '0';
    elements.history.backButton.disabled = true;
  }
};

// File Manager
const fileManager = {
  clickHiddenInput() {
    document.getElementById('fileInputHidden').click();
  },

  readFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      elements.editor.main.value = e.target.result;
      docManager.setCurrentDoc(null);
      historyManager.reset();
    };
    reader.readAsText(file);
  }
};

// TTS Manager
const ttsManager = {
  synth: window.speechSynthesis,
  voices: {
    all: null,
    filtered: null
  },
  supportedLanguages: ['cs-CZ', 'en-US', 'en-GB'],

  async initVoices() {
    const getVoices = () => {
      return new Promise((resolve) => {
        let voices = this.synth.getVoices();
        if (voices.length) {
          resolve(voices);
        } else {
          this.synth.addEventListener('voiceschanged', () => {
            voices = this.synth.getVoices();
            resolve(voices);
          });
        }
      });
    };

    try {
      this.voices.all = await getVoices();
      this.voices.filtered = this.voices.all.filter(
        v => this.supportedLanguages.includes(v.lang.replace('_','-'))
      );
      
      const select = elements.tts.voicesSelect;
      select.innerHTML = "";
      
      this.voices.filtered.forEach(voice => {
        const option = document.createElement("option");
        option.value = voice.voiceURI;
        option.text = `${voice.lang} - ${voice.name}`;
        select.appendChild(option);
      });
      
      select.selectedIndex = 0;
    } catch (error) {
      console.error('Error initializing voices:', error);
    }
  },

  speak(text) {
    if (!window.speechSynthesis) {
      alert("Your device does not support the SpeechSynthesis API");
      return;
    }

    if (!text?.trim()) {
      alert('No text to read!');
      return;
    }

    if (!this.voices.filtered?.length) {
      alert('No voices available');
      return;
    }

    this.synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = this.voices.filtered.find(
      v => v.voiceURI === elements.tts.voicesSelect.value
    ) || this.voices.filtered[0];
    
    utterance.voice = selectedVoice;
    utterance.pitch = document.getElementById('tts-pitch').value;
    utterance.rate = document.getElementById('tts-rate').value;
    
    this.synth.speak(utterance);
  },

  stop() {
    if (!window.speechSynthesis) {
      alert("Your device does not support the SpeechSynthesis API");
      return;
    }
    this.synth.cancel();
  }
};

// Utility functions
const utils = {
  generateId(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from(
      { length }, 
      () => chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
  },

  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  },

  getDateTime(format) {
    const date = new Date();
    const formatters = {
      'YYYY-MM-DD': () => date.toISOString().split('T')[0],
      'YYYYMMDD': () => date.toISOString().split('T')[0].replace(/-/g, ''),
      'default': () => {
        const pad = num => String(num).padStart(2, '0');
        return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
      }
    };
    return (formatters[format] || formatters.default)();
  },

  randomIndex(range) {
    return Math.floor(Math.random() * range);
  },

  sanitizeInput(text) {
    return text
      .replace(/<script.*?>.*?<\/script>/gi, '')
      .replace(/<.*?>/g, '');
  },

  insertAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.value = textarea.value.substring(0, start) + text + textarea.value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
  },

  insertDate() {
    this.insertAtCursor(elements.editor.main, this.getDateTime("YYYY-MM-DD"));
  },

  insertSeparator() {
    this.insertAtCursor(elements.editor.main, '\n-----\n');
  },

  insertFieldSeparator() {
    this.insertAtCursor(elements.editor.main, '===');
  },

  insertRandomId() {
    this.insertAtCursor(elements.editor.main, this.generateId());
  },

  removeDiacritics(text) {
    const char_map = {
      'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A', 'Æ': 'AE',
      'Ç': 'C', 'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E', 'Ì': 'I', 'Í': 'I',
      'Î': 'I', 'Ï': 'I', 'Ð': 'D', 'Ñ': 'N', 'Ò': 'O', 'Ó': 'O', 'Ô': 'O',
      'Õ': 'O', 'Ö': 'O', 'Ő': 'O', 'Ø': 'O', 'Ù': 'U', 'Ú': 'U', 'Û': 'U',
      'Ü': 'U', 'Ű': 'U', 'Ý': 'Y', 'Þ': 'TH', 'ß': 'ss', 'à': 'a', 'á': 'a',
      'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'æ': 'ae', 'ç': 'c', 'è': 'e',
      'é': 'e', 'ê': 'e', 'ë': 'e', 'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
      'ð': 'd', 'ñ': 'n', 'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
      'ő': 'o', 'ø': 'o', 'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u', 'ű': 'u',
      'ý': 'y', 'þ': 'th', 'ÿ': 'y', 'Č': 'C', 'Ď': 'D', 'Ě': 'E', 'Ň': 'N',
      'Ř': 'R', 'Š': 'S', 'Ť': 'T', 'Ů': 'U', 'Ž': 'Z', 'č': 'c', 'ď': 'd',
      'ě': 'e', 'ň': 'n', 'ř': 'r', 'š': 's', 'ť': 't', 'ů': 'u', 'ž': 'z'
    };
    
    return text.split('').map(char => char_map[char] || char).join('');
  },

  convertToSlug(text) {
    if (!text) return '';
    return this.removeDiacritics(text)
      .toLowerCase()
      .replace(/[^\w |\n]+/g,'')
      .replace(/ +|\n+/g,'-');
  },

  callFunc(callback) {
    if (!callback) return;
    
    historyManager.add();
    const result = callback(elements.editor.main.value);

    if (typeof result === "object") {
      // If result is an object or array, stringify it with formatting for readability
      elements.editor.main.value = JSON.stringify(result, null, 2); // 2 spaces for indentation
    } else {
      // If result is not an object, directly assign it
      elements.editor.main.value = result;
    }
  }
};

// Flashcards Manager
const flashcardsManager = {
  currentCard: null,
  cardsAll: [],
  cardsShuffled: [],
  cardIndex: -1,

  processDoc(inputData) {
    const content = inputData || elements.editor.main.value;
    if (!content.trim()) return;

    const parsedTags = transformManager.parseAllXmlTagsFromDoc(content);
    
    if (!parsedTags || parsedTags.length === 0) {
      this.openAsFlashCards({
        tag_name: "items", 
        tag_attributes: {separator: "newline"}, 
        inner_content: content
      });
      return;
    }
    
    if (parsedTags.length === 1) {
      this.openAsFlashCards(parsedTags[0]);
    } else {
      this.showXmlTagSelectionModal(parsedTags);
    }
  },

  showXmlTagSelectionModal(tags) {
    const cardsContainer = document.getElementById('parsedTagCards');    
    cardsContainer.innerHTML = '';    
    
    tags.forEach((tag, index) => {
      const card = document.createElement('div');
      card.innerHTML = `
          <div class="card-item">
            <div class="card-content">
              ${tag.tag_name}</br>
              ${Object.entries(tag.tag_attributes).map(([key, value]) => `${key}: ${value}`).join('<br>')}</br>
            </div>
          </div>`;
      card.onclick = () => {
        uiManager.closeModal();
        this.openAsFlashCards(tag);
      };
      cardsContainer.appendChild(card);
    });

    uiManager.openModal('tagSelectionModal');
  },

  parseItemsFromSingleTagData(inputData) {
    if (!inputData) return;

    if (inputData.tag_attributes && inputData.tag_attributes.separator) {
      function mapSeparator(input) {
        if (!input) return null;
        
        switch(true) {
          case /newline|new line/.test(input):
            return "\n";
          case /empty row|empty-row|empty line|empty-line/.test(input):
            return "\n\n";
          default:
            return input;
        }
      }

      const separator = mapSeparator(inputData.tag_attributes.separator);
      const defaultFieldSeparator = /\.{4}|=|\t/;
      const fieldSeparator = inputData.tag_attributes.fieldSeparator ? 
        mapSeparator(inputData.tag_attributes.fieldSeparator) : 
        defaultFieldSeparator;
      const content = inputData.inner_content.trim();        
      
      return content
        .split(separator)
        .map(item => item.trim())
        .filter(item => item !== "")
        .map(item => item.split(fieldSeparator).map(field => field.trim().replace(/^(en|cs): /g,'')));
    }
  },

  openAsFlashCards(inputData) {        
    this.cardsAll = this.parseItemsFromSingleTagData(inputData);
    this.cardsShuffled = utils.shuffleArray(this.cardsAll);
    this.cardIndex = -1;
    uiManager.navigateToScreen("flashcards-screen");
    this.navigate("next");
  },

  navigate(direction) {
    ttsManager.stop();

    if (direction === "next") {
      this.cardIndex = (this.cardIndex >= this.cardsShuffled.length - 1) ? 0 : this.cardIndex + 1;
    } else if (direction === "previous") {
      this.cardIndex = (this.cardIndex <= 0) ? this.cardsShuffled.length - 1 : this.cardIndex - 1;
    }

    this.currentCard = this.cardsShuffled[this.cardIndex];
    elements.flashcards.cardFront.innerText = this.currentCard[0];
    elements.flashcards.cardBack.innerText = "";
    this.currentCardBackLoop = 1;

    if (document.querySelector('#checkbox-auto-speak')?.checked) {
      ttsManager.speak(this.currentCard[0]);
    }
  },

  turnCard() {
    if (this.currentCard.length >= 2) {
      const backContent = this.currentCard[this.currentCardBackLoop];
      elements.flashcards.cardBack.innerText = backContent;
      
      if (this.currentCardBackLoop < this.currentCard.length - 1) {
        this.currentCardBackLoop++;
      } else {
        this.currentCardBackLoop = 1;
      }
    } else {
      elements.flashcards.cardBack.innerText = "-- no back side --";
    }
  }
};

// Transform Manager
const transformManager = {
  parseAllXmlTagsFromDoc(inputData) {
    // If no input data provided, get from textarea
    const textToProcess = inputData || elements.editor.main.value;
    
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
    
    // Find all XML-like tags with their content
    const tagRegex = /<([\w-]+)([^>]*)>([\s\S]*?)<\/\1>/gi;
    const result = [];
    let match;
    
    while ((match = tagRegex.exec(textToProcess)) !== null) {
      result.push({
        tag_name: match[1],
        tag_attributes: parseAttributes(match[2]),
        inner_content: match[3]
      });
    }
    
    return result.length > 0 ? result : null;
  },

  // Transformation functions - now they just transform and return result
  yamlToVocabulary(input) {
    return input.split('\n-----\n')
      .map(i => i.trim()
        .split('\n')
        .map(i => i.replace(/^(en|cs):\s/g,''))
        .join('\n===\n')
      ).join('\n-----\n');
  },

  linesToList(input) {
    return input.replace(/\n$/g,'').replace(/\n/g,',');
  },

  listToArray(input) {
    return '["'+ input.replace(/,/g,'","') +'"]';
  },

  listToLines(input) {
    return input.replace(/,/g,'\n');
  },

  sortList(input) {
    return input.split(/[,\|]/).sort().join('\n');
  },

  removeSpaces(input) {
    return input.trim().replace(/ /g, '');
  },

  removeEmptyLines(input) {
    return input.replace(/\n\s*\n/g,'\n').replace(/^\s*\n/,'');
  },

  removeLineBreaks(input) {
    return input.replace(/\n/g,'');
  },

  removeDiacritics(input) {
    return utils.removeDiacritics(input);
  },

  encodeBase64(input) {
    return btoa(input);
  },

  decodeBase64(input) {
    return atob(input);
  },

  convertToSlug(input) {
    return utils.convertToSlug(input);
  },

  parseMarkdownLinks(input) {
    const rows = input.replace(/\n\n/g,'\n').split('\n');
    const links = [];
    for (const row of rows) {
      const splitRow = row.trim().split('](');
      if (splitRow?.[1]) {
        links.push(splitRow[1].trim().replace(')',''));
      }
    }
    return links.join('\n');
  },

  increaseLineBreaks(input) {
    return input
      .replace(/\n$/,'')
      .replace(/\n{2,}/g,'\n\n')
      .replace(/\n/g,'\n\n')
      .replace(/\n{4,}/g,'\n\n\n\n');
  },

  editForTts(input) {
    return input.toLowerCase()
      .split("\n")
      .map(line => {
        if (!line) return line;
        const lastChar = line.charAt(line.length-1);
        if (!/\.|,|:/.test(lastChar)) {
          line += ".";
        }
        return line.charAt(0).toUpperCase() + line.slice(1);
      })
      .join("\n");
  },

  excelToJsonMap(input) {
    const rows = input.split("\n");
    if (rows[rows.length-1] === "") {
      rows.pop();
    }
    let result = "{\n";
    if (rows.length > 0) {
      result += rows
        .map(row => {
          const [key, value] = row.split("\t");
          return `"${key}":"${value}"`;
        })
        .join(",\n");
      result += "\n}";
    }
    return result;
  },

  encodeUri(input) {
    return encodeURI(input);
  },

  decodeUri(input) {
    const result = decodeURI(input);
    const url_encode_map = {
      '%20': ' ', '%3A': ':', '%2F': '/', '%2B': '+', '%2C': ',', '%2D': '-'
    };
    return Object.entries(url_encode_map)
      .reduce((text, [pattern, replacement]) => 
        text.replace(new RegExp(pattern,'g'), replacement), 
        result
      );
  },

  replaceText() {
    const oldText = document.getElementById("oldText").value;
    const newText = document.getElementById("newText").value;

    if (!oldText) {
      alert("Please fill the field");
      return;
    }

    utils.callFunc(input => input.replaceAll(oldText, newText));
    uiManager.closeModal();
  }
};

// Eval Manager
const evalManager = {
  executeScript() {
    try {
      const result = eval(elements.editor.eval.value);
      if (result !== undefined) {
        elements.editor.main.value = result;
      }
    } catch (error) {
      elements.editor.logs.value += `\n\nError: ${error.message}`;
      console.error('Script execution error:', error);
    }
  }
};

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Editor Controls
  document.getElementById('resetEditor').addEventListener('click', () => {
    elements.editor.main.value = "";
    docManager.setCurrentDoc(null);
    historyManager.reset();
  });

  document.getElementById('historyBack').addEventListener('click', () => historyManager.back());
  document.getElementById('removeDoc').addEventListener('click', () => docManager.removeDoc());

  // UI Toggles
  document.getElementById('showCustomCode').addEventListener('change', (event) => {
    document.getElementById('customCode').classList.toggle('hidden', !event.target.checked);
  });

  document.getElementById('showLogs').addEventListener('change', (event) => {
    document.getElementById('logs').classList.toggle('hidden', !event.target.checked);
  });

  // Initialize data
  docManager.populateDocList();
  ttsManager.initVoices();
  elements.editor.currentDocName.innerText = uiConfigs.labels.not_saved_doc;
});

// Make objects available globally for HTML event handlers
window.docManager = docManager;
window.historyManager = historyManager;
window.utils = utils;
window.ttsManager = ttsManager;
window.uiManager = uiManager;
window.fileManager = fileManager;
window.transformManager = transformManager;
window.flashcardsManager = flashcardsManager;
window.evalManager = evalManager;

  
