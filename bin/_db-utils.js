'use strict'

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

module.exports = {
  setDbParams:      setDbParams,
  logData:          logData,
  logErrorAndExit:  logErrorAndExit,
}
