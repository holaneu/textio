# TTS Reader

Basic user scenario: A user visits the page and sees a textarea field, a submit button, and options to select the voice of the TTS reader. The user types some text into the textarea, selects their desired voice, and clicks the submit button. The TTS reader reads the text aloud using the selected voice.

User see these elements: a textarea where user writes / pastes text, a select element containing list of available voices to be selected, a button Play / pause for starting / pausing / resuming of the reader. If reader is speaking, text of button is "Pause". If reader is paused or not started yet, text of button is "Play".

When page is loaded: list of available text-synthesis voices is generated. Czech, English (United States) and English (United Kingdom) voices are chosen and listed as options of drowp-down menu (select element). One option is set as selected and its voice is set for speaking. 
> This should be implemented as two re-usable functions: one for returning list of available voices including language filtering, second for generating select options.

When user clicks on some voice option: The clicked option is set as selected and the voice is set for speaking. In case reader is already speaking at the moment of clicking, first speaking is paused, then the clicked option is set as selected and the voice is set for speaking and then speaking is resumed.

When user clicks on Play / Pause button: If speaking hasn't started yet, the text is Play and it starts speaking. If reader is currently speaking, text is Pause and it pauses speaking. If reader is currently paused, text is Resume and it it resumes speaking.
