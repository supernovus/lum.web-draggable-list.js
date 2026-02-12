"use strict";

const docRules = require('@lumjs/build/jsdoc-rules');
const ourRules = docRules.rootReadme.singleFile.clone(); 

module.exports = ourRules;