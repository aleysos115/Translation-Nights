# Tranlsation Nights :crescent_moon:

This is a simple front end translation interface for game localisation written in Typescript and React. Feel free to look at the main file 'app.tsx' for all the source code written.

# Features
- Entry state display
  - Unfinished, Draft, Review, Approved
  - Advanceable via clicking the banner or through the hotkey: shift+enter
  - Stepback via shift clicking the banner or through the hotkey: ctrl+shift+enter
- Side by Side Source and Target Text
  - Rich Text markup of tags
  - Real Time Validation
    - Multiple Spaces
    - Unclosed open tags
    - Close tag without open pair
  - Copy to clipboard buttons for easy copy paste
- Constraint Validator
  - Character per line constraint validator and visual feedback
  - Tags (i.e. icons) with character size included. (Size can be seen in the tag's toolbar button hover tooltip)
  - Line count validation feedback
  - Warning validation feedback
- Tag Inserter
  - Tag groups with buttons for easy insertion
  - Tags assigned hotkeys for easy of use
- Side by Side Source and Target Game Preview
  - Tag conversion to in-game version
    - Font colors and formating
    - Icon images
- Diff History Viewer
  - Shows a diff history viewer when entry is in "Draft, Review, Approved" state
- Translation notes
  - Area for adding notes and remarks during the translation process.

Note: 
  - While this has all been implemented in a single file, in production, I would
    split this up into multiple files for easier readability and ownership.
  - I have used "Tailwind" here to simplify the css for this component.

# Preview

![Preview](/resources/preview_1.png)
