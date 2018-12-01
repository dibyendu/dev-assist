<h1 align="center">Dev Assist</h1>

<p align=center><a href="https://github.com/apps/dev-assist"><img src="https://i.imgur.com/N4TUCqW.png" alt="" width="120" height="120"></a></p>

[![Uptime Robot status](https://img.shields.io/uptimerobot/status/m780847983-0e96e67b7400a9231f8ae76c.svg?style=popout)](https://stats.uptimerobot.com/6927jsRGg)
[![Greenkeeper badge](https://badges.greenkeeper.io/dibyendu/dev-assist.svg)](https://greenkeeper.io)
[![Pay with Beerpay](https://beerpay.io/dibyendu/dev-assist/badge.svg?style=beer)](https://beerpay.io/dibyendu/dev-assist)
[![Wish with Beerpay](https://beerpay.io/dibyendu/dev-assist/make-wish.svg?style=flat)](https://beerpay.io/dibyendu/dev-assist?focus=wish)

> A GitHub App built with [Probot](https://github.com/probot/probot) that does a lot of usefull things.

## Usage

1. Install the App for your GitHub repositories: [Dev Assist](https://github.com/apps/dev-assist)
2. Create [`.github/dev-assist.yml`](dev-assist.yml) based on the following template.

A `.github/dev-assist.yml` file is required in the _default branch_ (usually `master`) of your repository to customize the app for your requirements. If you don't provide the file, the app will use the following default values:

```yml
pull_request:
  # tag to look for in Pull Request(PR) Title, in PR Body or in the most recent commit message
  # tag is to be wrapped inside open_marker and close_marker
  # if [in progress] is found (case insensitively) in any of the above positions, merging is put on hold
  # alternatively, any  of these labels: ['no merge', 'in progress', 'work in progress'], can also be used to put merging on hold
  merge_on_hold_text:
    tag: "in progress"
    open_marker: "["
    close_marker: "]"
issue:
  # omit this field to disable the locking of closed issues and PRs.
  # lock closed issues and PRs as resolved after this many days.
  lock_interval: 30
  # omit the entire section to disable the archiving of stale issues and PRs.
  # archive old (older than <interval> number of days) open issues and PRs
  # by putting a label (named 'archived')
  archive:
    interval: 30  # Alternatively, just omit this field to disable the archiving
```

## Features

This app does a lot of things to help you in the development process.

  * ### Lint

Its primary task is **Linting** your code for all the pull requests created in the repository. It automatically scans newly committed files in the pull requests to find out _lint errors_ in them and update the status of the commit accordingly.

![](https://i.imgur.com/Ux3R9R8.png)

It comes with support for 3 languages to find out lint errors.

##### CSS <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://sass-lang.com"><img src="https://i.imgur.com/tDvNUYr.png" alt="" width="30" height="30"></a>&nbsp;&nbsp;&nbsp;&nbsp;<a href="http://lesscss.org"><img src="https://i.imgur.com/64LsC14.png" alt="" width="60" height="30"></a>&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://github.com/postcss/sugarss"><img src="https://i.imgur.com/f5TR9TR.png" alt="" width="30" height="30"></a></span>

We use [`stylelint`](https://stylelint.io), that supports `SCSS`, `Sass`, `Less`, `SugarSS` and native `CSS`.

##### Javascript <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://nodejs.org"><img src="https://i.imgur.com/5pgTiKB.png" alt="" width="30" height="30"></a>&nbsp;&nbsp;&nbsp;&nbsp;<a href="http://es6-features.org"><img src="https://i.imgur.com/SXbgR8C.png" alt="" width="30" height="30"></a></span>

We use [`ESLint`](https://eslint.org), that supports `Js` with `ES6` and the new `Jsx` formats.

##### Go <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://golang.org"><img src="https://i.imgur.com/1zA8Ey5.png" alt="" width="30" height="30"></a></span>

We use [`golint`](https://github.com/golang/lint), that official lint checker for `golang`.

![](https://i.imgur.com/gPlDJ47.png)

  * ### Code Splitting

Apart from linting the code, it also analyses the pull request to find out the languages used in the PR and makes a helpful pie-chart out of it.

![](https://i.imgur.com/P5K3JqY.png)

  * ### Reminder

It also parses comments from issues and pull requests for commands. Currently it supports only the `/reminder` command. It automatically reminds you (or some other user) of the task on the mentioned date/time.

![](https://i.imgur.com/wJTd8Ls.png)

![](https://i.imgur.com/5VDhFVn.png)

This app periodically checks for updats on **every 15 minutes**. So, there might be a delay of atmost 15 minutes for the reminder to come.

  * ### Work in progress

If someone is regularly making changes to some pull request, that person can let the reviewers know that the pull request is not ready for review (or merging) by using a simple tag: `[in progress]` (can be changed from the [`.github/dev-assist.yml`](dev-assist.yml) configuration file). It sets the status of the pull request to `pending` if it finds `[in progress]` or whichever tag is set in [`.github/dev-assist.yml`](dev-assist.yml) (not case-sensitive) in:
1. The pull request title
2. The pull request body
3. Most recent commit messages of the pull request

Alternatively, adding any one of these labels to the pull request will also set the pull request status as `pending`:

1. no merge :no_entry_sign:
2. in progress :hourglass_flowing_sand:
3. :construction: work in progress :construction:

All these labels are created automatically at the time of installing the app.

If it doesn’t find the tag(s)/label(s) anywhere, it will set status to `success`.

![](https://i.imgur.com/Vmn6dpG.gif)

  * ### Locking of closed issues and pull requests

This app locks closed issues and pull requests as `resolved` after **30 days** (this default value can be changed from the `issue.lock_interval` field in [`.github/dev-assist.yml`](dev-assist.yml) configuration file).

If the file exists and the `lock_interval` field is omitted in the file, this feature will be disabled.

  * ### Archiving of inactive issues and pull requests

Last but not the least, it archives old inactive issues and pull requests by automatically setting a label: **archived :file_folder:**, after **30 days** of inactivity (again this default value can be changed from the `issue.archive.interval` field in [`.github/dev-assist.yml`](dev-assist.yml) file).

If the file exists and the `archive.interval` (or only the `interval` field) is omitted in the file, this feature will be disabled.

## License

[MIT](LICENSE) Copyright © 2018-2019 Dibyendu Das

## Credits

The logo was created by [Freepik](https://www.freepik.com/free-photos-vectors/design)
