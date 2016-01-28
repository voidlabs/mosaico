# Badsender email builder

## prerequisite

- **git** should be installed also
- **heroku toolbelt** ([https://toolbelt.heroku.com/](https://toolbelt.heroku.com/))

You need to have:

- clone/fork the project
- in your terminal, go in the folder


## Configuring Heroku

### initializing heroku git

Have to be done only one time.  
*heroku-name* should be replace with your app name (configured in **https://dashboard.heroku.com/apps** -> **+** -> **create new app**)

```
heroku git:remote -a *heroku-name*
```

### pushing a release

you should push the relase branch (prod/preprod) on heroku master.

for example push the prod branch is:

**being on the prod branch and make sure it's up-to-date**

```
git checkout prod && git fetch origin prod && git reset --hard FETCH_HEAD && git clean -df
```

then

```
git push heroku prod:master -f
```

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


#### Mail sending

So for a secure email transport using your own SMTP server you should set:

```
badsender_emailTransport__host         your SMTP server host adress
badsender_emailTransport__port         465
badsender_emailTransport__secure       true
badsender_emailTransport__auth__user   your Username (or API key)
badsender_emailTransport__auth__pass   your password (or Secret Key)
```

documentation can be find here: [https://nodemailer.com/2-0-0-beta/setup-smtp/](https://nodemailer.com/2-0-0-beta/setup-smtp/)


#### Setting the *“from”* email adress


```
badsender_emailOptions__from           Badsender Builder <emailbuilder@badsender.com>			
```

#### AWS S3

Those are the keys you should set for aws

```
badsender_storage__type                  aws
badsender_storage__aws__accessKeyId      20 characters key
badsender_storage__aws__secretAccessKey  40 characters secret key
badsender_storage__aws__bucketName       your bucket name
badsender_storage__aws__region           region of your bucket (ex: ap-southeast-1)
```

###### getting AWS id

[https://console.aws.amazon.com/iam](https://console.aws.amazon.com/iam) -> **create new access key**

###### creating the bucket

[https://console.aws.amazon.com/s3](https://console.aws.amazon.com/s3) -> **create bucket**

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


## Updating the code

If you want to run badsender on your computer, **NodeJS** should be installed on your computer ([https://nodejs.org/](https://nodejs.org/) for more details)  

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

### Build & start a *production* server

```
npm run prod
```

### Build & start a *development* server

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

The release will be pushed in the branch you have chosen (prod/preprod)
