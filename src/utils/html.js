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

const isImgBlock = rawText => rawText.match(/<img /) || rawText.match(/<img>/);

const isIframeBlock = rawText =>
  (rawText.match(/<iframe /) || rawText.match(/<iframe>/)) && rawText.match(/<\/iframe>/);

const isHtmlBlock = rawText => isIframeBlock(rawText) || isImgBlock(rawText);

export { defaultTagValues, isHtmlBlock, isIframeBlock, isImgBlock };
