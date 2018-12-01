const fs = require('fs'),
	  uuidv1 = require('uuid/v1'),
	  execFileSync = require('child_process').execFileSync,
	  stylelint = require('stylelint'),
	  Eslinter = require('eslint').Linter,
	  Eslint = new Eslinter()

async function cssLint(context, file) {
	let annotations = [],
		result = await stylelint.lint({
		code: file.content,
		codeFilename: file.name,
		formatter: 'compact',
		config: {
			'extends': 'stylelint-config-recommended' // stylelint-config-standard
		}
	})

	context.log('----------- CSS Lint -----------')
	context.log(result.results[0])
	context.log('--------------------------------')

	if (result.errored) {
		result.results[0].warnings.map(warning => {
			if (warning.severity == 'error') {
				annotations.push({line: warning.line, column: warning.column, level: 'failure', rule: warning.rule, result: warning.text})
			}
		})
	}

	return {filename: file.name, url: file.url, annotations}
}

async function jsLint(context, file) {
	let annotations = [],
		results = await Eslint.verify(
		file.content,
		{
			'parser': 'babel-eslint',
			'plugins': ['react'],
			'extends': ['eslint:recommended', 'plugin:react/recommeded']
		},
		{
			filename: file.name,
			allowInlineConfig: false
		}
	)

	context.log('----------- JS Lint -----------')
	context.log(results)
	context.log('-------------------------------')

	results.map(result => {
		if (result.fatal) {
			annotations.push({line: result.line, end_line: result.endLine ? result.endLine : null, level: 'failure', rule: 'parse-error', result: result.message})
		} else {
			annotations.push({line: result.line, end_line: result.endLine ? result.endLine : null, level: 'warning', rule: result.ruleId, result: result.message})
		}
	})

	return {filename: file.name, url: file.url, annotations}
}

async function goLint(context, file) {
	let annotations = [],
		filename = uuidv1()
	fs.writeFileSync(`/tmp/${filename}.go`, file.content)
	try {
		execFileSync('./bin/golint', ['-set_exit_status', `/tmp/${filename}.go`])
	} catch (error) {
		fs.unlinkSync(`/tmp/${filename}.go`)

		context.log('----------- Go Lint -----------')
		context.log(error.stderr.toString())
		context.log(error.stdout.toString())
		context.log('-------------------------------')

		if (error.status === 1) {
			error.stdout.toString().split('\n').map(error => {
				if (error.trim().length != 0) {
					let match = error.trim().match(/^.*:([0-9]+):([0-9]+):(.*)$/)
					if (match) {
						annotations.push({line: parseInt(match[1]), column: parseInt(match[2]), level: 'failure', rule: 'lint-error', result: match[3].trim()})
					}
				}
			})
			return {filename: file.name, url: file.url, annotations}
		}
	}
	fs.unlinkSync(`/tmp/${filename}.go`)
	return {filename: file.name, url: file.url, annotations}
}

async function Lint(context, files) {

	let annotations = []

	let cssErrors = files.css.map(async css => {
		return await cssLint(context, css)
	})

	let jsErrors = files.js.map(async js => {
		return await jsLint(context, js)
	})

	let goErrors = files.go.map(async go => {
		return await goLint(context, go)
	})

	for (let cssError of cssErrors) {
		let result = await cssError
		if (result.annotations.length) {
			for (let error of result.annotations) {
				annotations.push({
					filename: result.filename,
					blob_href: result.url,
					start_line: error.line,
					end_line: error.end_line ? error.end_line : error.line,
					warning_level: error.level,  // warning, failure, notice
					message: error.result,  // A short description of the feedback for these lines of code. The maximum size is 64 KB.
					title: error.rule  // The title that represents the annotation. The maximum size is 255 characters.
				})
			}
		}
	}

	for (let jsError of jsErrors) {
		let result = await jsError
		if (result.annotations.length) {
			for (let error of result.annotations) {
				annotations.push({
					filename: result.filename,
					blob_href: result.url,
					start_line: error.line,
					end_line: error.end_line ? error.end_line : error.line,
					warning_level: error.level,
					message: error.result,
					title: error.rule
				})
			}
		}
	}

	for (let goError of goErrors) {
		let result = await goError
		if (result.annotations.length) {
			for (let error of result.annotations) {
				annotations.push({
					filename: result.filename,
					blob_href: result.url,
					start_line: error.line,
					end_line: error.end_line ? error.end_line : error.line,
					warning_level: error.level,
					message: error.result,
					title: error.rule
				})
			}
		}
	}

	return annotations
}

module.exports = Lint