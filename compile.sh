if [ -z "$1" ]; then
	echo "usage ./compile outputName"
	exit 1
fi
#./node_modules/inline-scripts/src/cli/inlineScriptTags.js "./${1}/index.html" "./Play/${1}.html"
echo "Compiling ${1}"
./compile.js "./${1}/index.html" "./${1}.html"

