'use strict'

var exec          = require('child_process').exec
var c             = require('chalk')
var moment        = require('moment')

var config        = require('../server/config')
var dbProd        = config.dbConfigs.production
var now           = moment().format('YYYY-MM-DD_HH:mm')
var backupName    = `badsender-backup-${now}`
var tmpFolder

config.setup.then((conf) => {
  tmpFolder   = conf.images.tmpDir
  var dumpCmd = `mongodump --host ${dbProd.host} -d ${dbProd.folder} -u ${dbProd.user} -p ${dbProd.password} -o ${tmpFolder}`
  console.log(c.blue('Backing up prodution'), c.gray(dumpCmd))
  exec(dumpCmd, onDbDump)
})

function onDbDump() {
  exec(`mv ${tmpFolder}/${dbProd.folder} ${tmpFolder}/${backupName}`, () => {
    console.log(c.green('backing up done'), c.grey('to'), `${tmpFolder}/${backupName}`)
    process.exit(0)
  })
}
