const util = require('./util'),
	  Lint = require('./lint'),
	  GITHUB_API_URL = 'https://api.github.com'

function createCheckRun(context, check, sha) {
	const {owner, repo} = context.repo()

	util.getFileContent(context, check.pull_requests).then(pull_requests_files => {
		pull_requests_files.map(pull_request_files => {
			let file_map = { css:[], js: [], go: [] }
			pull_request_files.files.map(file => {
				if (/(.sass|.scss|.less|.sss|.css)$/.test(file.name)) {
					file_map.css.push(file)
				} else if (/(.js|.jsx)$/.test(file.name)) {
					file_map.js.push(file)
				} else if (/(.go)$/.test(file.name)) {
					file_map.go.push(file)
				}
			})

			if ( ! (file_map.css.length || file_map.js.length || file_map.go.length) ) {
				return
			}

			context.github.request(Object.assign({
				method: 'POST',
				url: `${GITHUB_API_URL}/repos/${owner}/${repo}/check-runs`,
				name: 'Linter',
				head_sha: sha,
				status: 'in_progress', // queued, in_progress, completed
				started_at: (new Date()).toISOString()
			}, {
				headers: { accept: 'application/vnd.github.antiope-preview+json' }
			})).then(result => {
				const {data: {id: check_run_id, url: check_run_url}} = result

				Lint(context, file_map).then(annotations => {
					let conclusion = (
						annotations.some(annotations => annotations.warning_level == 'failure')
						?
						'failure'
						: (
							annotations.some(annotations => annotations.warning_level == 'warning')
							?
							'action_required'
							: (
								annotations.some(annotations => annotations.warning_level == 'notice')
								?
								'neutral'
								:
								'success'
							)
						)
					)

					// Provide feedback
					let options = {
						method: 'PATCH',
						url: check_run_url,
						status: 'completed', // queued, in_progress, completed
						conclusion,          // success, failure, neutral, cancelled, timed_out, action_required
						completed_at: (new Date()).toISOString()
					}
					if (annotations.length > 0) {
						options = Object.assign({
							output: {
								title: 'Lint analysis',
								summary: `Linter found ${annotations.length} issue${annotations.length === 1 ? '' : 's'}`,
								annotations: annotations
							}
			  			}, options)
					}
					context.github.request(
						Object.assign(options, {headers: {accept: 'application/vnd.github.antiope-preview+json'}})
					)
				})
			})
		})
	})
}

module.exports = createCheckRun