const axios = require('axios'),
      MongoClient = require('mongodb').MongoClient,
      {Wit, log} = require('node-wit'),
      createScheduler = require('probot-scheduler'),
      util = require('./lib/util'),
      createCheckRun = require('./lib/check-run')

const SCHEDULER_INTERVAL = 15,  // minutes
      BOT_NAME = 'dev-assist[bot]',
      CONFIGURATION_FILE = 'dev-assist.yml', // .github/dev-assist.yml must exist in the default branch
      GITHUB_API_URL = 'https://api.github.com',
      IMGUR_UPLOAD_API = 'https://api.imgur.com/3/image',
      DBURL = process.env.DB_URL,
      DBUSER = process.env.DB_USER,
      DBPASS = process.env.DB_PASS,
      DBNAME = process.env.DB_NAME,
      DBCOLLECTION = process.env.DB_COLLECTION,
      WitClient = new Wit({
        accessToken: process.env.WIT_AI_TOKEN,
        logger: new log.Logger(log.DEBUG)
      }),
      DEFAULT_CONFIG = {
        pull_request: {
          merge_on_hold_text: {
            tag: 'in progress',
            open_marker: '[',
            close_marker: ']'
          },
          merge_on_hold_label: [
            {name: 'no merge :no_entry_sign:', color: 'FFFCBA'},
            {name: 'in progress :hourglass_flowing_sand:', color: '00BF30'},
            {name: ':construction: work in progress :construction:', color: '333333'}
          ]
        },
        issue: {
          lock_interval: 30,
          archive: {
            label: {name: 'archived :file_folder:', color: 'FF7878'},
            interval: 30
          }
        }
      }

var DB = null
let dburi = `mongodb+srv://${DBUSER}:${DBPASS}@${DBURL}/${DBNAME}?retryWrites=true`
MongoClient.connect(dburi, {useNewUrlParser: true}, function(err, client) {
  DB = client.db(DBNAME)
})


