const {Wit, log} = require('node-wit')

if (process.argv.length <= 2) {
  console.log('Usage:\n  npm run validate -- \'/remind someone about something at some point in time\'\n')
  process.exit(0)
}

require('dotenv').config()

WitClient = new Wit({
  accessToken: process.env.WIT_AI_TOKEN,
  logger: new log.Logger(log.DEBUG)
})

WitClient.message(process.argv[2]).then(data => {
  let intent, user, action, date
  intent = user = action = date = null
  if ('entities' in data && 'intent' in data.entities && data.entities.intent.length > 0) {
    let {value, suggested} = data.entities.intent.reduce((a, b) => a.confidence >= b.confidence ? a : b)
    intent = {value, suggested}
  }
  if ('entities' in data && 'user_name' in data.entities && data.entities.user_name.length > 0) {
    let {value, suggested} = data.entities.user_name.reduce((a, b) => a.confidence >= b.confidence ? a : b)
    user = {value, suggested}
  }
  if ('entities' in data && 'action' in data.entities && data.entities.action.length > 0) {
    let {value, suggested} = data.entities.action.reduce((a, b) => a.confidence >= b.confidence ? a : b)
    action = {value, suggested}
  }
  if ('entities' in data && 'datetime' in data.entities && data.entities.datetime.length > 0) {
    let datetime = data.entities.datetime.reduce((a, b) => a.confidence >= b.confidence ? a : b)
    switch (datetime.type) {
      case 'value':
        date = {value: datetime.value, grain: datetime.grain}
        break;
      case 'interval':
        date = {from: null, to: null}
        date.from = 'from' in datetime ? {value: datetime.from.value, grain: datetime.from.grain} : null
        date.to = 'to' in datetime ? {value: datetime.to.value, grain: datetime.to.grain} : null
    }
  }
  console.log('------ Wit.ai Response (Parsed) ------')
  console.log('Intent => ', intent)
  console.log('User => ', user)
  console.log('Action => ', action)
  console.log('Date => ', date)
}).catch(console.error)