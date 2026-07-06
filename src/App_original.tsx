/* 
 *	Author:  Alexander Michael Sosin
 *	Project: Capcom Localization Team Engineer Recruitment Test
 *	Date: 	 2026/05/07
 */

/* 
 * Directive:
 * This is the beginning of a typescript react component. You can drop it into a react dev environment to test it.
 * (We recommend vite.js)
 * We are making a basic translation interface.
 * The source text is in Japanese, and the target text is in English. The text contains tags
 * that represent game controls and text formatting.
 * Think of an interface that would allow a translator to translate/edit the target text.
 * Think of additional features that would be useful for a game translator, and implement them.
 * Comment your code and explain your thought process.
 * The game ux has a limit of 3 lines of text, and 40 characters per line.
 * In case we invite you for an interview, we will use your code as a discussion point as well.
 */

/* ------------------ FEATURES ------------------
 *- Entry state display
 *	- Unfinished, Draft, Review, Approved
 *	- Advanceable via clicking the banner or through the hotkey: shift+enter
 *	- Stepback via shift clicking the banner or through the hotkey: ctrl+shift+enter
 *- Side by Side Source and Target Text
 *	- Rich Text markup of tags
 *	- Real Time Validation
 *		- Multiple Spaces
 *		- Unclosed open tags
 *		- Close tag without open pair
 *	- Copy to clipboard buttons for easy copy paste
 *- Constraint Validator
 *	- Character per line constraint validator and visual feedback
 *		- Tags (i.e. icons) with character size included. (Size can be seen in the tag's toolbar button hover tooltip)
 *	- Line count validation feedback
 *	- Warning validation feedback
 *- Tag Inserter
 *	- Tag groups with buttons for easy insertion
 *	- Tags assigned hotkeys for easy of use
 *- Side by Side Source and Target Game Preview
 *	- Tag conversion to in-game version
 *		- Font colors and formating
 *		- Icon images
 *- Diff History Viewer
 *	- Shows a diff history viewer when entry is in "Draft, Review, Approved" state
 *- Translation notes
 *	- Area for adding notes and remarks during the translation process.

 * Note: 
 * 	- While this has all been implemented in a single file, in production, I would
 * 	  split this up into multiple files for easier readability and ownership.
 * 	- I have used "Tailwind" here to simplify the css for this component.

 *------------------ Extention Ideas ------------------
 * Since the directive for this component is at an individual "Translation Entry" level, things such as 
 * translation memory or a term bank/glossery, which typically live levels above this component, 
 * are out of scope. However, in an actual production level CAT tool, I would implement these features at the editor level.
 */

/*
 * File Structure
 * - Imports 		(loc: 71)
 * - Types		(loc: 76)
 * - Constants		(loc: 146)
 * - Helper Functions	(loc: 208)
 * - Components		(loc: 747)
 * - Main		(loc: 1109)
 */

/** IMPORTS **/
import { useState, useMemo, useRef, useEffect, useCallback} from 'react'
import copy from './assets/copy.png';
import './App.css'

/** TYPES **/
// Hotkey definition.
export type Key = {key: string, ctrlKey: boolean, altKey: boolean, shiftKey: boolean};

// Translation Entry types and definition.
export type TranslationStatus =
    | "untranslated"
    | "draft"
    | "review"
    | "approved";

// This type is the main type for a individual translation entry.
export type TranslationEntry = {
    // The unique identification string for this entry.
    id: string;
    // Raw Japanese source string, read-only for the translator.
    sourceText: string;
    // Working English translation, editable.
    targetText: string;
    // Optional translator note for reviewers and translators.
    note: string;
    // A record holding the history of the translation, used for displaying the diff history.
    statusSnapshot: Record<TranslationStatus, string>;
    // The status of this current entry (see above).
    status: TranslationStatus;
}

// Tag types, used in the KNOWN_TAGS data structure.
export type TagCategory =  "Control" | "Format";
export type TagType = "open" | "close" | "self contained";
export type TagGroup = "color" | "bold";

// Token types and definition.
export type TokenType = 
    "letter"
    | "langle"
    | "rangle"
    | "whitespace";

export type Token = {type: TokenType; value: string};

// Symbol types and definition.
export type ValidationType =  
    "Double Space"
    | "Single Open"
    | "Single Close";
export type ParsedSymbolValidation = {log: ValidationType}
export type ParsedSymbolType = 
    "text"
    | "tag"
    | "whitespace";
export type ParsedSymbol = {type: ParsedSymbolType; value: string; validation?: ParsedSymbolValidation};

//Undo frame definition for manual undo management.
export type UndoFrame = {value: string, caretPosition: number};

//Myers Diff operation type.
export type DiffOpType = 
    "equal"
    | "insert"
    | "delete";
export type DiffOp = {type: DiffOpType; value: string}

// Tab definition used in tab component.
export type TabDef = {
  label: string;
  content: React.ReactNode;
};


/** CONSTANTS **/
const MAX_LINES = 3;
const MAX_CHARS_PER_LINE = 40;

const STATUS_ORDER: TranslationStatus[] = ["untranslated", "draft", "review", "approved"];

const STATUS_COLORS: Record<TranslationStatus, string> = {
    untranslated: "bg-fb-base text-bg-dark",
    draft:        "bg-accent-orange text-bg-dark",
    review:       "bg-accent-blue  text-bg-dark",
    approved:     "bg-accent-green text-bg-dark",
};

