// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The offline tafsir books (assets/tafsir/<book>/<surah>.tafsir) ship as assets, not as JS modules,
// so tens of megabytes of text stay out of the JavaScript bundle.
config.resolver.assetExts.push('tafsir');

module.exports = config;
