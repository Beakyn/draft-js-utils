import { defaultTagValues } from './html';

const blockStyleDict = {
  'unordered-list-item': '- ',
  'header-one': '# ',
  'header-two': '## ',
  'header-three': '### ',
  'header-four': '#### ',
  'header-five': '##### ',
  'header-six': '###### ',
  blockquote: '> '
};

const wrappingBlockStyleDict = {
  'code-block': '```'
};

const unwrapAttributes = data => {
  const {
    src = defaultTagValues.src.value,
    width = defaultTagValues.width.value,
    height = defaultTagValues.height.value,
    alt = defaultTagValues.alt.value,
    href = defaultTagValues.href.value
  } = data;

  return { src, width, height, alt, href };
};

const generateAtomicStyle = {
  iframe: (blockText, data, strippedContent) => {
    const { src, width, height } = unwrapAttributes(data);
    return blockText === ' '
      ? `${strippedContent}${
          data.metadata
            ? data.metadata.raw
            : `<iframe src="${src}" width="${width}" height="${height}></iframe>"`
        }`
      : `${strippedContent}${blockText}`;
  },
  img: (blockText, data, strippedContent) => {
    const { src, width, height } = unwrapAttributes(data);
    return blockText === ' '
      ? `${strippedContent}${
          data.metadata
            ? data.metadata.raw
            : `<img src="${src}" width="${width}" height="${height}">`
        }`
      : `${strippedContent}${blockText}`;
  },
  link: (blockText, data, strippedContent) => {
    const { href } = unwrapAttributes(data);
    return blockText === ' '
      ? `${strippedContent}${
          data.metadata
            ? data.metadata.raw
            : `<a target="_blank" rel=“noopener noreferrer nofollow” href="${href}"></a>`
        }`
      : `${strippedContent}${blockText}`;
  }
};

export const defaultMarkdownDict = {
  BOLD: '__',
  ITALIC: '*'
};

export const getBlockStyle = (currentStyle, appliedBlockStyles) => {
  if (currentStyle === 'ordered-list-item') {
    const counter = appliedBlockStyles.reduce((prev, style) => {
      if (style === 'ordered-list-item') {
        return prev + 1;
      }
      return prev;
    }, 1);
    return `${counter}. `;
  }
  return blockStyleDict[currentStyle] || '';
};

export const applyWrappingBlockStyle = (currentStyle, content) => {
  if (currentStyle in wrappingBlockStyleDict) {
    const wrappingSymbol = wrappingBlockStyleDict[currentStyle];
    return `${wrappingSymbol}\n${content}\n${wrappingSymbol}`;
  }

  return content;
};

export const applyAtomicStyle = (block, entityMap, content) => {
  if (block.type !== 'atomic') return content;
  // strip the test that was added in the media block
  const strippedContent = content.substring(0, content.length - block.text.length);
  const key = block.entityRanges[0].key;
  const type = entityMap[key].type;
  const data = entityMap[key].data;
  if (type === 'EMBEDDED_LINK') {
    return generateAtomicStyle.iframe(block.text, data, strippedContent);
  } else if (type === 'IMAGE') {
    return generateAtomicStyle.img(block.text, data, strippedContent);
  } else if (type === 'LINK') {
    return generateAtomicStyle.link(block.text, data, strippedContent);
  } else if (type === 'draft-js-video-plugin-video') {
    return `${strippedContent}[[ embed url=${data.url || data.src} ]]`;
  }
  return `${strippedContent}<img alt="${data.fileName || ''}" src="${data.url || data.src}" />`;
};

export const getEntityStart = ({ type, data }) => {
  switch (type) {
    case 'LINK':
      return `<a target="_blank" rel=“noopener noreferrer nofollow” href="${data.url}">`;
    default:
      return '';
  }
};

export const getEntityEnd = ({ type }) => {
  switch (type) {
    case 'LINK':
      return `</a>`;
    default:
      return '';
  }
};

export const fixWhitespacesInsideStyle = (text, style) => {
  const { symbol } = style;

  // Text before style-opening marker (including the marker)
  const pre = text.slice(0, style.range.start);
  // Text between opening and closing markers
  const body = text.slice(style.range.start, style.range.end);
  // Trimmed text between markers
  const bodyTrimmed = body.trim();
  // Text after closing marker
  const post = text.slice(style.range.end);

  const bodyTrimmedStart = style.range.start + body.indexOf(bodyTrimmed);

  // Text between opening marker and trimmed content (leading spaces)
  const prefix = text.slice(style.range.start, bodyTrimmedStart);
  // Text between the end of trimmed content and closing marker (trailing spaces)
  const postfix = text.slice(bodyTrimmedStart + bodyTrimmed.length, style.range.end);

  // Temporary text that contains trimmed content wrapped into original pre- and post-texts
  const newText = `${pre}${bodyTrimmed}${post}`;
  // Insert leading and trailing spaces between pre-/post- contents and their respective markers
  return newText.replace(
    `${symbol}${bodyTrimmed}${symbol}`,
    `${prefix}${symbol}${bodyTrimmed}${symbol}${postfix}`
  );
};

export const getInlineStyleRangesByLength = inlineStyleRanges =>
  [...inlineStyleRanges].sort((a, b) => b.length - a.length);