// The known tags used in the rich text and game preview.
// Note: While this is statically defined here, in an actual setup this data should be 
//	passed as a config file to allow for extendability between projects.
const KNOWN_TAGS: { 
    category: TagCategory; 
    type: TagType;
    group?: TagGroup; 
    label: string; 
    tag: string; 
    markup: string, 
    hotkey?: Key,
    //Some characters like icons take up space in the text and must count towards character count.
    characterCount?: number
    }[] = [
    {category: "Format", type: "close", group: "color", label: "Color: Close", tag: "</COL>", 
	markup: "</span>",
	hotkey: {key: "1", ctrlKey: false, altKey: true, shiftKey: false}},
    {category: "Format", type: "open", group: "color", label: "Color: Red", tag: "<COL RED>", 
	markup: "<span class=\"inline text-accent-red\">",
	hotkey: {key: "2", ctrlKey: false, altKey: true, shiftKey: false}},
    {category: "Format", type: "open", group: "color", label: "Color: Blue", tag: "<COL BLUE>", 
	markup: "<span class=\"inline text-accent-blue\">",
	hotkey: {key: "3", ctrlKey: false, altKey: true, shiftKey: false}},
    {category: "Format", type: "close", group: "bold", label: "Bold: Close", tag: "</B>", 
	markup: "</b>",
	hotkey: {key: "4", ctrlKey: false, altKey: true, shiftKey: false}},
    {category: "Format", type: "open", group: "bold", label: "Bold: Open", tag: "<B>", 
	markup: "<b>",
	hotkey: {key: "5", ctrlKey: false, altKey: true, shiftKey: false}},
    {category: "Control", type: "self contained", label: "Button: A", tag: "<ICON PAD_A>", 
	markup:"<img src=\"/Dark theme/A_Button.png\" class=\"inline-block\">",
	hotkey: {key: "1", ctrlKey: true, altKey: false, shiftKey: false}, characterCount: 3},
    {category: "Control", type: "self contained", label: "Button: X", tag: "<ICON PAD_X>", 
	markup:"<img src=\"/Dark theme/X_Button.png\" class=\"inline-block\">",
	hotkey: {key: "2", ctrlKey: true, altKey: false, shiftKey: false}, characterCount: 3},
    {category: "Control", type: "self contained", label: "Button: ZL", tag: "<OPT ZL>", 
	markup:"<img src=\"/Dark theme/ZL_Button.png\" class=\"inline-block\">",
	hotkey: {key: "3", ctrlKey: true, altKey: false, shiftKey: false}, characterCount: 3},
    {category: "Control", type: "self contained", label: "Button: ZR", tag: "<OPT ZR>", 
	markup:"<img src=\"/Dark theme/ZR_Button.png\" class=\"inline-block\">",
	hotkey: {key: "4", ctrlKey: true, altKey: false, shiftKey: false}, characterCount: 3},
];

const DIFF_COLORS: Record<DiffOp["type"], string> = {
    "equal":	"",
    "insert":	"bg-accent-green text-bg-dark",
    "delete":	"bg-accent-red  text-bg-dark",
};

/** HELPER FUNCTIONS **/
// Lexs a string per character into an array of tokens.
function lexString(raw: string): Token[]
{
    return Array.from(raw).map((char) => {
	if(char === "<") return {type: "langle", value: char};
	if(char === ">") return {type: "rangle", value: char};
	if(char === " " || char === "\n") return {type: "whitespace", value: char};
	else return {type: "letter", value: char};
    });
}

// This function is the core of the pseudo-parser for both the source and target text
// It iterates through the token stream and constructs symbols which can then further be used
// in markup generation or certain grammar validation. Extending grammar rules becomes trivial.
function tokenStreamToSymbols(stream: Token[]): ParsedSymbol[]
{
    let stringBuilder: string = "";
    let tagBuilder: string = "";
    const result: ParsedSymbol[] = [];

    const tagCache: number[] = [];

    const flushBuilderToText = (builder: string) => {
	if(builder.length > 0) {
	    result.push({type: "text", value: builder});
	}
    }

    for(let i = 0; i < stream.length; ++i)
    {
	const seg: Token = stream[i];
	switch(seg.type) {
	    case "langle":
		flushBuilderToText(stringBuilder);
		stringBuilder = "";

		// If tag builder isn't empty, dump and start again.
		flushBuilderToText(tagBuilder);
		tagBuilder = "";
		
		// Start building tag again.
		tagBuilder += seg.value;
		break;
	    case "rangle":
		if(tagBuilder.length > 0) {
		    tagBuilder += seg.value; 
		    const found = KNOWN_TAGS.find((t) => t.tag === tagBuilder);
		    if(found) {
			tagCache.push(result.length);
			const newTag: ParsedSymbol = {type: "tag", value: tagBuilder};

			// Default to making close tag have an error and correct in validation pass later.
			if(found.type === "close") {
			    newTag.validation = {log: "Single Close"};
			}
			result.push(newTag);
			tagBuilder = "";
		    }
		    else {
			// Not found tag is displayed as plaintext for quality of life when editing.
			stringBuilder = tagBuilder;
			tagBuilder = "";
		    }
		} else {
		    // Tag was never started, treat as plain text.
		    stringBuilder += seg.value;
		}
		break;
	    case "letter":
		if(tagBuilder.length > 0)
		    tagBuilder += seg.value;
		else
		    stringBuilder += seg.value;
		break;
	    case "whitespace":
		flushBuilderToText(stringBuilder);
		stringBuilder = "";

		switch(seg.value) {
		    case " ":
			// Space could be part of the tag.
			if(tagBuilder.length > 0) {
			    // Assume double spaces are not allowed inside a tag.
			    // If Double spaces found, flush the tag - 1 as text and push 2 empty spaces with validation warning.
			    if(tagBuilder[tagBuilder.length - 1] === " ") {
				flushBuilderToText(tagBuilder.substring(0, tagBuilder.length - 1));
				tagBuilder = "";
				result.push({type: "whitespace", value: seg.value, validation: {log: "Double Space"}});
				result.push({type: "whitespace", value: seg.value, validation: {log: "Double Space"}});
			    } else
				tagBuilder += seg.value;
			} else {
			    if(result.length > 1 && result[result.length - 1].value === " ") {
				result[result.length - 1].validation = {log: "Double Space"};
				result.push({type: "whitespace", value: seg.value, validation: {log: "Double Space"}});
			    } else 
				result.push({type: "whitespace", value: seg.value});
			}
			break;
		    case "\n":
			flushBuilderToText(tagBuilder);
			tagBuilder = "";

			result.push({type: "whitespace", value: seg.value});
			break;
		}
		break;
	}
    }
    // Flush any remaining text.
    flushBuilderToText(stringBuilder);
    flushBuilderToText(tagBuilder);

    // Validation for tags (check if open tags have corresponding close tags).
    // An open tag and close tag must be assigned to the same group for this to work.
    // Note: 1 close tag can have many open tags in the same group (i.e. <COL RED>, <COL BLUE>, and </COL>).
    for(let i = 0; i < tagCache.length; ++i) {
	const knownMatch = KNOWN_TAGS.find((t) => t.tag === result[tagCache[i]].value);
	if(!knownMatch) continue;
	const tagType: TagType = knownMatch.type;
	
	// Ignore self contained tags like icons.
	if(tagType === "self contained") continue;
	if(tagType === "open" && knownMatch.group) {
	    let matchFound: boolean = false;
	    for(let j = i + 1; j < tagCache.length; ++j) {
		const matchAgainst = KNOWN_TAGS.find((t) => t.tag === result[tagCache[j]].value);
		if(!matchAgainst) continue; //This will never occur but good to be explicit.
		if(matchAgainst!.type === "close" && matchAgainst!.group === knownMatch.group) {
		    // Remove the close validation warning set earlier as a match has been found.
		    result[tagCache[j]].validation = undefined;
		    matchFound = true;
		    break;
		} else if(matchAgainst!.type === "open" && matchAgainst!.group === knownMatch.group) {
		    matchFound = false;
		    break;
		}
	    }
	    if(!matchFound)
		result[tagCache[i]].validation = {log: "Single Open"};
	}
    }

    return result;
}

