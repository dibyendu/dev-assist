const
generate = require('./generate-sample'),
axios = require('axios'),
fs = require('fs'),
readline = require('readline'),
WIT_AI_APP_NAME = 'dev-assist(github-bot)',
WIT_AI_API_URL = 'https://api.wit.ai',
TRAINING_DATA_ENTITY_DIR = './wit.ai/training_set/entities/',
TRAINING_DATA_SAMPLE_DIR = './wit.ai/training_set/samples/'

require('dotenv').config()

var guid = () => {
	let s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
	return s4() + s4()
}

generate()

axios.get(`${WIT_AI_API_URL}/apps`, {
	params: {
		limit: 100
	},
	headers: {
		'Authorization': 'Bearer ' + process.env.WIT_AI_TOKEN,
		'Content-Type': 'application/json'
	}
}).then(response => {
	let { data: apps, status, statusText } = response
	app = apps.filter(app => app.name.search(/^dev-assist.*$/i) == 0)[0]
	if (app) {
		let deleted_app_name = app.name,
		deleted_app_id = process.env.WIT_AI_APP_ID,
		new_app_name = `dev-assist-${guid()}`
		axios.post(`${WIT_AI_API_URL}/apps`, {
			name: new_app_name,
			lang: 'en',
			'private': false
		}, {
			headers: {
				'Authorization': 'Bearer ' + process.env.WIT_AI_TOKEN,
				'Content-Type': 'application/json'
			}
		}).then(response => {
			let { data: app, status, statusText } = response
			console.log(`Created the new app '${new_app_name}'`)
			axios.delete(`${WIT_AI_API_URL}/apps/${deleted_app_id}`, {
				headers: {
					'Authorization': 'Bearer ' + process.env.WIT_AI_TOKEN,
					'Content-Type': 'application/json'
				}
			}).then(response => {
				let { data, status, statusText } = response
				if (data.success) {
					console.log(`Deleted the old app '${deleted_app_name}'`)
					let output = '',
					lineReader = readline.createInterface({
						input: fs.createReadStream('.env')
					})
					lineReader.on('line', line => {
						if (!line.trim().startsWith('#')) {
							let key_val = line.split('=')
							if (key_val[0] === 'WIT_AI_TOKEN')
							output += `${key_val[0]}=${app.access_token}\n`
							else if (key_val[0] === 'WIT_AI_APP_ID')
							output += `${key_val[0]}=${app.app_id}\n`
							else
							output += line + '\n'
						} else {
							output += line + '\n'
						}
					})
					lineReader.on('close', () => {
						fs.writeFileSync('.env', output)
					})
					axios.put(`${WIT_AI_API_URL}/apps/${app.app_id}`, {
						name: `${WIT_AI_APP_NAME}`,
						timezone: 'Etc/GMT',
						desc: 'Wit.ai comment parser application for the Github app called \'dev-assist\''
					}, {
						headers: {
							'Authorization': 'Bearer ' + app.access_token,
							'Content-Type': 'application/json'
						}
					}).then(async ({ data, status, statusText }) => {
						if (data.success) {
							console.log(`Updated the new app and renamed it to ${WIT_AI_APP_NAME}`)

							// --------------- entities ---------------
							let responses = fs.readdirSync(TRAINING_DATA_ENTITY_DIR).map(async file => {
								await axios.post(
									`${WIT_AI_API_URL}/entities`,
									JSON.parse(fs.readFileSync(`${TRAINING_DATA_ENTITY_DIR}${file}`)),
									{
										headers: {
											'Authorization': 'Bearer ' + app.access_token,
											'Content-Type': 'application/json'
										}
									}
								)
							})
							for (let response of responses) {
								await response
							}

							// --------------- samples ---------------
							let payload = fs.readdirSync(TRAINING_DATA_SAMPLE_DIR).map(file => JSON.parse(fs.readFileSync(`${TRAINING_DATA_SAMPLE_DIR}${file}`)))
							axios.post(`${WIT_AI_API_URL}/samples`, JSON.stringify(payload), {
								headers: {
									'Authorization': 'Bearer ' + app.access_token,
									'Content-Type': 'application/json'
								}
							}).then(({ data, status, statusText }) => {
								if (data.sent) {
									console.log(`Successfully scheduled training for the new app with ${data.n} samples`)
								}
							}).catch(error => {
								let { data, status, statusText } = error.response
								console.error('Training of the app with samples failed')
								console.error(data)
							})
						}
					}).catch(error => {
						let data = ('response' in error && 'data' in error.response) ? error.response.data : error
						console.error('App updation error')
						console.error(data)
					})
				}
			}).catch(error => {
				let { data, status, statusText } = error.response
				console.error('App deletion error')
				console.error(data)
			})
		}).catch(error => {
			let { data, status, statusText } = error.response
			console.error('App creation error')
			console.error(data)
		})
	}
}).catch(error => {
	let { data, status, statusText } = error.response
	console.error('App listing error')
	console.error(data)
})