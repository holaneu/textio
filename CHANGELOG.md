



## version 2.0.1

2024-12-18

**Flashcards Counter Implementation**
- Added visual counter showing progress through flashcards (e.g., "3 / 10")
- Helps users track their position in study sessions
- Improves user experience by providing clear progress indication

**Code Organization & Efficiency**
- Eliminated code duplication in flashcards functionality
- Created reusable `initializeFlashcards` method
- Centralized validation and error handling
- Improved code maintainability and reduced potential for bugs

**Memory Management Optimization**
- Implemented systematic cleanup of unused data
- Added `cleanup` method to free memory when:
  - Switching between documents
  - Exiting flashcards mode
  - Opening new documents
  - Removing documents
- Particularly beneficial for mobile devices and PWA usage

**YAML Processing Improvements**
- Enhanced YAML parsing reliability
- Better handling of complex data structures
- Improved error handling for invalid formats
- More robust field mapping for flashcards

These improvements result in:
- Better user experience
- More efficient memory usage
- More stable application performance
- Easier future maintenance
- Enhanced mobile device compatibility

The focus has been on both user-facing features and technical improvements that ensure better performance, especially for the PWA version on mobile devices.


## version 2.0.0

Big update of the code base after 1.0.X version.

### Important new features:

**doc processing** 
- process any text document containing data block(s) wrapped into XML tag(s). Inner content of data block(s) can be of many formats (text, markdown, YAML, CSV, etc. ) and it can be converted to flashcards.


### TBD
- notes: 
- code refactoring
- code cleanup
- code optimization
- code modularization
- code debugging
- code profiling
- code performance
- code security
- code compatibility

