# TODO:

## Offline mode
- PWA setup update - to be possible use the app without internet connection

## New tool "JSON items selector"

## New dropdown "Open in tool"
- When user seelects a tool, it takes current state of text from textarea and transfer it to a selected tool
- Each tool has its own screen
  - back button
- Tools:
  - Flashcards

## Convert items to json
- returns the covnertd json as text into textarea
  - yaml - structured
  - plaintext - just one field within the item object "content"

## Rename functions
- get rid of LS in names as app storage functions should be universal (wrappers where the storage type might be changed in future)

## New screens logic and its navigation
- screens
  - home
  - settings
  - flashcards
  - ...
- function to navigate between screens

## exctract items from the items tag
- exctract items from the items tag - just return the extracted text into textarea

## Switch the primary card side
- possible to change the primary card side (so the front card will be replaced by back card and vise versa)

## Remove sanitize feature

## Replace form

## universal UI element dialog / modal, with overlay
- used for some features like "replace text form"
  - input 1: text to be replaced
  - input 2 replacing text
  - radio button to select between normal and regex mode



# DONE:

## !! export / import
- in a settings screen

## Parse flash cards from XML tags items, item-group, data-list
- clean flash card's content
  - empty rows on start and end

## Name of opend item display
- when user opens item from storage, its name is visible abobe the main textare

## Save function
- if item is opened from the storage, user has possibility to save updates clicking "Save" button

## New storage data structure
- main key "textio_data" (textio is prefix set in app configs var)
- each item has its id (radon 10 chars)

## Rename tools dropdown to "Transform"

## File structure
- utilize common practice for SPA vanilla js apps for file/folder structure and naming