// Helper function to print human readable validation logs.
function validationTypeToString(type: ValidationType): string {
    switch(type) {
	case "Double Space":
	    return "Multiple consecutive spaces detected"
	case "Single Open":
	    return "Unclosed open tag detected";
	case "Single Close":
	    return "Close tag without open detected";
	default:
	    return "Undefined validation warning";
    }
}

// Generate a span element chip for a single tag used in rich text markup.
function createTag(tag: ParsedSymbol, editable: boolean): HTMLSpanElement {
    const chip = document.createElement("span");
    chip.contentEditable = editable.toString()
    chip.dataset.tag = "tag";       	
    chip.textContent = tag.value;       // display text.
    chip.spellcheck = false;
    chip.className = "inline py-0.5 rounded bg-bg-highlight text-fb-base text-m font-mono border border-border-color";
    if(tag.validation) {	
	chip.className += " underline decoration-accent-orange decoration-wavy";
	chip.title = validationTypeToString(tag.validation.log);
    }
    return chip;
}

// Returns the character count per line array from a symbol stream 
// minus tags that do not have a character count.
// Note: Tags like icons contribute to the character count and should be included.
function characterCountPerLine(symbols: ParsedSymbol[]) : number[] {
    const result: number[] = [];
    let charCount: number = 0;
    for(let i = 0; i < symbols.length; ++i) {
	if(symbols[i].value === "\n") {
	    result.push(charCount);
	    charCount = 0;
	}
	else if(symbols[i].type === "tag") {
	    const found = KNOWN_TAGS.find((x) => x.tag === symbols[i].value);
	    if(found && found.characterCount) {
		charCount += found.characterCount;
	    }
	}
	else {
	    charCount += symbols[i].value.length;
	}
    }
    result.push(charCount);
    return result;
}

// Returns a string array of validation errors.
// Note: this will only generate errors like line count exceeded or character count exceeded.
// Per symbol warnings are generated during the parse.
function validateConstraints(symbols: ParsedSymbol[]): string[] {
    const errors: string[] = [];
    const lines: number[] = characterCountPerLine(symbols);
    for(let i = 0; i < lines.length; ++i) {
	if(lines[i] > MAX_CHARS_PER_LINE)
	    errors.push(`Line ${i + 1}: ${lines[i]} chars (max ${MAX_CHARS_PER_LINE})`);
    }

    if (lines.length > MAX_LINES) {
	errors.push(`Too many lines: ${lines.length} (max ${MAX_LINES})`);
    }
    return errors;
}

// Since we need to use a contentEditable div to render the rich text editor
// we need to take ownership of the DOM and render it to the div.
// This function takes a symbol array and generates the DOM in the passed div element.
function renderSymbolsToDom(el: HTMLDivElement, symbols: ParsedSymbol[], editable: boolean)
{
    el.innerHTML = "";
    
    for(let i = 0; i < symbols.length; ++i) {
	const seg: ParsedSymbol = symbols[i];
	switch(seg.type) {
	    case "tag":
		el.appendChild(createTag(seg, editable));
		break;
	    case "text":
		el.appendChild(document.createTextNode(seg.value));
		break;
	    case "whitespace":
		// Need to treat whitespaces seperately in order to display certain validation warnings.
		const span = document.createElement("span");
		span.contentEditable = editable.toString();
		span.dataset.tag = "whitespace";
		span.textContent = seg.value;
		span.className = "inline plaintext-pre";
		if(seg.validation) {
		    span.className += " underline decoration-accent-orange decoration-wavy";
		    span.title = validationTypeToString(seg.validation.log);
		}
		el.appendChild(span);
		break;
	}
    }
    
    el.querySelectorAll("[data-sentinel]").forEach((n) => n.remove());
    // Always append, serializer skips it, but it anchors the last line.
    // This is necessary to display a new line under the current one when 
    // enter pressed.
    const sentinel = document.createElement("BR");
    sentinel.dataset.sentinel = "true";
    sentinel.contentEditable = "false";
    el.appendChild(sentinel);
}

// Since we control the DOM, we need to serialize it into a string for 
// converting back to the target text string. 
function serializeFromDOM(el: HTMLDivElement): string {
    let result: string = "";

    el.childNodes.forEach((node) => {
	// Ignore the sentinel.
	if ((node as HTMLElement).dataset?.sentinel) return;
	if(node.nodeName === "BR")
	    result += "\n";
	else if(node.nodeType === Node.TEXT_NODE)
	    result += node.textContent;
	else
	    result += (node as HTMLElement).textContent;
    });
    return result;
}

