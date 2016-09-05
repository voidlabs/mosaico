'use strict'

// http://krasimirtsonev.com/blog/article/Nodejs-managing-child-processes-starting-stopping-exec-spawn
var exec          = require('child_process').exec
var path          = require('path')
var c             = require('chalk')
var inquirer      = require('inquirer')

var config        = require('../server/config')
var db            = config.dbConfigs
var tmpFolder, dumpFolder, dbFrom, dbTo

//----- SETUP

let selectDb = inquirer.prompt([
  {
    type:     'list',
    name:     'source',
    message:  `Choose ${c.green('source')} DB`,
    choices:  Object.keys(db).reverse(),
  },
  {
    type:     'list',
    name:     'destination',
    message:  `Choose ${c.magenta('destination')} DB`,
    choices:  Object.keys(db),
  },
])

Promise
.all([selectDb, config.setup])
.then( (results) => {
  let promptConf  = results[0]
  let conf        = results[1]
  tmpFolder       = conf.images.tmpDir
  dbFrom          = db[promptConf.source]
  dbTo            = db[promptConf.destination]
  dumpFolder      = `${tmpFolder}/${dbFrom.folder}`
  return inquirer.prompt({
    type:     'confirm',
    default:  false,
    name:     'continue',
    message:  `you are going to copy:
    ${c.green(promptConf.source)} => ${c.magenta(promptConf.destination)}`,
  }).then(onConfirmation)
})

//----- CLEAN OLD COPY

function onConfirmation(results) {
  if (results.continue === false) {
    console.log('operation aborted')
    return process.exit(0)
  }
  var RemoveOldCopyCmd = `rm -rf ${dumpFolder}`
  exec(RemoveOldCopyCmd, dumpDB)
}

//----- DUMP DB

function dumpDB(error, stdout, stderr) {
  if (error) return console.log(c.red('error in cleaning'))
  console.log(c.green('cleaning done'))
  let dumpCmd   = `mongodump ${setDbParams(dbFrom)} -o ${tmpFolder}`
  console.log(c.blue('dumping'), c.gray(dumpCmd))
  var dbDump    = exec(dumpCmd, replicateDB)
  dbDump.stderr.on('data', logData)
}

//----- REPLICATE DB

function replicateDB(error, stdout, stderr) {
  if (error !== null) return logErrorAndExit(error, 'error in dumping')
  console.log(c.green('dump done'))
  let replicateCmd  = `mongorestore --drop ${setDbParams(dbTo)} ${dumpFolder}`
  console.log(c.blue('copying'), c.gray(replicateCmd))
  let dbReplicate   = exec(replicateCmd, endProcess)
  dbReplicate.stderr.on('data', logData)
}

//----- END

function endProcess(error, stdout, stderr) {
  if (error !== null) return logErrorAndExit(error, 'error in replication')
  console.log(c.green('replication done!'))
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
