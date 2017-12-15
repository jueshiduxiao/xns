#!/usr/bin/env node

const compiler = require('../src/index.js');

const menu = {
	commands: {
		start: {
			describe: 'start the server',
			options: {
				port: {
					alias: 'p',
					describe: 'port'
				}
			}
		}
	},
	options: {
		version: {
			alias: 'v',
			describe: 'output the version number'
		},
		help: {
			alias: 'h',
			describe: 'output usage information'
		}
	}
};

const showHelp = (name, data) => {
	var content = [];

	if (name !== '') {
		content = content.concat([
			'',
			'  Usage: ' + name,
			''
		]);
	}

	if (data.commands) {
		content = content.concat([
			'  Commands:',
			''
		]);
		(function () {
			var s, k, v, i;
			for (var k in data.commands) {
				v = data.commands[k];
				s = '';
				for (i = 0; i < 8 + 6 - k.length; i++) {
					s += ' ';
				}
				content.push('    ' + k + s + v.describe);
			}
		}());
		content.push('');
	}

	if (data.options) {
		content = content.concat([
			'  Options:',
			''
		]);
		(function () {
			var s, k, v, i;
			for (var k in data.options) {
				v = data.options[k];
				s = '';
				for (i = 0; i < 8 - k.length; i++) {
					s += ' ';
				}
				content.push('    -' + v.alias + ', --' + k + s + v.describe);
			}
		}());
	}

	console.log(content.join('\n') + '\n');
};

const showError = function (name) {
	var content = [
		'',
		'  Error:',
		'',
		'    The \'' + name + '\' is not a command.',
		'    See \'mdev --help\'.'
	];

	console.log(content.join('\n') + '\n');
};

const showVersion = function () {
	var p = require('../package.json');
	var content = [
		'',
		'  Version: ' + p.version,
		'',
		`    By ${p.author.name} ${p.license}.`,
		`    The more commands see '${p.name} --help'.`
	];

	console.log(content.join('\n') + '\n');
};

const run = function () {
	var optimist = require('optimist');
	var args = optimist.argv;
	var p = require('../package.json');

	// version
	if (args.v || args.version) {
		showVersion();
		return;
	}

	// help
	if (args._.length === 0) {
		showHelp(p.name, menu);
		return;
	}

	var command = args._[0];
	if (!menu.commands[command]) {
		showError(command);
	} else {
		if (args.h || args.help) {
			showHelp(command, menu.commands[command]);
		}

		if (command === 'start') {
		  compiler.start();
		}
	}
};

run();