// Helper function to get the raw offset from the start of our DOM div.
// This is necessary as just relying on range can give unpredicately results
// as the range could find itself within the div, a span, or a text element.
function getCaretRawOffset(el: HTMLDivElement): number {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return 0;

    const range = selection.getRangeAt(0);
    let offset = 0;

    //The starting container can be the editor which breaks newline enter, must be handled seperatly.
    if(range.startContainer === el) {
	for(let i = 0; i < range.startOffset; ++i) { 
	    const node = el.childNodes[i];
	    const htmlEl = node as HTMLElement;
	    if (htmlEl.dataset?.sentinel) continue;

	    // Node is entirely before the caret.
	    if (node.nodeName === "BR") {
	      offset += 1;
	    } else {
	      offset += node.textContent?.length ?? 0;
	    }
	}

	const inner = range.cloneRange();
	inner.setEnd(range.startContainer, range.startOffset);
	offset += inner.toString().length;
    } else {	
	// Walk child nodes, accumulating their raw string contribution.
	for (const node of Array.from(el.childNodes)) {
	    const htmlEl = node as HTMLElement;
	    if (htmlEl.dataset?.sentinel) continue;

	    if (node.contains(range.startContainer)) {
		// Caret is inside this child node.
		if (node.nodeName === "BR") {
		    offset += 1;
		} else {
		    // For text nodes and spans, use the range's string offset within this node.
		    const inner = range.cloneRange();
		    inner.selectNodeContents(node);
		    inner.setEnd(range.startContainer, range.startOffset);
		    offset += inner.toString().length;
		}
		break;
	    }

	    // Node is entirely before the caret.
	    if (node.nodeName === "BR") {
	      offset += 1; // BR = \n = 1 char in raw string.
	    } else {
	      offset += node.textContent?.length ?? 0;
	    }
	}
    }
    return offset;
}

// A helper function that sets the caret using the raw offset retrieved from the previous 
// function.
// Necessary for manual caret control in our contentEditable div.
function setCaretRawOffset(el: HTMLDivElement, targetOffset: number): void {
    const selection = window.getSelection();
    if (!selection) return;

    let remaining = targetOffset;
    const range = document.createRange();
    let placed = false;

    // Walk the children and subtract their text length until we reach the child we want to be place in.
    for (const node of Array.from(el.childNodes)) {
	const htmlEl = node as HTMLElement;
	if (htmlEl.dataset?.sentinel) continue;

	const len = node.nodeName === "BR" ? 1 : (node.textContent?.length ?? 0);
	
	// If we are to be placed within this child.
	if (remaining <= len) {
	    if (node.nodeName === "BR") {
		range.setStartBefore(node);
	    } else if (node.nodeType === Node.TEXT_NODE) {
		range.setStart(node, remaining);
	    } else {
		// Child can have children like the tags, must place within.
		if(node.childNodes.length > 0) {
		    for(const child of Array.from(node.childNodes)) {
			const childLen = child.textContent!.length;
			if(remaining <= childLen) {
			    if(child.textContent! === "\n")
				range.setStartAfter(child.parentNode!);
			    else
				range.setStart(child, remaining);
			    break;
			} else
			    remaining -= childLen;
		    }
		} else
		    remaining === 0 ? range.setStartBefore(node) : range.setStartAfter(node);
	    }
	    placed = true;
	    break;
	}

	remaining -= len;
    }

    if (!placed) {
	// Fell off the end, place at last non-sentinel node.
	const lastReal = Array.from(el.childNodes)
	    .filter(n => !(n as HTMLElement).dataset?.sentinel)
	    .at(-1);
	if (lastReal) 
	    range.setStartAfter(lastReal);
	else
	    range.setStart(el, 0); //Prevent caret from disappearing on empty div.
    }

    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

// Used when clicking on the copy button and for manual 'cut'
// command control.
async function copyToClipboard(text: string): Promise<void> {
    try {
	await navigator.clipboard.writeText(text);
    } catch (err) {
	console.error('Failed to copy: ', err);
    }
}

// Used to insert tags into the contentEditable div DOM via
// the buttons and hotkeys.
function insertTag(tag: string, 
		   targetRef: React.RefObject<HTMLDivElement | null>, 
		   caretPosition: React.RefObject<number | null>,
		   onInput: (caretPosition: number) => void) {
    const el = targetRef.current;
    if (!el) return;

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    if(range.startContainer !== targetRef.current! && !targetRef.current!.contains(range.startContainer)) return;
    range.deleteContents();

    caretPosition.current = getCaretRawOffset(targetRef.current!);
    const prevPos: number = caretPosition.current!;
    range.insertNode(document.createTextNode(tag));
    caretPosition.current += tag.length;

    onInput(prevPos);
};

// Helper function converts hotkey to human readable string for tooltip.
function hotkeyToString(key?: Key) {
    if(!key) return "";
    let stringBuilder: string = "[";
    if(key.ctrlKey) stringBuilder += "ctrl+";
    if(key.altKey) stringBuilder += "alt+";
    if(key.shiftKey) stringBuilder += "shift+";
    stringBuilder += key.key + "]";
    return stringBuilder;
}

// A Myers diff alogrithm inspired Wagner–Fischer diff function.
// Takes 2 symbol streams and returns a diff operation stream
// at a per symbol granularity.
function diffSymbols(oldSymbols: ParsedSymbol[], newSymbols: ParsedSymbol[]): DiffOp[] {
    const ops: DiffOp[] = [];
    const m = oldSymbols.length;
    const n = newSymbols.length;
    
    // Set up the col: (m + 1) row: (n + 1) matrix.
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for(let i = 0; i <= n; ++i)
	dp[0][i] = i;
    for(let j = 0; j <= m; ++j)
	dp[j][0] = j;
    
    // Fill the matrix with diff cost.
    for(let i = 1; i <= m; ++i) {
	for(let j = 1; j <= n; ++j) {
	    if(oldSymbols[i-1].value === newSymbols[j-1].value) {
		dp[i][j] = dp[i-1][j-1];
	    } else {
		dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1]) + 1;
	    }
	}
    }

    // Walk the matrix back to (0,0) following least 
    // resistance to find minimum diff operation array and reconstruct.
    let i = m;
    let j = n;
    while(i > 0 || j > 0) {
	// Equality check
	if(i > 0 && j > 0 && oldSymbols[i - 1].value === newSymbols[j - 1].value) {
	    ops.push({type: "equal", value: oldSymbols[i-1].value});
	    i--;
	    j--;
	// Otherwise, check if we came from a Deletion (up).
	} else if (i > 0 && (j === 0 || dp[i][j] === dp[i - 1][j] + 1)) {
            ops.push({ type: "delete", value: oldSymbols[i - 1].value });
            i--;
        } 
        // Or an Insertion (left).
        else {
            ops.push({ type: "insert", value: newSymbols[j - 1].value });
            j--;
        }
    }
   
    ops.reverse();
    return ops;
}

