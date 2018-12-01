const
fs = require('fs'),
util = require('util')

if (!fs.existsSync('./wit.ai/training_set')){
	fs.mkdirSync('./wit.ai/training_set')
}
if (!fs.existsSync('./wit.ai/training_set/samples')){
	fs.mkdirSync('./wit.ai/training_set/samples')
}
if (!fs.existsSync('./wit.ai/training_set/entities')){
	fs.mkdirSync('./wit.ai/training_set/entities')
}


fs.writeFile('./wit.ai/training_set/entities/user', `{
	"id": "user_name",
	"doc": "GitHub username"
}`, () => {})

fs.writeFile('./wit.ai/training_set/entities/action', `{
	"id": "action",
	"doc": "Action to be performed by the user"
}`, () => {})

var users = ['me', '@fabpot', '@taylorotwell', '@egoist', '@HugoGiraudel', '@ornicar', '@bebraw', '@nelsonic', '@alexcrichton', '@jonathanong', '@mikermcneil', '@benbalter', '@jxnblk', '@yegor256', '@orta', '@rstacruz', '@GrahamCampbell', '@afc163', '@kamranahmedse', '@joshaber', '@kennethreitz', '@STRML', '@atmos', '@weierophinney', '@agentzh', '@steipete', '@ai', '@mikepenz', '@nvie', '@hadley', '@appleboy', '@Rich-Harris', '@drnic', '@rafaelfranca', '@Ocramius', '@mitchellh', '@stof', '@IgorMinar', '@phodal', '@jwiegley', '@geerlingguy', '@dcramer', '@sebastianbergmann', '@brunocvcunha', '@ljharb', '@sevilayha', '@paulmillr', '@tmm1', '@c9s', '@zcbenz', '@holman', '@kevinsawicki', '@yihui', '@buckyroberts', '@dmalan', '@mgechev', '@kylef', '@ayende', '@mcollina', '@mdo', '@yoshuawuyts', '@muan', '@kentcdodds', '@jskeet', '@mitsuhiko', '@steveklabnik', '@hzoo', '@Caged', '@dlew', '@technoweenie', '@gaearon', '@soumith', '@feross', '@michalbe', '@brianleroux', '@willdurand', '@alexjlockwood', '@matsko', '@stefanpenner', '@adamwathan', '@Haacked', '@curran', '@rauchg', '@ianstormtaylor', '@KrauseFx', '@tj', '@jgm', '@jverkoey', '@chenglou', '@DataTables', '@SamyPesse', '@mjhea0', '@0x00A', '@tmcw', '@brentvatne', '@benjamn', '@notwaldorf', '@miyagawa', '@rnystrom', '@photonstorm', '@mattn', '@JakeWharton', '@yyx990803', '@krzysztofzablocki', '@eduardolundgren', '@vjeux', '@mxcl', '@domenic', '@josegonzalez', '@fzaninotto', '@pissang', '@jamesmontemagno', '@paulcbetts', '@paulirish', '@samdark', '@madskristensen', '@sokra', '@marijnh', '@alanhamlett', '@wesm', '@josevalim', '@jennybc', '@BurntSushi', '@zenorocha', '@contra', '@jaredhanson', '@radar', '@bevacqua', '@xudafeng', '@j2kun', '@dominictarr', '@avelino', '@vinta', '@developit', '@ashleygwilliams', '@ashfurrow', '@f', '@onevcat', '@toddmotto', '@gdi2290', '@ankane', '@keijiro', '@nolimits4web', '@davidfowl', '@biezhi', '@LeaVerou', '@davidtmiller', '@vhf', '@soffes', '@mxstbr', '@Jinjiang', '@happypeter', '@mafintosh', '@vczh', '@Draveness', '@ded', '@vladikoff', '@bnoordhuis', '@jendewalt', '@jessfraz', '@indutny', '@olivergierke', '@i5ting', '@laanwj', '@drakeet', '@thejameskyle', '@ahmetb', '@sdiehl', '@jaywcjlove', '@gitster', '@djspiewak', '@evilsocket', '@mariotaku', '@shama', '@CamDavidsonPilon', '@dsyer', '@winterbe', '@dennybritz', '@arun-gupta', '@maryrosecook', '@killme2008', '@IanLunn', '@ruanyf', '@binux', '@nfultz', '@leah', '@suissa', '@anishathalye', '@pkrumins', '@isaacs', '@staltz', '@KittenYang', '@leebyron', '@fengmk2', '@passy', '@gorhill', '@phuslu', '@mrmrs', '@siddontang', '@daylerees', '@weavejester', '@zce', '@philsturgeon', '@oldratlee', '@josephmisiti', '@atian25', '@ebidel', '@overtrue', '@connors', '@eliben', '@Seldaek', '@bailicangdu', '@nikic', '@codahale', '@amitshekhariitbhu', '@rakyll', '@junyanz', '@simurai', '@nicolasgramlich', '@shiffman', '@purcell', '@evanphx', '@ericelliott', '@matyhtf', '@AdamBien', '@rtomayko', '@tomchristie', '@be5invis', '@amueller', '@dead-horse', '@remy', '@jiyinyiyong', '@Shougo', '@arunoda', '@benoitc', '@ask', '@JohnSundell', '@Raynos', '@samuelclay', '@unicodeveloper']
var actions = ['about this issue', 'about this', 'about it', '', 'to resolve it', 'to resolve this issue', 'to get back to this', 'to get back to this issue', 'to get back to it', 'to merge it', 'to merge pr #123', 'to merge pr number 789', 'to merge pull request #4567', 'to merge this pr', 'to merge this pull request', 'regarding it', '', 'to close this issue', 'to close it']
var datetimes = ['at 10pm tomorrow', 'on next saturday', 'after 2 days', 'in a week', 'in a month', 'next month', 'after two months', 'in three days', 'after 8hrs', 'after 8 hours', 'in the weedends', 'the day after tmrw', 'in wednesday', 'in 15mins', 'in 12 hrs', 'at 6 tomorrow', 'at 14hrs of the day after tmrw', 'at 3AM on next sunday']
var template = '/remind %s %s %s'
var count = 1

