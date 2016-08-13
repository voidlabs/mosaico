# Badsender email builder

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Heroku server configuration](#heroku-server-configuration)
  - [configuring environments variables](#configuring-environments-variables)
  - [Mail sending](#mail-sending)
  - [from email adress](#from-email-adress)
  - [MongoDB database](#mongodb-database)
  - [Admin password](#admin-password)
  - [Hostname](#hostname)
  - [AWS S3](#aws-s3)
- [Dev prerequisite](#dev-prerequisite)
- [Updating the code](#updating-the-code)
  - [Build the project for *production*](#build-the-project-for-production)
  - [Start a server configured for *production*](#start-a-server-configured-for-production)
  - [Build and start a *production* server](#build-and-start-a-production-server)
  - [Build and start a *development* server](#build-and-start-a-development-server)
  - [Make a release](#make-a-release)
    - [syncing the *stage DB* with the *prod DB*](#syncing-the-stage-db-with-the-prod-db)
  - [Generating templates preview images](#generating-templates-preview-images)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Heroku server configuration

### configuring environments variables

- go in the settings of your application
- click on `settings`
- click on `Reveal Config Vars`
- variables name should follow this pattern :

```
badsender_emailOptions__from
```

- always put `badsender_` first
- then each level of config should be seperate with a double underscore: `__`
- see `.badsenderrc-example` on the master branch for the config requirements

below are the common environments variables you should want to set:


### Mail sending

```
badsender_emailTransport__service         Mailjet
badsender_emailTransport__auth__user      your Username (or API key)
badsender_emailTransport__auth__pass      your password (or Secret Key)
```


badsender_emailTransport__service is for [nodemailer-wellknown](https://www.npmjs.com/package/nodemailer-wellknown) configuration  


### from email adress


```
badsender_emailOptions__from              Badsender Builder <emailbuilder@badsender.com>
```

### MongoDB database

the path to your mongoDB instance

```
badsender_database                        mongodb://localhost/badsender
```

### Admin password

```
badsender_admin__password                 a password of your choice
```

### Hostname

The domain name of your app

```
badsender_host                            badsender-test.herokuapp.com
```

### AWS S3

Those are the keys you should set for aws

```
badsender_storage__type                   aws
badsender_storage__aws__accessKeyId       20 characters key
badsender_storage__aws__secretAccessKey   40 characters secret key
badsender_storage__aws__bucketName        your bucket name
badsender_storage__aws__region            region of your bucket (ex: ap-southeast-1)
```

###### getting AWS id

[console.aws.amazon.com/iam](https://console.aws.amazon.com/iam) -> **create new access key**

###### creating the bucket

[console.aws.amazon.com/s3](https://console.aws.amazon.com/s3) -> **create bucket**

you have also to set the good policy for the bucket:

**Properties** -> **Permissions** -> **Add bucket policy**

and copy and paste this:

```
{
	"Version": "2008-10-17",
	"Statement": [
		{
			"Sid": "AllowPublicRead",
			"Effect": "Allow",
			"Principal": {
				"AWS": "*"
			},
			"Action": "s3:GetObject",
			"Resource": "arn:aws:s3:::YOURBUCKETNAME/*"
		}
	]
}
```

then replace `YOURBUCKETNAME` by your real bucket name

## Dev prerequisite

- [NodeJS 5](https://nodejs.org/en/)
- [MongoDB](https://www.mongodb.com/)
- [Imagemagick](http://www.imagemagick.org/script/index.php)

You need to have:

- clone/fork the project
- in your terminal, go in the folder
- run `npm install` in the root folder


## Updating the code

Configuration can be made by creating a `.badsenderc` at the root of the project  
See `.badsenderrc-example` for config detail.

those are the main developper commands:

### Build the project for *production*

```
npm run build
```

### Start a server configured for *production* 

```
npm start
```

server will be running on `localhost:3000`

### Build and start a *production* server

```
npm run prod
```

### Build and start a *development* server

```
npm run dev
```

- server will be running on `localhost:7000`
- server will be restarted on files changes
- build will be updated on files changes also

### Make a release

on your current branch

```
npm run release
```

The release will be pushed in the branch you have chosen (dev/stage/prod)  
Automatic deploy is configured in heroku. So **pushing to dev or prod branch will automatically been deployed to heroku**


#### syncing the *stage DB* with the *prod DB*

```
npm run sync-stage-db
```

`.badsenderrc` should be provided with *stageDb* infos. See `.badsenderrc-example` for more informations

### Generating templates preview images

see README.md