module.exports = app => {

  createScheduler(app, {interval: SCHEDULER_INTERVAL * 60 * 1000})

  app.on('schedule.repository', context => {  
    const {owner, repo} = context.repo()
    DB.collection(DBCOLLECTION).find({user: owner}, {projection: {_id: 0}}).toArray(function(err, docs) {
      if(!err && docs.length && docs[0].repos.includes(repo)) {
        context.config(CONFIGURATION_FILE).then(config => {
          let lock_interval = DEFAULT_CONFIG.issue.lock_interval,
              archive_interval = DEFAULT_CONFIG.issue.archive.interval,
              archive_label = DEFAULT_CONFIG.issue.archive.label.name,
              enable_locking = false,
              enable_archiving = false
          if (!config) {
            config = DEFAULT_CONFIG
          } else {
            enable_locking = ('issue' in config && 'lock_interval' in config.issue && Number.isInteger(config.issue.lock_interval) && config.issue.lock_interval > 0)
            enable_archiving = ('issue' in config && 'archive' in config.issue && 'interval' in config.issue.archive && Number.isInteger(config.issue.archive.interval) && config.issue.archive.interval > 0)
          }
          if ('issue' in config && 'lock_interval' in config.issue && Number.isInteger(config.issue.lock_interval) && config.issue.lock_interval > 0) {
            lock_interval = config.issue.lock_interval
          }
          if ('issue' in config && 'archive' in config.issue && 'interval' in config.issue.archive && Number.isInteger(config.issue.archive.interval) && config.issue.archive.interval > 0) {
            archive_interval = config.issue.archive.interval
          }

          context.github.paginate(
            context.github.issues.getForRepo(context.repo({
              state: 'all', sort: 'updated', per_page: 100
            })),
            ({data: issues}) => {
              issues.forEach(issue => {
                if (enable_archiving && issue.state != 'closed' && !issue.locked && ((Date.parse(new Date()) - Date.parse(issue.updated_at)) / (60 * 1000) >= (archive_interval * 24 * 60))) {
                  context.github.issues.addLabels(context.repo({
                    number: issue.number,
                    labels: [archive_label]
                  }))
                }
                if (enable_locking && issue.state === 'closed' && !issue.locked && ((Date.parse(new Date()) - Date.parse(issue.updated_at)) / (60 * 1000) >= (lock_interval * 24 * 60))) {
                  context.github.request(Object.assign({
                      method: 'PUT',
                      url: `${GITHUB_API_URL}/repos/${owner}/${repo}/issues/${issue.number}/lock`,
                      lock_reason: 'resolved'  // off-topic, too heated, resolved, spam
                    }, {
                      headers: { accept: 'application/vnd.github.sailor-v-preview+json' }
                    })
                  )
                  return
                }
                context.github.issues.getComments(context.repo({ number: issue.number, per_page: 100 })).then(({data: comments}) => {
                  comments.map(comment => {
                    if (comment.user.type === 'Bot' && comment.user.login === BOT_NAME && comment.body.search(/<!-- reminder -->/i) === 0) {
                      let comment_id = comment.id,
                          who = comment.body.match(/<!-- who=(.*) -->/)[1],
                          what = comment.body.match(/<!-- what=(.*) -->/)[1],
                          when = comment.body.match(/<!-- when=(.*) -->/)[1]
                      if (Date.parse(new Date()) >= Date.parse(when)) {
                        context.github.issues.deleteComment(context.repo({ comment_id })).then(_ => {
                          let body = `:wave: Hi ${who ? (who.endsWith('|??') ? `<a href='#' title='??'><span>${who}</span></a>` : who) : ''},`
                          body += ' I\'ve been asked to :alarm_clock: remind you'
                          body += `${what ? (what.endsWith('|??') ? ' :point_right: <a href="#" title="??"><span>**`' + what.replace('|??', '') + '`**</span></a>.' : ' :point_right: **`' + what + '`**.') : '.'}`
                          context.github.issues.createComment(context.repo({
                            number: issue.number,
                            body
                          }))
                        })
                      }
                    }
                  })
                })
              })
            }
          )
        })
      }
    })
  })

  app.on(['installation.created', 'installation_repositories.added'], context => {
    let repos = context.event === 'installation' ? context.payload.repositories : context.payload.repositories_added,
        owner = context.payload.installation.account.login
    repos.map(repo => {
      context.repo = (obj) => (Object.assign({owner, repo}, obj))
      let create_labels = DEFAULT_CONFIG.pull_request.merge_on_hold_label
      create_labels.push(DEFAULT_CONFIG.issue.archive.label)
      create_labels.map(label => {
        context.github.issues.createLabel({owner, repo: repo.name, name: label.name, color: label.color})
      })
    })
    let repo_names = repos.map(repo => repo.name)
    if (context.event === 'installation') {
      DB.collection(DBCOLLECTION).insertOne({user: owner, repos: repos.length ? repo_names : []}, (err, result) => {})
    } else {
      DB.collection(DBCOLLECTION).find({user: owner}, {projection: {_id: 0}}).toArray(function(err, docs) {
        if(docs.length) {
          let existing_repos = docs[0].repos,
              new_repos = repo_names.filter(repo => !existing_repos.includes(repo)).concat(existing_repos)
          DB.collection(DBCOLLECTION).updateOne({user: owner}, {$set: {repos: new_repos}}, (err, result) => {})
        }
      })      
    }
  })
  
  app.on(['installation.deleted', 'installation_repositories.removed'], context => {
    let owner = context.payload.installation.account.login
    if (context.event === 'installation') {
      DB.collection(DBCOLLECTION).deleteOne({user: owner}, (err, result) => {})
    } else {
      let removed_repos = context.payload.repositories_removed.map(repo => repo.name)
      DB.collection(DBCOLLECTION).find({user: owner}, {projection: {_id: 0}}).toArray(function(err, docs) {
        if(docs.length) {
          let existing_repos = docs[0].repos,
              new_repos = existing_repos.filter(repo => !removed_repos.includes(repo))
          DB.collection(DBCOLLECTION).updateOne({user: owner}, {$set: {repos: new_repos}}, (err, result) => {})
        }
      })
    }
  })

  app.on(['check_suite', 'check_run'], context => {
    if (['requested', 'rerequested'].includes(context.payload.action)) {
      let check = ('check_suite' in context.payload) ? context.payload.check_suite : context.payload.check_run,
          sha = check.head_sha
      createCheckRun(context, check, sha)
    }
  })

  app.on('pull_request.opened', context => {
    // GET /repos/:owner/:repo/commits/:ref/check-suites
    context.github.checks.listSuitesForRef(context.repo({ ref: context.payload.pull_request.head.ref })).then(({data: suites}) => {
      let check = suites.check_suites[0],
          sha = check.head_sha
      createCheckRun(context, check, sha)
    })
  })

  app.on(['pull_request.opened', 'pull_request.synchronize'], context => {
    // GET /repos/:owner/:repo/pulls/:number/files
    context.github.pullRequests.getFiles(context.issue()).then(({data: files}) => {
      let extensions = {},
          extension_array = [],
          extension_table = []
      files.map(file => ({ext: (file.filename.split('.').length > 1 ? file.filename.split('.').pop() : 'unknown'), add: file.additions, remove: file.deletions, changes: file.changes})).map(obj => (obj.ext in extensions) ? Object.entries(extensions[obj.ext]).forEach(([k, v]) => extensions[obj.ext][k] += obj[k]) : extensions[obj.ext] = {add: obj.add, remove: obj.remove, changes: obj.changes})
      Object.entries(extensions).forEach(([k, v]) => extension_array.push(`${k},${v.changes}`))
      Object.entries(extensions).forEach(([k, v]) => extension_table.push(`${k} | ${v.add} | ${v.remove} | ${v.changes}`))

      if (extension_array.length != 0) {
        let image = util.createChart(`language,changes\n${extension_array.join('\n')}`)

        axios.post(IMGUR_UPLOAD_API, { image }, {
          headers: {
            'Authorization': `Client-ID ${process.env.IMGUR_CLIENT_ID}`
          }
        }).then(response => {
          let { data, status, statusText } = response,
              {data: {link: imgur_link, deletehash}} = data
          context.github.issues.getComments(context.issue()).then(({data: comments}) => {
            let bot_comments = [],
                comment_body = `<!-- ${deletehash} -->
### Table of LOC per Language
Language | :hash: of Additions | :hash: of Deletions | :hash: of Changes
------------ | ------------- | ------------ | -------------
${extension_table.join('\n')}

### Pie-chart of :hash:Changes :vs: Languages
![#Changes vs. Languages](${imgur_link})`
            comments.map(comment => {
              if (comment.user.type === 'Bot' && comment.user.login === BOT_NAME) {
                bot_comments.push({id: comment.id, creation_date: comment.created_at, body: comment.body})
              }
            })
            bot_comments.sort((a, b) => Date.parse(a.creation_date) > Date.parse(b.creation_date))
            if (bot_comments.length) {
              context.github.issues.editComment(context.repo({ comment_id: bot_comments[0].id, body: comment_body })).then(_ => {
                axios.delete(`${IMGUR_UPLOAD_API}/${bot_comments[0].body.match(/<!-- (.*) -->/)[1]}`, {
                  headers: {
                    'Authorization': `Client-ID ${process.env.IMGUR_CLIENT_ID}`
                  }
                })
              })
            } else {
              context.github.issues.createComment(context.issue({ body: comment_body }))
            }
          })
        })
      }
    })
  })

  app.on(['pull_request.opened', 'pull_request.reopened', 'pull_request.edited', 'pull_request.synchronize', 'pull_request.labeled', 'pull_request.unlabeled'], context => {
    let {owner, repo} = context.repo(),
        branch = context.payload.repository.default_branch
    context.config(CONFIGURATION_FILE).then(config => {
      if (!config) {
        config = DEFAULT_CONFIG
      }
      context.github.pullRequests.getCommits(context.issue({per_page: 100})).then(({data: commits}) => {
        let commit = commits.map(commit => ({author: commit.commit.author.name, message: commit.commit.message})).reverse()
        context.github.issues.getIssueLabels(context.issue()).then(({data: labels}) => {
          let label = labels.map(label => ({id: label.id, name: label.name}))
          context.github.repos.getCombinedStatusForRef(context.repo({ ref: context.payload.pull_request.head.sha })).then(({data: {state, statuses}}) => {
            let contextual_state = null
            statuses.map(status => {
              contextual_state = status.context === 'Notice' ? status.state : contextual_state
            })
            let check_labels = DEFAULT_CONFIG.pull_request.merge_on_hold_label,
                check_tag = DEFAULT_CONFIG.pull_request.merge_on_hold_text.open_marker + DEFAULT_CONFIG.pull_request.merge_on_hold_text.tag + DEFAULT_CONFIG.pull_request.merge_on_hold_text.close_marker

            if ('pull_request' in config && 'merge_on_hold_label' in config.pull_request && Array.isArray(config.pull_request.merge_on_hold_label)) {
              check_labels = config.pull_request.merge_on_hold_label
            }
            if ('pull_request' in config && 'merge_on_hold_text' in config.pull_request) {
              let tag_obj = config.pull_request.merge_on_hold_text,
                  def_tag_obj = DEFAULT_CONFIG.pull_request.merge_on_hold_text
              check_tag = `${'open_marker' in tag_obj ? tag_obj.open_marker : def_tag_obj.open_marker}${'tag' in tag_obj ? tag_obj.tag : def_tag_obj.tag}${'close_marker' in tag_obj ? tag_obj.close_marker : def_tag_obj.close_marker}`
            }

            let label_on_hold_status = label.some(l => check_labels.some(c => c.toUpperCase() === l.name.toUpperCase())),
                text_on_hold_status = [commit[0].message, context.payload.pull_request.body, context.payload.pull_request.title].some(l => l.toUpperCase().includes(check_tag.toUpperCase()))

            if (label_on_hold_status || text_on_hold_status) {
              if (contextual_state !== 'pending') {
                context.github.repos.createStatus(context.repo({
                  sha: context.payload.pull_request.head.sha,
                  state: 'pending',  // error, failure, pending, success
                  target_url: `https://github.com/${owner}/${repo}/blob/${branch}/.github/${CONFIGURATION_FILE}`,
                  description: 'Work in Progress. Don\'t merge',
                  context: 'Notice'
                }))
              }
            } else {
              if (contextual_state !== 'success') {
                context.github.repos.createStatus(context.repo({
                  sha: context.payload.pull_request.head.sha,
                  state: 'success',
                  target_url: `https://github.com/${owner}/${repo}/blob/${branch}/.github/${CONFIGURATION_FILE}`,
                  description: 'Can be merged',
                  context: 'Notice'
                }))
              }
            }
          })
        })
      })
    })
  })

  app.on(['issue_comment.created', 'issue_comment.edited'], context => {
    if (context.payload.comment.user.type === 'User') {
      let command = context.payload.comment.body.match(/(\/remind [^\.,\?!;\n]*).*$/m)
      if (command) {
        WitClient.message(command[1]).then(data => {
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
          if (intent && intent.value === 'reminder') {
            let who = user ? ( user.value.toLocaleLowerCase() === 'me' ? `@${context.payload.comment.user.login}` : user.value ) : '',
                what = action ? action.value : '',
                when = date ? ('from' in date ? date.from.value : date.value) : ''
            context.github.issues.createComment(context.issue({
              body: `<!-- reminder -->
<!-- who=${who}${user && user.suggested ? '|??' : ''} -->
<!-- what=${what}${action && action.suggested ? '|??' : ''} -->
<!-- when=${when} -->
Sure @${context.payload.comment.user.login}, I've set a reminder.`
            }))
          }
        }).catch(console.error)
      }
    }
  })
}