let action_fetch = template => {
	let action = actions.shift(),
	action_start_index = template.indexOf('%')
	actions.push(action)
	return {value: action, index: action_start_index, template: util.format(template, action), empty: action === '' ? true : false}
}

var second_datetimes = []
let datetime_fetch = template => {
	let temp = datetimes.splice(Math.floor(Math.random() * datetimes.length)),
		datetime = temp.shift()
	datetimes = datetimes.concat(temp)
	second_datetimes.push(datetime)
	if (datetimes.length === 0) {
		datetimes = second_datetimes
		second_datetimes = []
	}
	datetime_start_index = template.indexOf('%')
	return {value: datetime, index: datetime_start_index, template: util.format(template, datetime)}
}

function generate() {
	for (let user of users) {
		let user_start_index = template.indexOf('%'),
		cur_template = util.format(template, user),
		action,
		action_start_index,
		datetime,
		datetime_start_index,
		is_action_empty

		if (Math.floor(Math.random() * Math.floor(10)) <= 6) {
			let {value, index, template, empty} = action_fetch(cur_template)
			action = value
			action_start_index = index
			cur_template = template
			is_action_empty = empty
			let {value: new_value, index: new_index, template: new_template} = datetime_fetch(cur_template)
			datetime = new_value
			datetime_start_index = new_index
			cur_template = new_template
		} else {
			let {value, index, template} = datetime_fetch(cur_template)
			datetime = value
			datetime_start_index = index
			cur_template = template
			let {value: new_value, index: new_index, template: new_template, empty} = action_fetch(cur_template)
			action = new_value
			action_start_index = new_index
			cur_template = new_template
			is_action_empty = empty
		}

		let sample = `{
			"text": "${cur_template}",
			"entities": [
				{
					"entity": "intent",
					"value": "reminder"
				},
				{
					"entity": "user_name",
					"value": "${user}",
					"start": ${user_start_index},
					"end": ${user_start_index + user.length}
				},
				${ is_action_empty ? '' : `{
					"entity": "action",
					"value": "${action}",
					"start": ${action_start_index},
					"end": ${action_start_index + action.length}
				},` }
				{
					"entity": "wit$datetime",
					"value": "${datetime}",
					"start": ${datetime_start_index},
					"end": ${datetime_start_index + datetime.length}
				}
			]
		}`
		fs.writeFile(`./wit.ai/training_set/samples/reminder-${count++}`, sample, () => {})
	}
}

module.exports = generate