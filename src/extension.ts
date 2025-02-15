'use strict';

import * as vscode from 'vscode';


const pasteAndIndent = () => {
	const config = vscode.workspace.getConfiguration('pasteAndIndent');
	const editor = vscode.window.activeTextEditor;
	const start = editor.selection.start;
	let offset = start.character;
	const indentChar = editor.options.insertSpaces ? ' ' : '\t';
	const startLine = editor.document.getText(new vscode.Selection(start.line, 0, start.line, start.character));
	const startChar = startLine.search(/\S/);

	if (startChar > -1) {
		offset = startChar;
	}
	vscode.commands.executeCommand('editor.action.clipboardPasteAction').then(() => {
		const end = editor.selection.end;
		const selectionToIndent = new vscode.Selection(start.line, start.character, end.line, end.character);
		const selectedText = editor.document.getText(selectionToIndent);
		const leadingSpaces = []; // The amount of leading space the line has
		let xmin; // The minimum amount of leading space amongst the non-empty lines
		let linesToIndent = selectedText.split('\n');

		if (linesToIndent.length <= 1) {
			return; // Skip indentation
		}
		// Find out what is the minimum leading space of the non empty lines (xmin)
		linesToIndent.forEach((line, index) => {
			let _xmin = line.search(/\S/); // -1 means the line is blank (full of space characters)
			let numberOfTabs;
			if (_xmin !== -1) {
				// Normalize the line according to the indentation preferences
				if (editor.options.insertSpaces) { // When we are in SPACE mode
					numberOfTabs = line.substring(0, _xmin).split(/\t/).length - 1;
					_xmin += numberOfTabs * (Number(editor.options.tabSize) - 1);
				} else { // When we are in TAB mode
					// Reduce _xmin by how many space characters are in the line
					_xmin -= (line.substring(0, _xmin).match(/[^\t]+/g) || []).length;
				}
				if (index > 0 && (typeof xmin === 'undefined' || xmin > _xmin)) {
					xmin = _xmin;
				}
			}
			leadingSpaces[index] = _xmin;
		});
		if (xmin === 0 && offset === 0) {
			return; // Skip indentation
		}
		linesToIndent = linesToIndent.map((line, index) => {
			const x = leadingSpaces[index];
			const chars = (index === 0 || x === -1) ? '' : indentChar.repeat(x - xmin + offset);

			return line.replace(/^\s*/, chars);
		});
		editor.edit((editBuilder: vscode.TextEditorEdit) => {
			editBuilder.replace(selectionToIndent, linesToIndent.join('\n'));
			if (linesToIndent.length > 1 && config.get('selectAfter', false)) {
				//editor.selection = new vscode.Selection(start.line + 1, 0, end.line, linesToIndent[linesToIndent.length - 1].length);
				//>[2025-02-15T14:42:07.345+08:00_W7-6]
				editor.selection = new vscode.Selection(start.line + 0, 0, end.line, linesToIndent[linesToIndent.length - 1].length);
			}
		});
	});
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('pasteAndIndent.action', pasteAndIndent)
	);
}

export function deactivate() {
}