// Helper function to generate a tab array from our diff snapshot history.
function snapshotsToTabs(status: TranslationStatus, targetSymbols: ParsedSymbol[], snapshots: ParsedSymbol[][]): TabDef[] {
    const idx = STATUS_ORDER.indexOf(status);
    const result: TabDef[] = [];
    
    for(let i = 1; i < snapshots.length; ++i) {
	// Don't show future statuses.
	if(i > idx) continue;
	let target: ParsedSymbol[] = snapshots[i];
	// Use the current target text symbols here for live diff view.
	if(i === idx) 
	    target = targetSymbols
	result.push({
	    label: STATUS_ORDER[i - 1] + " <-> " + STATUS_ORDER[i],
	    content: ( <DiffViewer oldSymbols={snapshots[i - 1]} newSymbols={target} />)
	});
    }

    return result;
}

// A helper function for generating and mapping hotkey callbacks.
function useKey(targetKey: Key, callback: (event: KeyboardEvent) => void) {
    useEffect(() => {
	function handleKeyDown(event: KeyboardEvent) {
	    if (event.key === targetKey.key && 
		event.ctrlKey === targetKey.ctrlKey && 
		event.shiftKey === targetKey.shiftKey &&
		event.altKey === targetKey.altKey) {
		    callback(event);
	    }
	}

	// Add listener on mount.
	window.addEventListener('keydown', handleKeyDown);
    
	// Clean up listener on unmount to prevent memory leaks.
	return () => window.removeEventListener('keydown', handleKeyDown);
    }, [targetKey, callback]); // Re-run if target key or callback changes
}

/** COMPONENTS **/
// The uneditable source text display with rich text tag markup.
function SourceDisplay({symbols} : {symbols : ParsedSymbol[]})
{
    const sourceRef = useRef<HTMLDivElement>(null);
    //Render once and forget, but regenerate if the symbols change (from translation entry changing).
    useEffect(() => {
	renderSymbolsToDom(sourceRef.current!, symbols, false);
    }, [symbols]);

    return (
	<div 
	    ref={sourceRef}
	    contentEditable="false"
	    suppressContentEditableWarning
	    className="overflow-x-auto rounded bg-bg-surface border border-border-color px-3 py-2 min-h-24 font-sans text-xl leading-relaxed text-fb-base whitespace-pre"
	/>
    );
}

// The editable target text display with rich text markup.
function TargetDisplay({editorRef, onInput, isClean, caretPosition} : 
		       {editorRef: React.RefObject<HTMLDivElement | null>, onInput: (prevPos: number) => void, 
			isClean: boolean, caretPosition: React.RefObject<number | null>})
{
    // Default text edit behaviour completely breaks inside our editableContent div
    // so we need to handle certain behaviour manually.
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
	// Needed for a bug fix where arrow key movement does not update the caret position causing issues 
	// when undoing.
	caretPosition.current = getCaretRawOffset(editorRef.current!);
	
	if (e.key === "Enter") {
	    // Stop the browser inserting a <div> which breaks our DOM.
	    e.preventDefault();

	    //shift enter is used for progressing state hotkey so we exit here.
	    if(e.shiftKey) return;

	    const selection = window.getSelection();
	    if (!selection || !selection.rangeCount) return;

	    const range = selection.getRangeAt(0);
	    range.deleteContents();
	    caretPosition.current = getCaretRawOffset(editorRef.current!);
	    const prevPos = caretPosition.current!;
	    range.insertNode(document.createTextNode("\n"));
	    caretPosition.current += 1;
	    onInput(prevPos);
	}
	// When cutting/deleteing all content or backspacing empty div
	// caret and focus can get lost so we must manually handle position here.
	if (e.key === "Delete" || e.key === "Backspace" || (e.key === "x" && e.ctrlKey)) {
	    const selection = window.getSelection();
	    if (!selection) return;
	    const range = selection.getRangeAt(0);

	    // Check if everything is selected.
	    const fullRange = document.createRange();
	    fullRange.selectNodeContents(editorRef.current!);
	    if (range.toString() === fullRange.toString()) {
		e.preventDefault();
		//Restore copy to clipboard for ctrl-x.
		if(e.key === "x" && e.ctrlKey) {
		    copyToClipboard(range.toString());
		}
		// Clear manually.
		editorRef.current!.innerHTML = "";
		const prevPos = caretPosition.current!;
		caretPosition.current = 0;
		onInput(prevPos);
	    }
	}
    };

    return (
	<div 
	    ref={editorRef}
	    contentEditable="true"
	    onFocus={() => {caretPosition.current = getCaretRawOffset(editorRef.current!);}}
	    onClick={() => {caretPosition.current = getCaretRawOffset(editorRef.current!);}}
	    onInput={() => {
		const prevPos = caretPosition.current!;
		caretPosition.current = getCaretRawOffset(editorRef.current!);
		onInput(prevPos);}}
	    onKeyDown={handleKeyDown}
	    suppressContentEditableWarning
	    className={`whitespace-pre leading-relaxed overflow-x-auto w-full rounded bg-bg-overlay border px-3 py-2 font-sans text-fb-base text-xl resize-none focus:outline-none focus:ring-1 transition-colors ${
		isClean
		? "border-border-color focus:ring-accent-cyan"
		: "border-accent-red focus:ring-red-500"
		}`}
	/>
    );
}

