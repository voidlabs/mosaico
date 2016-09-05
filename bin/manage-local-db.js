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

var tmpFolder, dumpFolder, dumpCmd
var dbLocal       = {
  host:   'localhost:27017',
  folder: 'badsender',
}

var action        = inquirer.prompt({
  type:     'list',
  name:     'action',
  message:  `Choose an action:`,
  default:  1,
  choices:  [ 'save', 'restore', ],
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

function logData(data) {
  if (data) console.log(data)
}

////////
// SAVE
////////

function makeSnapshot() {
  console.log(c.green('Make a snapshot'))
  dumpCmd     = `mongodump --host ${dbLocal.host} -d ${dbLocal.folder} -o ${tmpFolder}`
  exec(`rm -rf ${dumpFolder}`, (error, stdout, stderr) => {
    var dbDump  = exec(dumpCmd, dumpdone)
    dbDump.stderr.on('data', logData)
  })
}

function dumpdone(error, stdout, stderr) {
  if (error !== null) {
    console.log(c.red('error in dumping'))
    return console.log(error)
    process.exit(1)
  }
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
  var copyCmd = `mongorestore --drop --host ${dbLocal.host} --db ${dbLocal.folder} ${dumpFolder}`
  console.log(c.blue('copying'), c.gray(copyCmd))
  var dbCopy = exec(copyCmd, onRestore)
  dbCopy.stderr.on('data', logData)
}

function onRestore(error, stdout, stderr) {
  if (error !== null) {
    console.log(c.red('error in restoring'))
    console.log(error)
    process.exit(1)
  }
  console.log(c.green('snapshot restored!'))
  process.exit(0)
}
