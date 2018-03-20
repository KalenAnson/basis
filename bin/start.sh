#!/bin/bash

# Basis launch script.
#
# ATTENTION: Use dev_start.sh script while developing

if [[ ! -d "$PWD/node_modules" ]]; then
  echo "Please run the shell script from project's root folder"
  exit 1
fi

# Disable the runtime.json thing of config.js.
# It's annoying and sometimes breaks clustering.
export NODE_CONFIG_DISABLE_FILE_WATCH="Y"

project=$PWD

if [[ ! $launch ]]; then
  export launch="$project/main.js"
fi

if [[ ! -f "$launch" ]]; then
  echo "Launch script: '$launch' could not be located. Aborting..."
  exit 1
fi

if [[ ! $NODE_ENV ]]; then
  export NODE_ENV=production
fi

if [[ ! $NODE_CLUSTERED ]]; then
  export NODE_CLUSTERED=1
fi

if [[ ! $NODE_SERVE_STATIC ]]; then
  export NODE_SERVE_STATIC=1
fi

if [[ ! $NODE_HOT_RELOAD ]]; then
  export NODE_HOT_RELOAD=0
fi

if [[ !  $NODE_CONFIG_DIR ]]; then
  export NODE_CONFIG_DIR="$project/config"
fi
if [[ ! -d "$NODE_CONFIG_DIR" ]]; then
  mkdir $NODE_CONFIG_DIR
fi

if [[ ! $NODE_LOG_DIR ]]; then
  export NODE_LOG_DIR="$project/log"
fi
if [[ ! -d "$NODE_LOG_DIR" ]]; then
  mkdir $NODE_LOG_DIR
fi

if [[ $NODE_ENV == 'development' ]]; then

  # Check for nodemon, if it does not exist prompt the user to install
  if [[ ! `which nodemon` ]]; then
    echo "ERROR: unable to find 'nodemon'.";
    echo "Install with 'npm install nodemon -g' and then rerun this script"
	exit 1
  fi
  nodemon -e js,handlebars ${launch} --ignore 'public/*'
else
  exec -a "basis" node ${launch}
fi
