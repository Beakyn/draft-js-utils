const implementedHtmlTags = ['iframe'];

const containsImplementedHtmlTags = string => implementedHtmlTags.some(str => string.includes(str));

module.exports = {
  containsImplementedHtmlTags
};