// A constraints meter for showing validation warnings and errors.
function ConstraintMeter({symbols, errors} : {symbols: ParsedSymbol[], errors: string[]})
{
    const lines = characterCountPerLine(symbols);

    // Pad or trim to always show MAX_LINES rows so the layout is stable.
    const rows = Array.from({ length: MAX_LINES }, (_, i) => {
	const line = lines[i] ?? 0;
	const count: number = line;
	const pct = Math.min((count / MAX_CHARS_PER_LINE) * 100, 100);
	const over = count > MAX_CHARS_PER_LINE;
	return { count, pct, over };
    });

    const tooManyLines = lines.length > MAX_LINES;
    const errorFound = tooManyLines || rows.find((x) => x.over);
    const warnings: ValidationType[] = [];
    // Collect one of each validation warnings found.
    symbols.forEach((x) => {
	if(x.validation && !warnings.includes(x.validation.log))
	    warnings.push(x.validation.log);
    });
    const warningFound = warnings.length > 0;

    return (
	<div className="space-y-1 font-mono text-base">
	    {rows.map((row, i) => (
		<div key={i} className="flex items-center gap-2">
		    <span className="w-16 text-fb-base">Line {i + 1}</span>
		    {/* Progress bar */}
		    <div className="flex-1 h-2 bg-bg-highlight rounded overflow-hidden">
			<div 
			    className={`h-full rounded transition-all ${row.over ? "bg-accent-red" : "bg-accent-green"}`}
			    style={{ width: `${row.pct}%` }}
			/>
		    </div>
		    {/* Numerical count */}
		    <span className={`w-22 text-right ${row.over ? "text-accent-red" : "text-fb-base"}`}>
			{row.count} / {MAX_CHARS_PER_LINE}
		    </span>
		</div>
	    ))}
	    {/* Error list */}
	    {errorFound && (
		<p className="text-accent-red mt-1 text-xl">
		    ⚠ Errors detected (See below)
		</p>
	    )}

	    {errors.length > 0 && (
		<ul className="mt-2 mx-5 space-y-0.5">
		    {errors.map((err, i) => (
			<li key={i} className="text-base text-accent-red font-mono">
			    - {err}
			</li>
		    ))}
		</ul>
	    )}
	    {/* Warning list */}
	    {warningFound && (
		<p className="text-accent-orange mt-1 text-xl">
		    ⚠ Warnings detected (See below)
		</p>
	    )}

	    {warnings.length > 0 && (
		<ul className="mt-2 mx-5 space-y-0.5">
		    {warnings.map((war, i) => (
			<li key={i} className="text-base text-accent-orange font-mono">
			    - {validationTypeToString(war)}
			</li>
		    ))}
		</ul>
	    )}
	</div>
    );
}

// Show a game preview version of the translated text with 
// icons and markup properly injected.
// Note: The markup can be found in the KNOWN_TAGS definition.
function GamePreview({symbols} : {symbols: ParsedSymbol[]})
{
    let stringBuilder: string = "";

    for(let i = 0; i < symbols.length; ++i) {
	const sym: ParsedSymbol = symbols[i];
	switch(sym.type) {
	    case "text":
		// < and > replace necessary for unknown tags turned into text symbols.
		stringBuilder += sym.value.replace("<", "&lt;").replace(">", "&gt;");
		break;
	    case "whitespace":
		    stringBuilder += sym.value;
		break;
	    case "tag":
		// Don't inject a tag with validation issues.
		if(sym.validation)
		    break;
		const found = KNOWN_TAGS.find(tag => tag.tag === sym.value);
		if(found) {
		    stringBuilder += found.markup; 
		}
		break;
	}
    }
    return (
	<div className="rounded overflow-x-auto bg-bg-surface border border-border-color px-3 py-2 min-h-24">
	    <span
		className="inline-block whitespace-pre"
		// Spooky naming but this is fine as the html is our own predefined markup.
		dangerouslySetInnerHTML={{ __html: stringBuilder }}
	    />
	</div>
    );
}

// A toolbar with buttons for all the tags insertable into the target text.
// Each button category is generated dynamically from the groups present.
function TagToolbar({
    targetRef, onInput, caretPosition}: 
    {targetRef: React.RefObject<HTMLDivElement | null>; 
     onInput: (prevPosition: number) => void;
     caretPosition: React.RefObject<number | null>}) {

    const groupedTags = useMemo(() => {
	const grouped = KNOWN_TAGS.reduce((acc, tag) => {
	    if (!acc[tag.category]) acc[tag.category] = {};
	    const group = tag.group ?? "ungrouped";
	    if (!acc[tag.category][group]) acc[tag.category][group] = [];
	    acc[tag.category][group].push(tag);
	    return acc;
	}, {} as Record<TagCategory, Record<string, typeof KNOWN_TAGS>>);

	// Sort each category's groups so "ungrouped" always comes first.
	return Object.fromEntries(
	    Object.entries(grouped).map(([category, groups]) => [
		category,
		Object.fromEntries(
		    Object.entries(groups).sort(([a], [b]) => {
			if (a === "ungrouped") return -1;
			if (b === "ungrouped") return 1;
			// alphabetical for everything else.
			return a.localeCompare(b); 		    
		    })
		),
	    ])
	) as Record<TagCategory, Record<string, typeof KNOWN_TAGS>>;
    }, []);

    //Return the dynamically rendered tag buttons.
    return (
	<div className="space-y-2">
	    {Object.entries(groupedTags).map(([category, groups]) => (
		<div key={category} className="flex flex-col gap-1">
		    <span className="w-24 text-base font-mono text-fb-base mr-1">
			{category}
		    </span>
		    {Object.entries(groups).map(([group, tags]) => (
			<div key={group} className="px-4 flex flex-wrap gap-1">
			    {group !== "ungrouped" && (
				<span className="text-base font-mono text-fb-base mr-1 min-w-15">
				    {group}:
				</span>
			    )}
			    {tags.map((tag, i) => {
				return (
				    <button
					key={i}
					onClick={() => insertTag(tag.tag, targetRef, caretPosition, onInput)}
					className="px-2 py-0.5 text-base rounded bg-bg-overlay hover:bg-bg-highlight text-fb-base font-mono transition-colors"
					title={`Insert ${tag.tag}\n${hotkeyToString(tag.hotkey)}\nCharacter size: ${tag.characterCount ? tag.characterCount : 0}`}
				    >
					{tag.label}
				    </button>
				);
			    })}
			</div>
		    ))}
		</div>
	    ))}
	</div>
    );
}

// Simple copy button for easy copy to clipboard of source and target text.
function CopyButton({raw}: {raw: string}) {
    return (
	<button
	    onClick={() => copyToClipboard(raw)}
	    className="self-end w-12 h-10 px-2 py-0.5 text-base rounded bg-bg-overlay hover:bg-bg-highlight text-fb-base font-mono transition-colors"
	    title={`Copy to clipboard`}
	    >
	    <img className="mix-blend-normal opacity-80" src={copy}/>
	</button>
    );
}

