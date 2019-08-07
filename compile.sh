if [ -z "$1" ]; then
	echo "usage ./compile outputName"
	exit 1
fi
./node_modules/inline-scripts/src/cli/inlineScriptTags.js "./${1}/index.html" "./Play/${1}.html"

