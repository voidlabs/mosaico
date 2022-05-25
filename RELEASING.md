We used grunt-release in past, but it's obsolete and misbehaving.

So we now added release informations for release-it product to the package.json and expect the release to be manually done using release-it.

npm install -g release-it

release-it --dry-run

release-it