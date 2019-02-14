const implementedHtmlTags = ['iframe'];

const containsImplementedHtmlTags = string => implementedHtmlTags.some(str => string.includes(str));

const defaultTagValues = {
  src: {
    value: ''
  },
  width: {
    value: 'auto'
  },
  height: {
    value: 'auto'
  }
};

export { containsImplementedHtmlTags, defaultTagValues };
