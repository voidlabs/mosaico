'use strict'

// a simple script to:
//    - save a local db snapshot
//    - restore it later
// can be usefull for tests

var exec          = require('child_process').exec
var path          = require('path')
var c             = require('chalk')
var args          = require('yargs').argv

var config        = require('../server/config')

var isSaving      = args.save === true
var isRestoring   = args.restore === true
var tmpFolder, dumpFolder, dumpCmd
var dbLocal       = {
  host:   'localhost:27017',
  folder: 'badsender',
}

if (!isSaving && !isRestoring) {
  console.log(c.green('short notice:'))
  console.log('save:    npm run local-db -- --save')
  console.log('restore: npm run local-db -- --restore')
  return
}

config.setup.then( (conf) => {
  // store some datas
  tmpFolder   = conf.images.tmpDir
  dumpFolder  = `${tmpFolder}/local-db-snapshot`

  if (isSaving) return makeSnapshot()
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
  }
  exec(`mv ${tmpFolder}/badsender ${dumpFolder}`, () => {
    console.log(c.green('dump done'))
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
    return console.log(error)
  }
  console.log(c.green('snapshot restored!'))
}
