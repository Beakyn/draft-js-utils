import { parse } from '@textlint/markdown-to-ast';
import { defaultTagValues, isIframeBlock, isImgBlock } from './html';

const defaultInlineStyles = {
  Strong: {
    type: 'BOLD',
    symbol: '__'
  },
  Emphasis: {
    type: 'ITALIC',
    symbol: '*'
  }
};

const defaultBlockStyles = {
  List: 'unordered-list-item',
  Header1: 'header-one',
  Header2: 'header-two',
  Header3: 'header-three',
  Header4: 'header-four',
  Header5: 'header-five',
  Header6: 'header-six',
  CodeBlock: 'code-block',
  BlockQuote: 'blockquote'
};

const getBlockStyleForMd = (node, blockStyles) => {
  const style = node.type;
  const ordered = node.ordered;
  const depth = node.depth;
  if (style === 'List' && ordered) {
    return 'ordered-list-item';
  } else if (style === 'Header') {
    return blockStyles[`${style}${depth}`];
  } else if (
    node.type === 'Paragraph' &&
    node.children &&
    node.children[0] &&
    node.children[0].type === 'Image'
  ) {
    return 'atomic';
  } else if (node.type === 'Paragraph' && node.raw && node.raw.match(/^\[\[\s\S+\s.*\S+\s\]\]/)) {
    return 'atomic';
  } else if (
    node.type === 'Html' &&
    node.raw &&
    (node.raw.match(/<iframe /) || node.raw.match(/<iframe>/)) &&
    node.raw.match(/<\/iframe>/)
  ) {
    return 'atomic';
  } else if (
    node.type === 'Html' &&
    node.raw &&
    (node.raw.match(/<img /) || node.raw.match(/<img>/))
  ) {
    return 'atomic';
  }
  return blockStyles[style];
};

const joinCodeBlocks = splitMd => {
  const opening = splitMd.indexOf('```');
  const closing = splitMd.indexOf('```', opening + 1);

  if (opening >= 0 && closing >= 0) {
    const codeBlock = splitMd.slice(opening, closing + 1);
    const codeBlockJoined = codeBlock.join('\n');
    const updatedSplitMarkdown = [
      ...splitMd.slice(0, opening),
      codeBlockJoined,
      ...splitMd.slice(closing + 1)
    ];

    return joinCodeBlocks(updatedSplitMarkdown);
  }

  return splitMd;
};

export const splitMdBlocks = md => {
  const splitMd = md.split('\n');

  // Process the split markdown include the
  // one syntax where there's an block level opening
  // and closing symbol with content in the middle.
  const splitMdWithCodeBlocks = joinCodeBlocks(splitMd);
  return splitMdWithCodeBlocks;
};

const handleHtmlIframe = (entityMap, entityRanges, attributes, child, text) => {
  const {
    src = defaultTagValues.src,
    width = defaultTagValues.width,
    height = defaultTagValues.height
  } = attributes;

  const entityKey = Object.keys(entityMap).length;
  // eslint-disable-next-line no-param-reassign
  entityMap[entityKey] = {
    type: 'EMBEDDED_LINK',
    mutability: 'MUTABLE',
    data: {
      src: src.value || child.url,
      width: width.value,
      height: height.value,
      metadata: {
        raw: child.raw
      }
    }
  };
  entityRanges.push({
    key: entityKey,
    length: 1,
    offset: text.length
  });
};

const handleHtmlImage = (entityMap, entityRanges, attributes, child, text) => {
  const {
    src = defaultTagValues.src,
    width = defaultTagValues.width,
    height = defaultTagValues.height,
    alt = defaultTagValues.alt
  } = attributes;

  const entityKey = Object.keys(entityMap).length;
  // eslint-disable-next-line no-param-reassign
  entityMap[entityKey] = {
    type: 'IMAGE',
    mutability: 'MUTABLE',
    data: {
      url: src.value || child.url,
      src: src.value || child.url,
      fileName: alt.value,
      width: width.value,
      height: height.value,
      metadata: {
        raw: child.raw
      }
    }
  };
  entityRanges.push({
    key: entityKey,
    length: 1,
    offset: text.length
  });
};

