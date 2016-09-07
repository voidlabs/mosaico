'use strict'

var exec          = require('child_process').exec
var c             = require('chalk')
var moment        = require('moment')
var inquirer      = require('inquirer')

var config        = require('../server/config')
var db            = config.dbConfigs
var now           = moment().format('YYYY-MM-DD_HH:mm')
var u             = require('./_db-utils')
var tmpFolder, dbFrom, sourceName

let selectDb      = inquirer.prompt([
  {
    type:     'list',
    name:     'source',
    message:  `Choose a ${c.green('source')} DB to backup`,
    choices:  Object.keys(db),
  },
])

Promise
.all([selectDb, config.setup])
.then( (results) => {
  let promptConf  = results[0]
  let conf        = results[1]
  sourceName      = promptConf.source
  dbFrom          = db[sourceName]
  tmpFolder       = conf.images.tmpDir
  let dumpCmd   = `mongodump ${u.setDbParams(dbFrom)} -o ${tmpFolder}`
  console.log(c.blue('Backing up'), sourceName, c.gray(dumpCmd))
  exec(dumpCmd, onDbDump)
})
.catch(console.log)

function onDbDump(error, stdout, stderr) {
  if (error !== null) return u.logErrorAndExit(error, `error in dumping ${sourceName}`)
  let backupName  = `${tmpFolder}/backup-${sourceName}-${now}`
  exec(`mv ${tmpFolder}/${dbFrom.folder} ${backupName}`, () => {
    console.log(c.green('backing up done'), c.grey('to'), backupName)
    process.exit(0)
  })
}
