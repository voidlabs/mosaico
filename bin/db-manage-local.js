'use strict'

// a simple script to:
//    - save a local db snapshot
//    - restore it later
// can be usefull for tests

var exec          = require('child_process').exec
var path          = require('path')
var c             = require('chalk')
var inquirer      = require('inquirer')

var config        = require('../server/config')
var dbLocal       = config.dbConfigs.local
var tmpFolder, dumpFolder, dumpCmd

var action        = inquirer.prompt({
  type:     'list',
  name:     'action',
  message:  `Choose an action:`,
  default:  0,
  choices:  [ 'restore', 'save' ],
})

Promise
.all([action, config.setup])
.then( (results) => {
  let choosenAction   = results[0].action
  let conf            = results[1]
  tmpFolder           = conf.images.tmpDir
  dumpFolder          = `${tmpFolder}/local-db-snapshot`
  if (choosenAction === 'save') return makeSnapshot()
  return restoreSnapshot()
})

////////
// SAVE
////////

function makeSnapshot() {
  console.log(c.green('Make a snapshot'))
  dumpCmd     = `mongodump ${setDbParams(dbLocal)} -o ${tmpFolder}`
  exec(`rm -rf ${dumpFolder}`, (error, stdout, stderr) => {
    var dbDump  = exec(dumpCmd, dumpdone)
    dbDump.stderr.on('data', logData)
  })
}

function dumpdone(error, stdout, stderr) {
  if (error !== null) return logErrorAndExit(error, 'error in dumping')
  exec(`mv ${tmpFolder}/badsender ${dumpFolder}`, () => {
    console.log(c.green('dump done'))
    process.exit(0)
  })
}

////////
// RESTORE
////////

function restoreSnapshot() {
  console.log(c.green('Restore a snapshot'))
  var copyCmd = `mongorestore --drop ${setDbParams(dbLocal)} ${dumpFolder}`
  console.log(c.blue('copying'), c.gray(copyCmd))
  var dbCopy = exec(copyCmd, onRestore)
  dbCopy.stderr.on('data', logData)
}

function onRestore(error, stdout, stderr) {
  if (error !== null) return logErrorAndExit(error, 'error in restoring')
  console.log(c.green('snapshot restored!'))
  process.exit(0)
}

//////
// UTILS
//////

function setDbParams(dbParams) {
  let params  = `--host ${dbParams.host} --db ${dbParams.folder}`
  if (dbParams.user == null) return params
  params      = `${params} -u ${dbParams.user} -p ${dbParams.password}`
  return params
}

function logData(data) {
  if (data) console.log(data.replace(/\n$/, ''))
}

function logErrorAndExit(error, message) {
  console.log(c.red(message))
  console.log(error)
  return process.exit(1)
}
