# Textio
Simple plain text modifier in HTML + JS. Just textarea + buttons with JS tranformation functions.
Also create simple flash cards on one click, based on plain text from textarea.

Demo:
* https://textio.netlify.app ... auto-deployed from this GitHub repo (from master branch) to Netlify.
* http://textio.holan.eu


## Tranformation functions:

* Remove empty rows
* Rows to List
* 2 Excel columns to JSON map
* List to Array
* List to Rows
* Editations for TTS reader (row ended by dots, lowercased and first letters uppercased etc.)
* Remove line breaks 
* Remove diacritics  
* Convert to Slug 
* Execute custom JS code (execute any custom JS code written in separate textarea using eval method)
* Load text from external file - txt file from server (EN-slovicka.txt ... EN vocabulary)
* Encode URL
* Dencode URL

## Flash cards feature
* Create flash card on one click. Tranform plain text in texarea (editor) into simple flashcards, showing cards randomly. Each text row is tranformed into one card, use separators ('=' or '...') to split row into front and back side of card. Buttons 'Next card' and 'Turn card'.

## Load text from file
* It loads static .txt file containing my personal vocabulary (EN -> CZ), list of dozens EN phrases with CZ translations.

## Save modified text into .txt file on one click
* Save modified text into .txt file on one click.

## Progressive Web App ready
* on mobile phone try to save page to homescreen, then it behaves as separate 'app'.
* more features planned: sharing content (text) from/to Textio and other Android apps.

