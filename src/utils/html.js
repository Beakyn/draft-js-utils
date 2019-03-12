const defaultTagValues = {
  src: {
    value: ''
  },
  width: {
    value: 'auto'
  },
  height: {
    value: 'auto'
  },
  alt: {
    value: ''
  },
  href: {
    value: ''
  }
};

const isImgBlock = rawText => rawText.match(/<img /) || rawText.match(/<img>/);

const isIframeBlock = rawText =>
  (rawText.match(/<iframe /) || rawText.match(/<iframe>/)) && rawText.match(/<\/iframe>/);

const isLinkBlock = rawText =>
  (rawText.match(/<a /) || rawText.match(/<a>/)) && rawText.match(/<\/a>/);

const isHtmlBlock = rawText =>
  isIframeBlock(rawText) || isImgBlock(rawText) || isLinkBlock(rawText);

export { defaultTagValues, isHtmlBlock, isIframeBlock, isImgBlock, isLinkBlock };