export const parseMdLine = (line, existingEntities, extraStyles = {}) => {
  const inlineStyles = { ...defaultInlineStyles, ...extraStyles.inlineStyles };
  const blockStyles = { ...defaultBlockStyles, ...extraStyles.blockStyles };

  const astString = parse(line);
  let text = '';
  const inlineStyleRanges = [];
  const entityRanges = [];
  const entityMap = existingEntities;

  const addInlineStyleRange = (offset, length, style) => {
    inlineStyleRanges.push({ offset, length, style });
  };

  const getRawLength = children =>
    children.reduce((prev, { value }) => prev + (value ? value.length : 0), 0);

  const addHtml = child => {
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(child.raw, 'text/html');

    let el = null;

    if (child.raw.includes('iframe')) {
      el = htmlDoc.getElementsByTagName('iframe')[0];
    } else if (child.raw.includes('img')) {
      el = htmlDoc.getElementsByTagName('img')[0];
    }

    const { attributes } = el;

    if (child.raw.includes('iframe')) {
      handleHtmlIframe(entityMap, entityRanges, attributes, child, text);
    } else if (child.raw.includes('img')) {
      handleHtmlImage(entityMap, entityRanges, attributes, child, text);
    }
  };

  const addLink = ({ url, children }) => {
    const entityKey = Object.keys(entityMap).length;
    entityMap[entityKey] = {
      type: 'LINK',
      mutability: 'MUTABLE',
      data: {
        url
      }
    };
    entityRanges.push({
      key: entityKey,
      length: getRawLength(children),
      offset: text.length
    });
  };

  const addImage = ({ url, alt }) => {
    const entityKey = Object.keys(entityMap).length;
    entityMap[entityKey] = {
      type: 'IMAGE',
      mutability: 'IMMUTABLE',
      data: {
        url,
        src: url,
        fileName: alt || ''
      }
    };
    entityRanges.push({
      key: entityKey,
      length: 1,
      offset: text.length
    });
  };

  const addVideo = ({ raw }) => {
    const string = raw;

    // RegEx: [[ embed url=<anything> ]]
    const url = string.match(/^\[\[\s(?:embed)\s(?:url=(\S+))\s\]\]/)[1];

    const entityKey = Object.keys(entityMap).length;
    entityMap[entityKey] = {
      type: 'draft-js-video-plugin-video',
      mutability: 'IMMUTABLE',
      data: {
        src: url
      }
    };
    entityRanges.push({
      key: entityKey,
      length: 1,
      offset: text.length
    });
  };

  const parseChildren = (child, style) => {
    // RegEx: [[ embed url=<anything> ]]
    const videoShortcodeRegEx = /^\[\[\s(?:embed)\s(?:url=(\S+))\s\]\]/;
    switch (child.type) {
      case 'Html':
        if (isIframeBlock(child.raw)) {
          addHtml(child);
        } else if (isImgBlock(child.raw)) {
          addHtml(child);
        }
        break;
      case 'Link':
        addLink(child);
        break;
      case 'Image':
        addImage(child);
        break;
      case 'Paragraph':
        if (videoShortcodeRegEx.test(child.raw)) {
          addVideo(child);
        }
        break;
      default:
    }

    if (!videoShortcodeRegEx.test(child.raw) && child.children && style) {
      const rawLength = getRawLength(child.children);
      addInlineStyleRange(text.length, rawLength, style.type);
      const newStyle = inlineStyles[child.type];
      child.children.forEach(grandChild => {
        parseChildren(grandChild, newStyle);
      });
    } else if (!videoShortcodeRegEx.test(child.raw) && child.children) {
      const newStyle = inlineStyles[child.type];
      child.children.forEach(grandChild => {
        parseChildren(grandChild, newStyle);
      });
    } else {
      if (style) {
        addInlineStyleRange(text.length, child.value.length, style.type);
      } else if (inlineStyles[child.type]) {
        addInlineStyleRange(text.length, child.value.length, inlineStyles[child.type].type);
      }
      text = `${text}${
        child.type === 'Image' || videoShortcodeRegEx.test(child.raw) ? ' ' : child.value
      }`;
    }
  };

  astString.children.forEach(child => {
    const style = inlineStyles[child.type];
    parseChildren(child, style);
  });

  // add block style if it exists
  let blockStyle = 'unstyled';
  if (astString.children[0]) {
    const style = getBlockStyleForMd(astString.children[0], blockStyles);
    if (style) {
      blockStyle = style;
    }
  }

  return {
    text,
    inlineStyleRanges,
    entityRanges,
    blockStyle,
    entityMap
  };
};
