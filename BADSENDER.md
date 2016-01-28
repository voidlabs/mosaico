# Badsender email builder

## prerequisite

- **NodeJS** should be installed on your computer ([https://nodejs.org/](https://nodejs.org/) for more details)  
- **git** should be installed also



- clone/fork the project
- in your terminal, go in the folder


## project commands


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

### make a release

on your current branch

```
npm run release
```

The release will be pushed in the branch you have chosen (prod/preprod)

