'use strict'

// http://krasimirtsonev.com/blog/article/Nodejs-managing-child-processes-starting-stopping-exec-spawn
var exec          = require('child_process').exec
var path          = require('path')
var c             = require('chalk')
var inquirer      = require('inquirer')

var config        = require('../server/config')
var db            = config.dbConfigs
var tmpFolder, dumpFolder, dumpCmd, promptConf

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
  promptConf  = results[0]
  let conf    = results[1]
  return inquirer.prompt({
    type:     'confirm',
    default:  false,
    name:     'continue',
    message:  `you are going to copy:
    ${c.green(promptConf.source)} => ${c.magenta(promptConf.destination)}`,
    // choices:  Object.keys(db),
  }).then(onConfirmation)
})

function onConfirmation(results) {
  if (results.continue === false) {
    console.log('operation aborted')
    return process.exit(0)
  }
}

// config.setup.then(cleanTmpDir)

// // Remove old copy
// function cleanTmpDir(conf) {
//   // store some datas
//   tmpFolder   = conf.images.tmpDir
//   dumpFolder  = `${tmpFolder}/${dbFrom.folder}`
//   dumpCmd     = `mongodump --host ${dbFrom.host} -d ${dbFrom.folder} -u ${dbFrom.user} -p ${dbFrom.password} -o ${tmpFolder}`
//   // remove old folder
//   var rmCmd = `rm -rf ${dumpFolder}`
//   console.log(c.blue('cleaning tmp folder'), c.gray(rmCmd))
//   exec(rmCmd, dumpDB)
// }

// // Dump DB
// function dumpDB(error, stdout, stderr) {
//   if (error) return console.log(c.red('error in cleaning'))
//   console.log(c.green('cleaning done'))
//   console.log(c.blue('dumping'), c.gray(dumpCmd))
//   var dbDump = exec(dumpCmd, copyDB)
//   dbDump.stderr.on('data', console.log)
// }

// // Copy to stage DB
// function copyDB(error, stdout, stderr) {
//   if (error !== null) {
//     console.log(c.red('error in dumping'))
//     return console.log(error)
//   }
//   console.log(c.green('dump done'))
//   // NTH making a prod copy on a local db should be done with command arguments
//   // var copyCmd = `mongorestore --drop --host localhost:27017 --db bandsenderdump ${dumpFolder}`
//   var copyCmd = `mongorestore --drop --host ${dbTo.host} --db ${dbTo.folder} -u ${dbTo.user} -p ${dbTo.password} ${dumpFolder}`
//   console.log(c.blue('copying'), c.gray(copyCmd))
//   var dbCopy = exec(copyCmd, onCopy)
//   dbCopy.stderr.on('data', console.log)
// }

// // The end!
// function onCopy(error, stdout, stderr) {
//   console.log(c.green('copy done'))
//   if (error !== null) {
//     console.log(c.red('error in copying'))
//     return console.log(error)
//   }
// }
