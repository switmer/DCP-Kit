#!/bin/bash

# Exit on error
set -e

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

# Create release directory
RELEASE_DIR="release"
RELEASE_FILE="dcp-transformer-v${VERSION}.zip"

# Clean up any existing release
rm -rf $RELEASE_DIR
rm -f $RELEASE_FILE

# Create release directory
mkdir -p $RELEASE_DIR

# Copy files
echo "Copying files..."
for dir in bin commands core schemas scripts; do
  if [ -d "$dir" ]; then
    cp -r "$dir" "$RELEASE_DIR/"
  fi
done

for file in package.json README.md CHANGELOG.md LICENSE; do
  if [ -f "$file" ]; then
    cp "$file" "$RELEASE_DIR/"
  fi
done

# Create zip
echo "Creating release archive..."
cd $RELEASE_DIR
zip -r ../$RELEASE_FILE .
cd ..

# Clean up
rm -rf $RELEASE_DIR

echo "Release archive created: $RELEASE_FILE"
echo "Version: $VERSION" 