// Show the current translation entry status and allow clicking to proceed.
function StatusBadge({status, onChange}: {status: TranslationStatus; onChange: (next: TranslationStatus) => void;}) {
    const advance = ((event: React.MouseEvent<HTMLButtonElement>) => {
	const idx = STATUS_ORDER.indexOf(status);
	if(event.shiftKey) {
	    if(idx - 1 >= 0)
		onChange(STATUS_ORDER[idx - 1]);
	} else {
	    if(idx + 1 < STATUS_ORDER.length)
		onChange(STATUS_ORDER[idx + 1]);
	}
    });

    return (
	<button
	    onClick={advance}
	    title={`Click to advance status\n[shift+enter]\nShift click to step back\n[ctrl+shift+enter]`}
	    className={`px-2 py-0.5 w-50 rounded text-xl font-mono uppercase tracking-wider cursor-pointer select-none ${STATUS_COLORS[status]}`}
	>
	    {status}
	</button>
    );
}

// A generic tab group component.
// Used for displaying diff history.
function Tabs({ tabs, idx, onTabChange }: { tabs: TabDef[], idx: number, onTabChange: (idx: number) => void }) {
    return (
	<div className="space-y-2">
	    {/* Tab bar */}
	    <div className="flex gap-1 border-b border-border-color">
		{tabs.map((tab, i) => (
		    <button
			key={i}
			onClick={() => onTabChange(i)}
			className={`px-3 py-1 text-l font-mono uppercase tracking-wider transition-colors
			    ${idx === i
				? "border-b-2 border-accent-cyan text-accent-cyan"
				: "text-fb-muted hover:text-fb-base"
			    }
			`}
		    >
			{tab.label}
		    </button>
		))}
	    </div>
	    {/* Active panel */}
	    <div>{tabs[idx]?.content}</div>
	</div>
    );
}

// A component to show the diff between two symbol arrays.
// Diff is shown as plain text for easier readability.
function DiffViewer({oldSymbols, newSymbols} : {oldSymbols: ParsedSymbol[], newSymbols: ParsedSymbol[]})
{
    const diffOps = diffSymbols(oldSymbols, newSymbols);
    return (
	<div
	    className="w-full whitespace-pre rounded bg-bg-surface border border-border-color px-3 py-2 text-base text-fb-base resize-none"
	>
	    {diffOps.map((op, i) => {
		return <span key={i} className={`${DIFF_COLORS[op.type]}`}>{op.value}</span>;
	    })}
	</div>
    );
}

