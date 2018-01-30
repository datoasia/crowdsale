#!/bin/sh
set -e
./node_modules/.bin/json2ts -i ./cli.schema.json -o ./cli.schema.d.ts
sed -i 's/interface CliSchema/interface ICliConfig/g' ./cli.schema.d.ts