/** Main **/
function App() {
    // Statically define here for component showcase but
    // realistically this would be fed from an Array of TranslationEntry.
    const [targetEntry, setTargetEntry] = useState<TranslationEntry>(
    {	    
	  id: "Text_001",
	  sourceText: `<OPT ZL>を押しながら
<ICON PAD_X>で<COL RED>上方移動</COL>、<ICON PAD_A>で<COL RED>前方移動</COL>、
<OPT ZR>で<COL RED>照準の方向へ移動</COL>ができます。`,
	  targetText: `While holding <OPT ZL>, press <ICON PAD_X> <COL RED>to move
vertically</COL>, press <ICON PAD_A> <COL RED>to move  forward</COL>, and
press <OPT ZR> <COL RED>to move where you are aiming</COL>.`,
	  note: "",
	  statusSnapshot: 
	  {
	      "untranslated": "",
	      "draft": "",
	      "review": "",
	      "approved": ""
	  },
	  status: "untranslated"
    });

    // Generic field updater for the active entry.
    const updateEntry = useCallback((patch: Partial<TranslationEntry>) => { 
			    setTargetEntry(prev => ({ ...prev, ...patch })); 
			}, []);
    
    const [diffTabIndex, setDiffTabIndex]   = useState<number>(0);

    const caretPosition     = useRef<number>(0);
    const undoStack 	    = useRef<UndoFrame[]>([]);
    const editorRef   	    = useRef<HTMLDivElement>(null);
 
    const targetSymbols = useMemo(() => {
	return tokenStreamToSymbols(lexString(targetEntry.targetText));
    }, [targetEntry.targetText]);

    const sourceSymbols = useMemo(() => {
	return tokenStreamToSymbols(lexString(targetEntry.sourceText));
    }, [targetEntry.sourceText]);

    // Read from target text and generate DOM.
    useEffect(() => {
	renderSymbolsToDom(editorRef.current!, targetSymbols, true);
	setCaretRawOffset(editorRef.current!, caretPosition.current);
    }, [targetEntry.targetText]);

    // Write to target text and update entry.
    const onInput = useCallback((prevPosition: number) => {
	const raw = serializeFromDOM(editorRef.current!);
	undoStack.current.push({value: targetEntry.targetText, caretPosition: prevPosition});
	updateEntry({targetText: raw});
    }, [targetEntry.targetText]);
     
    // Generate the snapshot symbols when updated.
    const snapshotSymbols = useMemo(() => {
	const snaps: ParsedSymbol[][] = [];
	Object.entries(targetEntry.statusSnapshot).forEach(([_status, snapshot]) => {
	    snaps.push(tokenStreamToSymbols(lexString(snapshot)));
	});
	return snaps;
    }, [targetEntry.statusSnapshot]);

    // Only generate the errors when the targetSymbols are updated.
    const errors      = useMemo(() => { 
	return validateConstraints(targetSymbols);
    }, [targetSymbols]);    

    const isClean     = errors.length === 0;
   
    // Manual undo management.
    const undoCallback = useCallback((event: KeyboardEvent) =>  {	
	event.preventDefault();
	if(undoStack.current!.length > 0) {
	    const popped: UndoFrame = undoStack.current!.pop()!;
	    caretPosition.current = popped.caretPosition;
	    updateEntry({targetText: popped.value});
	}
    }, []);

    useKey({key: "z", ctrlKey: true, altKey: false, shiftKey: false}, undoCallback);

    // Progress the status, used both for the hotkey and click behaviour..
    const progressStatus = useCallback((next: TranslationStatus) => {
	const newSnap = {...targetEntry.statusSnapshot};
	newSnap[targetEntry.status] = targetEntry.targetText;
	setDiffTabIndex(STATUS_ORDER.indexOf(next) - 1);
	updateEntry({ statusSnapshot: newSnap, status: next });
    }, [targetEntry.targetText, targetEntry.statusSnapshot, targetEntry.status]);

    // The actual hotkey callback for status progression.
    const progressStatusCallback = useCallback((event: KeyboardEvent) => {
	event.preventDefault();
	const idx = STATUS_ORDER.indexOf(targetEntry.status);
	if(idx + 1 < STATUS_ORDER.length)
	    progressStatus(STATUS_ORDER[idx + 1]);
    }, [targetEntry.status, progressStatus]);

    // Step back one status.
    const stepbackStatusCallback = useCallback((event: KeyboardEvent) => {
	event.preventDefault();
	const idx = STATUS_ORDER.indexOf(targetEntry.status);
	if(idx - 1 >= 0)
	    progressStatus(STATUS_ORDER[idx - 1]);
    }, [targetEntry.status, progressStatus]);

    useKey({key: "Enter", ctrlKey: false, altKey: false, shiftKey: true}, progressStatusCallback);
    useKey({key: "Enter", ctrlKey: true, altKey: false, shiftKey: true}, stepbackStatusCallback);
    
    // Hotkey callback for the tag hotkeys, all the hotkeys can be handled in one 
    // as we don't expect hotkey overlap.
    // Regenerated when onInput is regenerated.
    const hotkeyCallback = useCallback((event: KeyboardEvent) => {
	const matched = KNOWN_TAGS.find(t => 
	    t.hotkey &&
	    t.hotkey.key === event.key &&
	    t.hotkey.ctrlKey === event.ctrlKey &&
	    t.hotkey.shiftKey === event.shiftKey &&
	    t.hotkey.altKey === event.altKey
	);
	if (matched) {
	    event.preventDefault();
	    insertTag(matched.tag, editorRef, caretPosition, onInput);
	}
    }, [onInput]);

    // Assign the event listener here for the tag hotkeys seperately.
    useEffect(() => {
	window.addEventListener("keydown", hotkeyCallback);
	return () => window.removeEventListener("keydown", hotkeyCallback);
    }, [hotkeyCallback]);

    //The main render block.
    return (
	<div className="min-h-screen bg-bg-base text-fb-base flex font-sans">
	    <main className="flex-1 p-5 space-y-4 overflow-y-auto">
		{/* Header row */}
		<div className="flex items-center justify-between">
		    <h1 className="font-mono text-3xl">
			<b>{targetEntry.id}</b>
		    </h1>
		    <StatusBadge
			status={targetEntry.status}
			onChange={(next) => { progressStatus(next);}}
		    />
		</div>

		<div className="grid grid-cols-2 gap-4">
		    <div className="space-y-2 flex flex-col">
			<label className="block text-xl font-mono text-accent-cyan uppercase tracking-widest">
			    <b>Source (Japanese)</b>
			</label>
			<SourceDisplay symbols={sourceSymbols} />
			<CopyButton raw={targetEntry.sourceText}/>
		    </div>
		    <div className="space-y-2 flex flex-col">
			<label className="block text-xl font-mono text-accent-cyan uppercase tracking-widest">
			    <b>Target (English)</b>
			</label>
			<TargetDisplay editorRef={editorRef} onInput={onInput} isClean={isClean} caretPosition={caretPosition}/>
			<CopyButton raw={targetEntry.targetText}/>
		    </div>
		</div>

		<div className="grid grid-cols-2 gap-4 items-start">
		    {/* Constraint meter */}
		    <div className="rounded bg-bg-surface border border-border-color px-3 py-2">
			<p className="text-base text-fb-base font-mono mb-2 uppercase tracking-widest">
			    Text Validation
			</p>
			<ConstraintMeter symbols={targetSymbols} errors={errors} />
		    </div>

		    {/* Tag insertion toolbar */}
		    <div className="rounded bg-bg-surface border border-border-color px-3 py-2">
		      <label className="text-base text-fb-base font-mono mb-2 uppercase tracking-widest">
			Insert Tag
		      </label>
		      <TagToolbar
			targetRef={editorRef}
			onInput={onInput}
			caretPosition={caretPosition}
		      />
		    </div>
		</div>


		{/* Game preview */}
		<div className="grid grid-cols-2 gap-4">
		    <div className="space-y-2">
			<label className="block text-xl font-mono text-accent-purple uppercase tracking-widest">
			    <b>Preview (Japanese)</b>
			</label>
			<GamePreview symbols={sourceSymbols}/>
		    </div>
		    <div className="space-y-2">
			<label className="block text-xl font-mono text-accent-purple uppercase tracking-widest">
			    <b>Preview (English)</b>
			</label>
			<GamePreview symbols={targetSymbols}/>
		    </div>
		</div>

		<div className="grid grid-cols-2 gap-4 items-start">
		    {/* Translator notes */}
		    <div className="space-y-2">
			<label className="block text-base font-mono text-fb-base uppercase tracking-widest">
			    Translator Notes
			</label>
			<textarea
			    value={targetEntry.note}
			    onChange={(e) => updateEntry({note: e.target.value})}
			    placeholder="Add context, questions, or review flags…"
			    rows={3}
			    className="text-base w-full rounded bg-bg-surface border border-border-color px-3 py-2 text-fb-base resize-none focus:outline-none focus:ring-1 focus:ring-accent-cyan"
			/>
		    </div>
		    {/* Diff viewer */}
		    <div className="space-y-2">
			<label className="block text-base font-mono text-fb-base uppercase tracking-widest">
			    Diff Viewer
			</label>
			{targetEntry.status === "untranslated" ? (
			    <span className="text-accent-orange font-mono text-base">
				Status must be at "Draft" or higher to see diff history. 
				Press the status badge on the top right corner, or press shift + enter to progress.
			    </span>
			) : (
			    <Tabs
				tabs={snapshotsToTabs(targetEntry.status, targetSymbols, snapshotSymbols)}			    
				idx={diffTabIndex}
				onTabChange={setDiffTabIndex}
			    />
			)}
		    </div>
		</div>

	    </main>
	</div>
    );
}

export default App
